const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../config/supabaseClient");
const { toUserDto } = require("../utils/userDto");
const { toSlug } = require("../utils/slug");

const normalizeEmail = (email) => email.trim().toLowerCase();

const createAuthHandlers = ({
  supabaseClient = supabase,
  bcryptLib = bcrypt,
  jwtLib = jwt,
  cryptoLib = crypto,
  jwtSecret = process.env.JWT_SECRET,
} = {}) => {
  const signUserToken = (user) => jwtLib.sign({
    userId: user.id,
    churchId: user.church_id,
    role: user.role,
  }, jwtSecret, { expiresIn: "30d" });

  const register = async (req, res) => {
    const { password, name, invitationToken } = req.body;
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";

    if (!email || !password || !name || !invitationToken) {
      return res.status(400).json({
        message: "A valid invitation, email, password, and name are required",
      });
    }

    try {
      const passwordHash = await bcryptLib.hash(password, 10);
      const tokenHash = cryptoLib.createHash("sha256").update(invitationToken).digest("hex");
      const { data: user, error } = await supabaseClient.rpc("register_invited_user", {
        p_token_hash: tokenHash,
        p_email: email,
        p_password_hash: passwordHash,
        p_name: name,
      }).single();

      if (error || !user) {
        const detail = `${error?.message || ""} ${error?.details || ""}`;
        if (detail.includes("INVITATION_EMAIL_MISMATCH")) {
          return res.status(400).json({ message: "Use the email address that was invited" });
        }
        if (detail.includes("INVITATION_INVALID")) {
          return res.status(400).json({ message: "Invitation is invalid, expired, or already used" });
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

  return { register, login, createTeam, getInvitation };
};

const handlers = createAuthHandlers();

module.exports = { ...handlers, createAuthHandlers };
