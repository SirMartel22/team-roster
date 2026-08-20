import { useState } from "react";
import { useToast } from "../context/toastContext";
import { PasswordInput } from "./PasswordInput";

const authServiceUrl = import.meta.env.VITE_AUTH_SERVICE_URL;

async function post(path, body) {
  const response = await fetch(`${authServiceUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed. Try again.");
  return data;
}

export function ForgotPasswordForm({ onBack }) {
  const toast = useToast();
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const data = await post("/password-reset/request", { workspaceSlug, email });
      setConfirmation(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmation) {
    return <div className="auth-form" role="status">
      <div className="auth-form-header"><p className="eyebrow">Check your inbox</p><h1>Reset link requested</h1><p className="auth-subtitle">{confirmation} Check your spam folder if it does not arrive within a few minutes.</p></div>
      <button type="button" className="auth-button" onClick={onBack}>Return to sign in</button>
    </div>;
  }

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-header"><p className="eyebrow">Account recovery</p><h1>Reset your password</h1><p className="auth-subtitle">Enter the workspace and email address you use to sign in. We’ll send a one-time link if the account exists.</p></div>
    <div className="auth-input-group"><label htmlFor="resetWorkspace">Workspace</label><input className="auth-input" id="resetWorkspace" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(event.target.value.toLowerCase())} placeholder="e.g. bhbc-media" autoComplete="organization" required disabled={isSubmitting} /></div>
    <div className="auth-input-group"><label htmlFor="resetEmail">Email</label><input className="auth-input" id="resetEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={isSubmitting} /></div>
    <button className="auth-button" disabled={isSubmitting}>{isSubmitting ? "Sending link..." : "Send reset link"}</button>
  </form>;
}

export function ResetPasswordForm({ token, onComplete }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await post("/password-reset/confirm", { token, password });
      toast.success(data.message);
      await onComplete();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-header"><p className="eyebrow">Secure your account</p><h1>Choose a new password</h1><p className="auth-subtitle">Use at least eight characters. This reset link can be used only once.</p></div>
    <div className="auth-input-group"><label htmlFor="newPassword">New password</label><PasswordInput id="newPassword" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" autoComplete="new-password" required disabled={isSubmitting} /></div>
    <div className="auth-input-group"><label htmlFor="confirmPassword">Confirm new password</label><PasswordInput id="confirmPassword" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength="8" autoComplete="new-password" required disabled={isSubmitting} /></div>
    <button className="auth-button" disabled={isSubmitting}>{isSubmitting ? "Updating password..." : "Update password"}</button>
  </form>;
}
