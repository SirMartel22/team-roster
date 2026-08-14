import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useToast } from "../context/toastContext";
import "../dashboard.css";
import { MemberAssignments, PerformanceView, RequestsView, RosterPlanner, UnitManagement } from "./WorkspaceTools";

const adminNav = ["Overview", "Members", "Units", "Schedule", "Requests"];
const memberNav = ["My overview", "My team", "Assignments", "Requests", "Performance", "My profile"];

const initials = (name = "Member") => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function Icon({ name }) {
  const symbols = { Overview: "◈", Members: "◎", Units: "◇", Schedule: "◷", Requests: "↔", Assignments: "◷", Performance: "%", "My overview": "◈", "My team": "◎", "My profile": "○" };
  return <span className="nav-icon" aria-hidden="true">{symbols[name]}</span>;
}

export function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [activeView, setActiveView] = useState(user?.role === "admin" ? "Overview" : "My overview");
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !user?.churchId) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${import.meta.env.VITE_ROSTER_SERVICE_URL}/members`, { headers, cache: "no-store" }),
      fetch(`${import.meta.env.VITE_ROSTER_SERVICE_URL}/subunits?churchId=${user.churchId}`, { headers, cache: "no-store" }),
    ])
      .then(async ([membersResponse, subunitsResponse]) => {
        if (!membersResponse.ok || !subunitsResponse.ok) throw new Error("We couldn't load your workspace data.");
        const [membersData, subunitsData] = await Promise.all([membersResponse.json(), subunitsResponse.json()]);
        setMembers(membersData.members || []);
        setSubunits(subunitsData.subunits || []);
      })
      .catch((requestError) => toast.error(requestError.message))
      .finally(() => setLoading(false));
  }, [token, user?.churchId, toast]);

  const myMember = useMemo(() => members.find((member) => member.user?.id === user?.id) || members[0], [members, user?.id]);
  const mySubunit = myMember?.subunit;
  const navigation = isAdmin ? adminNav : memberNav;
  const activeMembers = members.filter((member) => member.isActive !== false);

  const handleSubunitChanged = useCallback((change) => {
    setSubunits((current) => {
      let next = current;
      if (change?.type === "created" && change.subunit) next = [...current, change.subunit];
      if (change?.type === "updated" && change.subunit) next = current.map((unit) => unit.id === change.subunit.id ? change.subunit : unit);
      if (change?.type === "deleted" && change.id) next = current.filter((unit) => unit.id !== change.id);
      return [...next].sort((left, right) => left.name.localeCompare(right.name));
    });
  }, []);

  const handleMemberChanged = useCallback((changedMember) => {
    setMembers((current) => current.map((member) => member.id === changedMember.id ? changedMember : member));
  }, []);

  const changeView = (view) => { setActiveView(view); setMobileNavOpen(false); };
  const openPlanner = () => {
    changeView("Schedule");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Planning tools opened.");
  };

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div>
          <div className="dashboard-brand"><span className="brand-mark">R</span><span>Rosterly</span></div>
          <div className="workspace-chip"><span className="workspace-avatar">TW</span><div><small>WORKSPACE</small><strong>Team Workspace</strong></div><span className="chevron">⌄</span></div>
          <nav className="sidebar-nav" aria-label="Dashboard navigation">
            <p>WORKSPACE</p>
            {navigation.map((item) => <button key={item} className={activeView === item ? "active" : ""} onClick={() => changeView(item)}><Icon name={item} />{item}</button>)}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="help-card"><span>?</span><strong>Need a hand?</strong><p>Everything you need to get your team ready.</p><button>View quick guide</button></div>
          <button className="profile-button" onClick={logout}><span className="member-avatar">{initials(user?.name)}</span><span><strong>{user?.name}</strong><small>{isAdmin ? "Administrator" : mySubunit?.name || "Team member"}</small></span><b title="Sign out">→</b></button>
        </div>
      </aside>
      {mobileNavOpen && <button type="button" className="sidebar-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">☰</button><p>{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p><h1>{activeView}</h1></div>
          <div className="dashboard-actions"><button type="button" className="icon-button" aria-label="Notifications" title="Notifications" onClick={() => toast.info("You have no new notifications.")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></button>{isAdmin && <button type="button" className="primary-action" onClick={openPlanner}>Plan work <span>→</span></button>}</div>
        </header>

        {loading ? <DashboardSkeleton /> : isAdmin ? (
          <AdminContent view={activeView} members={members} activeMembers={activeMembers} subunits={subunits} onNavigate={changeView} token={token} onChanged={handleSubunitChanged} onMemberChanged={handleMemberChanged} />
        ) : (
          <MemberContent view={activeView} members={members} user={user} mySubunit={mySubunit} myMember={myMember} subunits={subunits} token={token} />
        )}
      </main>
    </div>
  );
}

function AdminContent({ view, members, activeMembers, subunits, onNavigate, token, onChanged, onMemberChanged }) {
  if (view === "Members") return <PeopleView members={members} title="All members" subtitle="Everyone working across your organisation's units." token={token} isAdmin onMemberChanged={onMemberChanged} />;
  if (view === "Units") return <UnitManagement token={token} subunits={subunits} members={members} onChanged={onChanged} />;
  if (view === "Schedule") return <RosterPlanner token={token} members={members} />;
  if (view === "Requests") return <RequestsView token={token} isAdmin subunits={subunits} />;
  return (
    <div className="dashboard-content">
      <section className="welcome-panel"><div><p className="eyebrow">TEAM PULSE</p><h2>Your organisation is taking shape.</h2><p>{activeMembers.length} active people are organised across {subunits.length} work {subunits.length === 1 ? "unit" : "units"}. Everything is ready for your next task plan.</p><button onClick={() => onNavigate("Schedule")}>Open planning <span>→</span></button></div><div className="pulse-visual"><span>{activeMembers.length}</span><small>active<br />members</small><i /></div></section>
      <section className="stats-grid"><Stat label="Active members" value={activeMembers.length} note="Ready for assignment" icon="◎" /><Stat label="Work units" value={subunits.length} note="Across this workspace" icon="◇" /><Stat label="Task plan" value="Ready" note="Plan the next work cycle" icon="✓" /></section>
      <section className="dashboard-grid">
        <div className="panel"><PanelHeader title="Your work units" action="View all" onAction={() => onNavigate("Units")} /><div className="team-list">{subunits.slice(0, 5).map((subunit, index) => { const count = members.filter((member) => member.subunitId === subunit.id).length; return <div className="team-row" key={subunit.id}><span className={`team-symbol tone-${index % 4}`}>{subunit.name.slice(0, 1)}</span><div><strong>{subunit.name}</strong><small>{count} {count === 1 ? "member" : "members"}</small></div><div className="capacity-bar"><i style={{ width: `${Math.min(100, count * 18)}%` }} /></div><b>›</b></div>; })}{!subunits.length && <EmptyState copy="Create your first unit to organise the team." />}</div></div>
        <div className="panel"><PanelHeader title="Recently added" action="All members" onAction={() => onNavigate("Members")} /><div className="people-list">{members.slice(0, 5).map((member) => <PersonRow key={member.id} member={member} />)}{!members.length && <EmptyState copy="New members will appear here." />}</div></div>
      </section>
    </div>
  );
}

function MemberContent({ view, members, user, mySubunit, myMember, subunits, token }) {
  if (view === "My team") return <PeopleView members={members} title={mySubunit?.name || "My team"} subtitle="The people you work alongside." />;
  if (view === "My profile") return <ProfileView user={user} subunit={mySubunit} />;
  if (view === "Assignments") return <MemberAssignments token={token} />;
  if (view === "Requests") return <RequestsView token={token} isAdmin={false} subunits={subunits} />;
  if (view === "Performance") return <PerformanceView token={token} member={myMember} />;
  return (
    <div className="dashboard-content">
      <section className="member-hero"><div><p className="eyebrow">WELCOME BACK</p><h2>Good to see you, {user?.name?.split(" ")[0]}.</h2><p>Your team information lives here. When a task plan is published, your next assignment will appear in this workspace.</p></div><span className="member-hero-mark">R</span></section>
      <section className="stats-grid member-stats"><Stat label="My work unit" value={mySubunit?.name || "Unassigned"} note="Your current unit" icon="◇" /><Stat label="Team members" value={members.length} note="People in your unit" icon="◎" /><Stat label="Availability" value="Active" note="Eligible for assignment" icon="✓" /></section>
      <section className="dashboard-grid member-grid"><div className="panel assignment-card"><PanelHeader title="Next assignment" /><div className="empty-assignment"><span>◷</span><h3>No published assignment yet</h3><p>Your next task and scheduled time will show here as soon as your team admin publishes the work plan.</p></div></div><div className="panel"><PanelHeader title="My teammates" action="View team" /><div className="people-list">{members.filter((member) => member.user?.id !== user?.id).slice(0, 4).map((member) => <PersonRow key={member.id} member={member} />)}{members.length <= 1 && <EmptyState copy="Your teammates will appear here." />}</div></div></section>
    </div>
  );
}

function Stat({ label, value, note, icon }) { return <article className="stat-card"><span className="stat-icon">{icon}</span><div><p>{label}</p><strong className={String(value).length > 10 ? "compact" : ""}>{value}</strong><small>{note}</small></div></article>; }
function PanelHeader({ title, action, onAction }) { return <div className="panel-header"><h3>{title}</h3>{action && <button onClick={onAction}>{action} <span>→</span></button>}</div>; }
function PersonRow({ member }) { return <div className="person-row"><span className="member-avatar">{initials(member.user?.name)}</span><div><strong>{member.user?.name || "Unnamed member"}</strong><small>{member.subunit?.name || "No unit"}</small></div><i className={member.isActive === false ? "inactive" : ""}>{member.isActive === false ? "Inactive" : "Active"}</i></div>; }
function EmptyState({ copy }) { return <div className="compact-empty">{copy}</div>; }
function PeopleView({ members, title, subtitle, token, isAdmin = false, onMemberChanged }) {
  const toast = useToast();
  const toggleStatus = async (member) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_ROSTER_SERVICE_URL}/members/${member.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: member.isActive === false }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "The member status could not be updated.");
      onMemberChanged?.(data.member);
      toast.success(`${member.user?.name || "Member"} is now ${data.member.isActive === false ? "inactive" : "active"}.`);
    } catch (error) { toast.error(error.message); }
  };
  return <section className="panel full-panel"><div className="view-heading"><div><p className="eyebrow">DIRECTORY</p><h2>{title}</h2><p>{subtitle}</p></div><label className="search-box"><span>⌕</span><input placeholder="Search members" aria-label="Search members" /></label></div><div className="member-table"><div className="table-head"><span>Member</span><span>Work unit</span><span>Status</span></div>{members.map((member) => <div className="table-row" key={member.id}><div><span className="member-avatar">{initials(member.user?.name)}</span><strong>{member.user?.name}</strong></div><span>{member.subunit?.name || "Unassigned"}</span>{isAdmin ? <button className={`member-status-button ${member.isActive === false ? "inactive" : ""}`} onClick={() => toggleStatus(member)}>{member.isActive === false ? "Activate" : "Deactivate"}</button> : <i className={member.isActive === false ? "inactive" : ""}>{member.isActive === false ? "Inactive" : "Active"}</i>}</div>)}</div></section>;
}
function ProfileView({ user, subunit }) { return <section className="panel full-panel profile-view"><div className="profile-hero"><span className="large-avatar">{initials(user?.name)}</span><div><p className="eyebrow">MY PROFILE</p><h2>{user?.name}</h2><p>{user?.email}</p></div></div><dl><div><dt>Role</dt><dd>Team member</dd></div><div><dt>Work unit</dt><dd>{subunit?.name || "Not assigned"}</dd></div><div><dt>Account status</dt><dd><i>Active</i></dd></div></dl></section>; }
function DashboardSkeleton() { return <div className="skeleton-grid"><i /><i /><i /><i /><i /></div>; }
