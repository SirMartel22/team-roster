import { useState } from "react";

export function PasswordInput({ className = "auth-input", disabled = false, ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false);
  const actionLabel = isVisible ? "Hide password" : "Show password";

  return (
    <div className="auth-password-field">
      <input
        {...inputProps}
        className={className}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={actionLabel}
        title={actionLabel}
        aria-pressed={isVisible}
        disabled={disabled}
      >
        {isVisible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5.5 9 5.5a16.5 16.5 0 0 1-2.2 2.7M6.6 6.6C4.3 8 3 10 3 10s3.5 5.5 9 5.5c1 0 1.9-.2 2.7-.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
