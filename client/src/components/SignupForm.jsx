import { useEffect, useState } from "react";

export function SignupForm({ onSignupComplete, invitationToken }) {
  const [fields, setFields] = useState({ churchId: "", subunitId: "", name: "", email: "", password: "", phone: "", whatsapp: "" });
  const [churches, setChurches] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));

  useEffect(() => {
    if (invitationToken) {
      fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/invitations/${invitationToken}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          const workspace = data.invitation.workspace;
          setChurches([workspace]);
          setFields((current) => ({ ...current, churchId: workspace.id, email: data.invitation.email }));
        })
        .catch((requestError) => setError(requestError.message));
      return;
    }
    fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/churches`)
      .then((response) => response.json())
      .then((data) => setChurches(data.churches || []))
      .catch(() => setError("We couldn't load the available teams."));
  }, [invitationToken]);

  useEffect(() => {
    if (!fields.churchId) return;
    fetch(`${import.meta.env.VITE_ROSTER_SERVICE_URL}/subunits?churchId=${fields.churchId}`)
      .then((response) => response.json())
      .then((data) => setSubunits(data.subunits || []))
      .catch(() => setError("We couldn't load this organisation's units."));
  }, [fields.churchId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const { churchId, subunitId, name, email, password, phone, whatsapp } = fields;
    if (!churchId || !subunitId || !name || !email || !password) return setError("Please complete all required fields.");
    setIsSubmitting(true);
    try {
      const registerResponse = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, name, email, password, invitationToken }),
      });
      const registerData = await registerResponse.json();
      if (!registerResponse.ok) throw new Error(registerData.message || "Registration failed");

      const memberResponse = await fetch(`${import.meta.env.VITE_ROSTER_SERVICE_URL}/members`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${registerData.token}` },
        body: JSON.stringify({ subunitId, phone: phone || null, whatsapp: whatsapp || null }),
      });
      const memberData = await memberResponse.json();
      if (!memberResponse.ok) throw new Error(`Your account was created, but joining the team failed: ${memberData.message}`);
      onSignupComplete?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-header"><p className="eyebrow">Member registration</p><h1>Join your organisation</h1><p className="auth-subtitle">Choose your organisation and work unit, then create your personal account.</p></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="auth-form-row">
        <div className="auth-input-group"><label htmlFor="churchId">Organisation</label><select className="auth-input" id="churchId" name="churchId" value={fields.churchId} disabled={Boolean(invitationToken)} onChange={(event) => { update(event); setFields((current) => ({ ...current, churchId: event.target.value, subunitId: "" })); }}><option value="">Select your organisation</option>{churches.map((church) => <option key={church.id} value={church.id}>{church.name}</option>)}</select></div>
        <div className="auth-input-group"><label htmlFor="subunitId">Work unit</label><select className="auth-input" id="subunitId" name="subunitId" value={fields.subunitId} onChange={update} disabled={!fields.churchId}><option value="">Select a unit</option>{subunits.map((subunit) => <option key={subunit.id} value={subunit.id}>{subunit.name}</option>)}</select></div>
      </div>
      <div className="auth-input-group"><label htmlFor="memberName">Full name</label><input className="auth-input" id="memberName" name="name" value={fields.name} onChange={update} autoComplete="name" /></div>
      <div className="auth-form-row"><div className="auth-input-group"><label htmlFor="memberEmail">Email</label><input className="auth-input" id="memberEmail" name="email" type="email" value={fields.email} onChange={update} readOnly={Boolean(invitationToken)} autoComplete="email" /></div><div className="auth-input-group"><label htmlFor="memberPassword">Password</label><input className="auth-input" id="memberPassword" name="password" type="password" value={fields.password} onChange={update} autoComplete="new-password" /></div></div>
      <details className="optional-fields"><summary>Add contact details <span>Optional</span></summary><div className="auth-form-row"><div className="auth-input-group"><label htmlFor="phone">Phone</label><input className="auth-input" id="phone" name="phone" type="tel" value={fields.phone} onChange={update} /></div><div className="auth-input-group"><label htmlFor="whatsapp">WhatsApp</label><input className="auth-input" id="whatsapp" name="whatsapp" type="tel" value={fields.whatsapp} onChange={update} /></div></div></details>
      <button className="auth-button" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Join team"}</button>
    </form>
  );
}
