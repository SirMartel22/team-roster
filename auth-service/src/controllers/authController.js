const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../config/supabaseClient");
const { toUserDto } = require("../utils/userDto");
const { toSlug } = require("../utils/slug");
const { notify } = require("../services/notificationClient");

const normalizeEmail = (email) => email.trim().toLowerCase();
const isUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const passwordResetResponse = "If that account exists, a password reset link has been sent.";

const createAuthHandlers = ({
  supabaseClient = supabase,
  bcryptLib = bcrypt,
  jwtLib = jwt,
  cryptoLib = crypto,
  jwtSecret = process.env.JWT_SECRET,
  notificationClient = notify,
} = {}) => {
  const signUserToken = (user) => jwtLib.sign({
    userId: user.id,
    churchId: user.church_id,
    role: user.role,
  }, jwtSecret, { expiresIn: "30d", jwtid: cryptoLib.randomUUID() });

  const register = async (req, res) => {
    const { password, name, invitationToken, subunitId, phone, whatsapp } = req.body;
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
    const memberName = typeof name === "string" ? name.trim() : "";
    const phoneNumber = typeof phone === "string" ? phone.trim() : "";
    const whatsappNumber = typeof whatsapp === "string" ? whatsapp.trim() : "";

    if (!email || !password || !memberName || !invitationToken || !isUuid(subunitId) || phoneNumber.length < 7 || whatsappNumber.length < 7) {
      return res.status(400).json({
        message: "A valid invitation, work unit, email, password, name, phone, and WhatsApp number are required",
      });
    }

    try {
      const passwordHash = await bcryptLib.hash(password, 10);
      const tokenHash = cryptoLib.createHash("sha256").update(invitationToken).digest("hex");
      const { data: user, error } = await supabaseClient.rpc("register_invited_user", {
        p_token_hash: tokenHash,
        p_email: email,
        p_password_hash: passwordHash,
        p_name: memberName,
        p_subunit_id: subunitId,
        p_phone: phoneNumber,
        p_whatsapp: whatsappNumber,
      }).single();

      if (error || !user) {
        const detail = `${error?.message || ""} ${error?.details || ""}`;
        if (detail.includes("INVITATION_EMAIL_MISMATCH")) {
          return res.status(400).json({ message: "Use the email address that was invited" });
        }
        if (detail.includes("INVITATION_INVALID")) {
          return res.status(400).json({ message: "Invitation is invalid, expired, or already used" });
        }
        if (detail.includes("SUBUNIT_INVALID")) {
          return res.status(400).json({ message: "Select a valid work unit from the invited workspace" });
        }
        if (error?.code === "23505") {
          return res.status(409).json({ message: "An account with this email already exists" });
        }
        console.error("Invited registration failed:", error);
        return res.status(500).json({ message: "Registration failed. Try again." });
      }

      return res.status(201).json({
        message: "User registered successfully",
        token: signUserToken(user),
        user: toUserDto(user),
      });
    } catch (error) {
      console.error("Unexpected registration error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  };

  const login = async (req, res) => {
    const { workspaceSlug, password } = req.body;
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";

    if (!workspaceSlug || !email || !password) {
      return res.status(400).json({ message: "Workspace, email and password are required" });
    }

    try {
      const { data: church, error: churchError } = await supabaseClient
        .from("churches")
        .select("id, name, slug")
        .eq("slug", toSlug(workspaceSlug))
        .single();

      if (churchError || !church) {
        return res.status(401).json({ message: "Invalid workspace, email or password" });
      }

      const { data: user, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("church_id", church.id)
        .single();

      if (error || !user || !(await bcryptLib.compare(password, user.password_hash))) {
        return res.status(401).json({ message: "Invalid workspace, email or password" });
      }

      return res.status(200).json({
        message: "Login successful",
        token: signUserToken(user),
        user: toUserDto(user),
        workspace: church,
      });
    } catch (error) {
      console.error("Unexpected error during login:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  };

  const createTeam = async (req, res) => {
    const { teamName, workspaceSlug, name, password } = req.body;
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";

    if (!teamName || !name || !email || !password) {
      return res.status(400).json({ message: "teamName, name, email, and password are required" });
    }

    try {
      const slug = toSlug(workspaceSlug || teamName);
      if (slug.length < 3) {
        return res.status(400).json({ message: "Workspace name must produce a valid slug" });
      }

      const passwordHash = await bcryptLib.hash(password, 10);
      const { data, error } = await supabaseClient.rpc("create_workspace_with_admin", {
        p_team_name: teamName,
        p_slug: slug,
        p_email: email,
        p_password_hash: passwordHash,
        p_admin_name: name,
      }).single();

      if (error || !data) {
        console.error("Workspace creation failed:", error);
        if (error?.code === "23505") {
          return res.status(409).json({ message: "That workspace URL is already in use" });
        }
        return res.status(500).json({ message: "Failed to create workspace" });
      }

      const user = {
        id: data.user_id,
        church_id: data.user_church_id,
        email: data.user_email,
        name: data.user_name,
        role: data.user_role,
      };
      const team = {
        id: data.team_id,
        name: data.team_name,
        slug: data.team_slug,
        createdAt: data.team_created_at,
      };

      return res.status(201).json({
        message: "Team created successfully",
        token: signUserToken(user),
        user: toUserDto(user),
        team,
      });
    } catch (error) {
      console.error("Unexpected error creating team:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  };

  const getInvitation = async (req, res) => {
    try {
      const tokenHash = cryptoLib.createHash("sha256").update(req.params.token).digest("hex");
      const { data: invitation, error } = await supabaseClient
        .from("invitations")
        .select("email, status, expires_at, churches(id, name, slug, subunits(id, name))")
        .eq("token_hash", tokenHash)
        .single();

      if (error || !invitation || invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()) {
        return res.status(404).json({ message: "Invitation is invalid or expired" });
      }
      return res.json({ invitation: { email: invitation.email, workspace: invitation.churches } });
    } catch (error) {
      console.error("Failed to validate invitation:", error);
      return res.status(500).json({ message: "Failed to validate invitation" });
    }
  };

  const requestPasswordReset = async (req, res) => {
    const workspaceSlug = typeof req.body.workspaceSlug === "string" ? toSlug(req.body.workspaceSlug) : "";
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
    if (!workspaceSlug || !email) {
      return res.status(400).json({ message: "Workspace and email are required" });
    }

    try {
      const { data: church, error: churchError } = await supabaseClient
        .from("churches")
        .select("id")
        .eq("slug", workspaceSlug)
        .maybeSingle();
      if (churchError || !church) return res.json({ message: passwordResetResponse });

      const { data: user, error: userError } = await supabaseClient
        .from("users")
        .select("id, church_id, email, name")
        .eq("church_id", church.id)
        .eq("email", email)
        .maybeSingle();
      if (userError || !user) return res.json({ message: passwordResetResponse });

      const resetToken = cryptoLib.randomBytes(32).toString("hex");
      const tokenHash = cryptoLib.createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data: resetRequestId, error: tokenError } = await supabaseClient.rpc("create_password_reset_token", {
        p_church_id: user.church_id,
        p_user_id: user.id,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      });

      if (tokenError || !resetRequestId) {
        console.error("Failed to create password reset token:", tokenError);
        return res.json({ message: passwordResetResponse });
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const resetUrl = `${clientUrl}/?reset=${encodeURIComponent(resetToken)}`;
      const notification = await notificationClient("/notify/password-reset", {
        churchId: user.church_id,
        resetRequestId,
        email: user.email,
        name: user.name,
        resetUrl,
      });
      if (notification.status === "failed") {
        console.error("Failed to deliver password reset notification:", notification.message);
      }
      return res.json({ message: passwordResetResponse });
    } catch (error) {
      console.error("Unexpected password reset request error:", error);
      return res.json({ message: passwordResetResponse });
    }
  };

  const confirmPasswordReset = async (req, res) => {
    const { token, password } = req.body;
    if (typeof token !== "string" || !token || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "A valid reset token and password of at least 8 characters are required" });
    }

    try {
      const tokenHash = cryptoLib.createHash("sha256").update(token).digest("hex");
      const passwordHash = await bcryptLib.hash(password, 10);
      const { data, error } = await supabaseClient.rpc("reset_password_with_token", {
        p_token_hash: tokenHash,
        p_password_hash: passwordHash,
      });
      if (error || data !== true) {
        return res.status(400).json({ message: "This password reset link is invalid or has expired" });
      }
      return res.json({ message: "Password updated successfully. You can now sign in." });
    } catch (error) {
      console.error("Unexpected password reset confirmation error:", error);
      return res.status(500).json({ message: "Password reset failed. Try again." });
    }
  };

  const logout = async (req, res) => {
    if (!req.authToken || !req.user?.userId || !req.user?.churchId || !req.user?.exp) {
      return res.status(400).json({ message: "The current session cannot be revoked" });
    }

    try {
      const tokenHash = cryptoLib.createHash("sha256").update(req.authToken).digest("hex");
      const expiresAt = new Date(req.user.exp * 1000).toISOString();
      const { data, error } = await supabaseClient.rpc("revoke_session", {
        p_church_id: req.user.churchId,
        p_user_id: req.user.userId,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      });
      if (error || data !== true) {
        console.error("Failed to revoke session:", error);
        return res.status(500).json({ message: "The session could not be revoked" });
      }
      return res.json({ message: "Signed out successfully" });
    } catch (error) {
      console.error("Unexpected logout error:", error);
      return res.status(500).json({ message: "The session could not be revoked" });
    }
  };

  return { register, login, createTeam, getInvitation, requestPasswordReset, confirmPasswordReset, logout };
};

const handlers = createAuthHandlers();

module.exports = { ...handlers, createAuthHandlers };
