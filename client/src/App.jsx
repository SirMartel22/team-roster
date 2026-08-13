import { useContext, useState } from "react";
import { AuthProvider } from "./context/AuthProvider";
import { AuthContext } from "./context/authContext";
import { LoginForm } from "./components/LoginForm";
import { SignupForm } from "./components/SignupForm";
import { CreateTeamForm } from "./components/CreateTeamForm";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import "./auth.css";
import "./landing.css";

const AppContent = () => {
  const { user, isInitializing } = useContext(AuthContext);
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  const [screen, setScreen] = useState(inviteToken ? "signup" : "landing");

  if (isInitializing) {
    return (
      <div className="app-loader" role="status">
        <div className="brand-mark">R</div>
        <span>Preparing your workspace...</span>
      </div>
    );
  }

  if (user) return <Dashboard />;

  if (screen === "landing") {
    return <LandingPage onNavigate={setScreen} />;
  }

  const screenCopy = {
    login: { kicker: "Welcome back", title: "Your team is ready when you are." },
    signup: { kicker: "Join your team", title: "Know where you fit and what comes next." },
    team: { kicker: "Create a workspace", title: "Build a clearer way to work." },
  }[screen];

  return (
    <main className="auth-page">
      <button className="auth-back" type="button" onClick={() => setScreen("landing")}>
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
            {screen === "login" && <LoginForm />}
            {screen === "signup" && <SignupForm invitationToken={inviteToken} onSignupComplete={() => setScreen("login")} />}
            {screen === "team" && <CreateTeamForm />}

            <div className="auth-toggle">
              {screen === "login" ? (
                <><span>New to Rosterly?</span><button type="button" onClick={() => setScreen("signup")}>Join a team</button></>
              ) : (
                <><span>Already have an account?</span><button type="button" onClick={() => setScreen("login")}>Sign in</button></>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
