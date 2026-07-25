import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";

export function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derived flag — used purely to decide what to SHOW, not to enforce
  // any actual security. The real access control already happened on
  // the server when it filtered the /members response.
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // This request now returns DIFFERENT data depending on who's
        // asking — the server does this filtering, not the client.
        // An admin gets everyone; a regular member gets only their
        // own subunit's members.
        const membersRes = await fetch(
          `${import.meta.env.VITE_ROSTER_SERVICE_URL}/members`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );

        if (!membersRes.ok) throw new Error("Failed to fetch members");
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);

        // Subunits list stays public/unfiltered — everyone can see the
        // list of subunits that exist (needed for context, e.g. signup),
        // even though only admins can CREATE new ones.
        const subunitsRes = await fetch(
          `${import.meta.env.VITE_ROSTER_SERVICE_URL}/subunits`,
        );

        if (!subunitsRes.ok) throw new Error("Failed to fetch subunits");
        const subunitsData = await subunitsRes.json();
        setSubunits(subunitsData.subunits || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (!user) {
    return <div>Not logged in</div>;
  }

  // For a regular member, all fetched members already belong to their
  // own subunit (server-enforced) — so we can just read the subunit
  // name off the first member's own record, if any exist.
  const myOwnSubunitName =
    !isAdmin && members.length > 0 ? members[0].subunit?.name : null;

  // console.log("User role:", user?.role);
  // console.log("Members returned:", members);
  // console.log("Is Admin:", isAdmin);

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1>Welcome, {user.name}!</h1>
          {/* Small role badge — helps during testing to confirm which
              view you're looking at, and useful for real users too */}
          <span
            style={{
              fontSize: "0.85rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              backgroundColor: isAdmin ? "#4a2b8f" : "#2b5f8f",
              color: "white",
            }}
          >
            {isAdmin ? "Admin" : "Member"}
          </span>
        </div>
        <button onClick={logout}>Logout</button>
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}
      {loading && <div>Loading...</div>}

      {isAdmin ? (
        // ── ADMIN VIEW ──
        // Sees every subunit and every member, across the whole church.
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
        >
          <div>
            <h2>All Subunits</h2>
            <ul>
              {subunits.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2>All Members ({members.length})</h2>
            <ul>
              {members.map((m) => (
                <li key={m.id}>
                  {m.user?.name} — {m.subunit?.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        // ── MEMBER VIEW ──
        // Sees only their own subunit, and only the members within it.
        <div>
          <h2>My Subunit: {myOwnSubunitName || "Not assigned"}</h2>
          <ul>
            {members.map((m) => (
              <li key={m.id}>{m.user?.name}</li>
            ))}
          </ul>

          {/* Placeholder for the subunit-switch request feature —
              not yet wired to a real backend endpoint, since that
              flow hasn't been built yet. Button is here so the UI
              shape exists, but clicking it doesn't do anything real yet. */}
          <button disabled style={{ marginTop: "1rem", opacity: 0.5 }}>
            Request Subunit Change (coming soon)
          </button>

          {/* Same placeholder for the attendance/performance report,
              which also depends on schema work we haven't done yet. */}
          <div style={{ marginTop: "2rem" }}>
            <h3>My Performance Report</h3>
            <p style={{ opacity: 0.6 }}>Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
