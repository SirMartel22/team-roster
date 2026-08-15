import { useState } from "react";
import { useToast } from "../context/toastContext";

export function CreateTeamForm() {
  const [fields, setFields] = useState({ teamName: "", workspaceSlug: "", name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(fields).some((value) => !value.trim())) return toast.error("Please complete every field.");
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "We couldn't create your workspace.");
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      sessionStorage.setItem("pendingToast", JSON.stringify({ type: "success", message: "Workspace created successfully." }));
      window.location.reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <div className="auth-form-header"><p className="eyebrow">For team administrators</p><h1>Create your organisation workspace</h1><p className="auth-subtitle">Set up your organisation and administrator account. You can organise units and invite members next.</p></div>
      <div className="auth-input-group"><label htmlFor="teamName">Organisation or team name</label><input className="auth-input" id="teamName" name="teamName" value={fields.teamName} onChange={update} placeholder="e.g. Acme Operations" /></div>
      <div className="auth-input-group"><label htmlFor="workspaceSlug">Workspace URL</label><input className="auth-input" id="workspaceSlug" name="workspaceSlug" value={fields.workspaceSlug} onChange={(event) => setFields((current) => ({ ...current, workspaceSlug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="e.g. acme-operations" /><small className="auth-hint">Members will use this when signing in.</small></div>
      <div className="auth-input-group"><label htmlFor="adminName">Your full name</label><input className="auth-input" id="adminName" name="name" value={fields.name} onChange={update} autoComplete="name" /></div>
      <div className="auth-form-row"><div className="auth-input-group"><label htmlFor="teamEmail">Email address</label><input className="auth-input" id="teamEmail" name="email" type="email" value={fields.email} onChange={update} autoComplete="email" /></div><div className="auth-input-group"><label htmlFor="teamPassword">Password</label><input className="auth-input" id="teamPassword" name="password" type="password" value={fields.password} onChange={update} autoComplete="new-password" /></div></div>
      <button className="auth-button" disabled={isSubmitting}>{isSubmitting ? "Creating your workspace..." : "Create workspace"}</button>
      <p className="form-footnote">By continuing, you confirm that you are authorised to manage this team.</p>
    </form>
  );
}
