import { useState, useEffect } from "react";

export function SignupForm({ onSignupComplete }) {
  // Form fields for account creation
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form fields for member profile
  const [subunitId, setSubunitId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Dropdown data, loading, and error state
  const [subunits, setSubunits] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch the list of subunits once, when the form first mounts,
  // so the dropdown is populated before the user starts filling anything in.
  useEffect(() => {
    async function fetchSubunits() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_ROSTER_SERVICE_URL}/subunits`,
        );
        const data = await response.json();
        setSubunits(data.subunits || []);
      } catch (err) {
        console.error("Failed to load subunits:", err);
        setError("Could not load subunit list. Please refresh and try again.");
      }
    }

    fetchSubunits();
  }, []); // empty dependency array = runs once, on mount only

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation before hitting the network at all —
    // cheap check, avoids a wasted request for obviously incomplete input.
    if (!name || !email || !password || !subunitId) {
      setError("All fields are required");
      return;
    }

    setIsSubmitting(true);

    try {
      // ── Step 1: Create the account via auth-service ──
      const registerResponse = await fetch(
        `${import.meta.env.VITE_AUTH_SERVICE_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        },
      );

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        // e.g. 409 "account already exists" — surface auth-service's
        // actual error message rather than a generic one.
        throw new Error(registerData.message || "Registration failed");
      }

      // The newly created user's id comes back from /register —
      // we need this to link the Member profile to the right User.
      const newUserId = registerData.user.id;

      // ── Step 2: Create the member profile via roster-core-service ──
      const memberResponse = await fetch(
        `${import.meta.env.VITE_ROSTER_SERVICE_URL}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: newUserId,
            subunitId,
            phone: phone || null,
            whatsapp: whatsapp || null,
          }),
        },
      );

      const memberData = await memberResponse.json();

      if (!memberResponse.ok) {
        // Worth being explicit here: the ACCOUNT was created successfully
        // in step 1, but the MEMBER PROFILE failed in step 2. This is a
        // real consequence of splitting this across two services —
        // there's no single database transaction wrapping both steps,
        // so a failure here leaves a User with no Member profile.
        // For an MVP, surfacing this clearly to the user (rather than
        // silently failing) is the right call — a more robust system
        // would need a cleanup/retry strategy, which is a good thing
        // to flag as a known limitation rather than solve right now.
        throw new Error(
          `Account created, but joining the subunit failed: ${memberData.message}`,
        );
      }

      // Both steps succeeded — notify the parent component so it can,
      // e.g., redirect to the login form.
      if (onSignupComplete) {
        onSignupComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-header">
        <p className="eyebrow">Get started</p>
        <h1>Create your roster account</h1>
        <p className="auth-subtitle">
          Register to join your BHBC subunit and manage member information easily.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-input-group">
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <label htmlFor="subunit">Subunit</label>
        <select
          id="subunit"
          value={subunitId}
          onChange={(e) => setSubunitId(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        >
          <option value="">-- Select a subunit --</option>
          {subunits.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="auth-input-group">
        <label htmlFor="phone">Phone (optional)</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        />
      </div>

      <div className="auth-input-group">
        <label htmlFor="whatsapp">WhatsApp (optional)</label>
        <input
          id="whatsapp"
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          disabled={isSubmitting}
          className="auth-input"
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="auth-button">
        {isSubmitting ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
