import { useContext, useState } from "react";
import { AuthProvider } from "./context/AuthProvider";
import { ToastProvider } from "./context/ToastProvider";
import { AuthContext } from "./context/authContext";
import { LoginForm } from "./components/LoginForm";
import { SignupForm } from "./components/SignupForm";
import { CreateTeamForm } from "./components/CreateTeamForm";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { ForgotPasswordForm, ResetPasswordForm } from "./components/PasswordResetForms";
import "./auth.css";
import "./landing.css";

const AppContent = () => {
  const { user, isInitializing, login, logout } = useContext(AuthContext);
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite"));
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset"));
  const [screen, setScreen] = useState(() => resetToken ? "reset-password" : inviteToken ? "signup" : "landing");

  const clearLinkState = () => window.history.replaceState({}, "", "/");

  const navigate = (nextScreen) => {
    if (screen === "signup" && nextScreen !== "signup") {
      setInviteToken(null);
      clearLinkState();
    }
    setScreen(nextScreen);
  };

  const finishInvitationSignup = async ({ workspaceSlug, email, password }) => {
    if (user) await logout();
    await login(workspaceSlug, email, password);
    setInviteToken(null);
    clearLinkState();
    setScreen("login");
  };

  const finishPasswordReset = async () => {
    await logout();
    window.history.replaceState({}, "", window.location.pathname);
    setScreen("login");
  };

  if (isInitializing) {
    return (
      <div className="app-loader" role="status">
        <div className="brand-mark">R</div>
        <span>Preparing your workspace...</span>
      </div>
    );
  }

  if (user && screen !== "reset-password" && screen !== "signup") return <Dashboard />;

  if (screen === "landing") {
    return <LandingPage onNavigate={navigate} />;
  }

  const screenCopy = {
    login: { kicker: "Welcome back", title: "Your team is ready when you are." },
    signup: { kicker: "Join your team", title: "Know where you fit and what comes next." },
    team: { kicker: "Create a workspace", title: "Build a clearer way to work." },
    "forgot-password": { kicker: "Account recovery", title: "Get securely back into your workspace." },
    "reset-password": { kicker: "Choose a new password", title: "Secure your account and get back to your team." },
  }[screen];

  return (
    <main className="auth-page">
      <button className="auth-back" type="button" onClick={() => navigate("landing")}>
        ← Back to home
      </button>
      <section className="auth-layout">
        <aside className="auth-story">
          <div className="brand-lockup"><span className="brand-mark">R</span><span>Rosterly</span></div>
          <div>
            <p className="eyebrow">{screenCopy.kicker}</p>
            <h2>{screenCopy.title}</h2>
            <p>One home for your people, shared tasks, work schedules and team communication.</p>
          </div>
          <div className="auth-proof">
            <div className="proof-avatars"><span>JO</span><span>AM</span><span>DK</span></div>
            <p><strong>Built for coordinated teams</strong><br />Clear assignments. Fewer missed handoffs.</p>
          </div>
        </aside>
        <div className="auth-card">
          <div className="auth-card-content">
            {screen === "login" && <LoginForm onForgotPassword={() => navigate("forgot-password")} />}
            {screen === "signup" && <SignupForm invitationToken={inviteToken} onSignupComplete={finishInvitationSignup} />}
            {screen === "team" && <CreateTeamForm />}
            {screen === "forgot-password" && <ForgotPasswordForm onBack={() => navigate("login")} />}
            {screen === "reset-password" && <ResetPasswordForm token={resetToken} onComplete={finishPasswordReset} />}

            <div className="auth-toggle">
              {screen === "login" ? (
                <><span>New to Rosterly?</span><button type="button" onClick={() => navigate("signup")}>Join a team</button></>
              ) : (
                <><span>Already have an account?</span><button type="button" onClick={() => navigate("login")}>Sign in</button></>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default function App() {
  return <ToastProvider><AuthProvider><AppContent /></AuthProvider></ToastProvider>;
}
