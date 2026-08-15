import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../context/toastContext";

const serviceUrl = import.meta.env.VITE_ROSTER_SERVICE_URL;

async function request(path, token, options = {}) {
  const response = await fetch(`${serviceUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

const today = () => {
  const value = new Date();
  const offset = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const displayServiceDate = (value) => new Date(value).toLocaleDateString(undefined, {
  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

const logInvitationUrl = (inviteUrl) => {
  if (!inviteUrl) return;
  try {
    const parsed = new URL(inviteUrl);
    if (import.meta.env.DEV) {
      console.info("[Rosterly] Generated invitation URL:", inviteUrl);
      return;
    }
    parsed.searchParams.set("invite", "[redacted]");
    console.info("[Rosterly] Generated invitation URL:", parsed.toString());
    if (parsed.hostname === "localhost") {
      console.error("[Rosterly] Production CLIENT_URL is misconfigured: invitation links point to localhost.");
    }
  } catch {
    console.error("[Rosterly] The API returned an invalid invitation URL.");
  }
};

export function UnitManagement({ token, subunits, members, onChanged }) {
  const toast = useToast();
  const [duties, setDuties] = useState([]);
  const [name, setName] = useState("");
  const [dutyDrafts, setDutyDrafts] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDuties = useCallback(() => request("/duties", token).then((data) => setDuties(data.duties || [])).catch((error) => toast.error(error.message)), [token, toast]);
  useEffect(() => { loadDuties(); }, [loadDuties]);

  const createUnit = async (event) => {
    event.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    try {
      const data = await request("/subunits", token, { method: "POST", body: JSON.stringify({ name }) });
      setName(""); toast.success("Unit created."); onChanged?.({ type: "created", subunit: data.subunit });
    } catch (error) { toast.error(error.message); }
    finally { setIsCreating(false); }
  };

  const createDuty = async (subunitId) => {
    try {
      await request("/duties", token, { method: "POST", body: JSON.stringify({ subunitId, name: dutyDrafts[subunitId] }) });
      setDutyDrafts((current) => ({ ...current, [subunitId]: "" })); toast.success("Duty created."); loadDuties();
    } catch (error) { toast.error(error.message); }
  };

  const removeDuty = async (id) => {
    try { await request(`/duties/${id}`, token, { method: "DELETE" }); toast.success("Duty deleted."); loadDuties(); }
    catch (error) { toast.error(error.message); }
  };
  const openRenameModal = (subunit) => {
    setEditingUnit(subunit);
    setRenameName(subunit.name);
    setRenameError("");
  };
  const closeRenameModal = () => {
    if (isRenaming) return;
    setEditingUnit(null);
    setRenameName("");
    setRenameError("");
  };
  const renameUnit = async (event) => {
    event.preventDefault();
    const nextName = renameName.trim();
    if (!editingUnit || !nextName || nextName === editingUnit.name || isRenaming) return;
    setIsRenaming(true);
    setRenameError("");
    try {
      const data = await request(`/subunits/${editingUnit.id}`, token, { method: "PUT", body: JSON.stringify({ name: nextName }) });
      onChanged?.({ type: "updated", subunit: data.subunit });
      toast.success("Unit renamed.");
      setEditingUnit(null);
      setRenameName("");
    } catch (error) { setRenameError(error.message); toast.error(error.message); }
    finally { setIsRenaming(false); }
  };
  const openDeleteModal = (subunit) => {
    setDeletingUnit(subunit);
    setDeleteError("");
  };
  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeletingUnit(null);
    setDeleteError("");
  };
  const removeUnit = async () => {
    if (!deletingUnit || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await request(`/subunits/${deletingUnit.id}`, token, { method: "DELETE" });
      onChanged?.({ type: "deleted", id: deletingUnit.id });
      toast.success("Unit deleted.");
      setDeletingUnit(null);
    } catch (error) { setDeleteError(error.message); toast.error(error.message); }
    finally { setIsDeleting(false); }
  };

  return <section className="workspace-tool">
    <div className="view-heading standalone"><div><p className="eyebrow">STRUCTURE</p><h2>Work units and duties</h2><p>Configure the people groups and responsibilities used by the scheduler.</p></div></div>
    <form className="inline-tool-form" onSubmit={createUnit} aria-busy={isCreating}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New work unit" required disabled={isCreating} /><button disabled={isCreating || !name.trim()}>{isCreating ? "Creating…" : "Create unit"}</button></form>
    <div className="subunit-grid">{subunits.map((subunit) => {
      const unitDuties = duties.filter((duty) => duty.subunitId === subunit.id);
      const count = members.filter((member) => member.subunitId === subunit.id).length;
      return <article key={subunit.id} className="subunit-card tool-card"><div className="tool-card-heading"><h3>{subunit.name}</h3><div><button onClick={() => openRenameModal(subunit)}>Rename</button><button onClick={() => openDeleteModal(subunit)}>Delete</button></div></div><p>{count} {count === 1 ? "member" : "members"}</p>
        <ul className="duty-list">{unitDuties.map((duty) => <li key={duty.id}><span>{duty.name}</span><button onClick={() => removeDuty(duty.id)} aria-label={`Delete ${duty.name}`}>×</button></li>)}</ul>
        <div className="inline-tool-form compact"><input value={dutyDrafts[subunit.id] || ""} onChange={(event) => setDutyDrafts((current) => ({ ...current, [subunit.id]: event.target.value }))} placeholder="Add duty" /><button type="button" onClick={() => createDuty(subunit.id)} disabled={!dutyDrafts[subunit.id]?.trim()}>Add</button></div>
      </article>;
    })}</div>
    {editingUnit && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRenameModal(); }}>
      <div className="rename-modal" role="dialog" aria-modal="true" aria-labelledby="rename-unit-title">
        <div className="rename-modal-header"><div><p className="eyebrow">WORK UNIT</p><h2 id="rename-unit-title">Rename unit</h2></div><button type="button" className="modal-close" onClick={closeRenameModal} disabled={isRenaming} aria-label="Close rename dialog">×</button></div>
        <p className="rename-modal-copy">Choose a clear name your team will recognise.</p>
        <form onSubmit={renameUnit}>
          <label htmlFor="rename-unit-name">Unit name</label>
          <input id="rename-unit-name" value={renameName} onChange={(event) => setRenameName(event.target.value)} disabled={isRenaming} autoFocus required />
          {renameError && <p className="modal-error" role="alert">{renameError}</p>}
          <div className="rename-modal-actions"><button type="button" className="secondary-button" onClick={closeRenameModal} disabled={isRenaming}>Cancel</button><button type="submit" className="primary-button" disabled={isRenaming || !renameName.trim() || renameName.trim() === editingUnit.name}>{isRenaming ? "Renaming…" : "Save changes"}</button></div>
        </form>
      </div>
    </div>}
    {deletingUnit && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteModal(); }}>
      <div className="rename-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-unit-title" aria-describedby="delete-unit-description">
        <div className="delete-warning-icon" aria-hidden="true">!</div>
        <div className="rename-modal-header"><div><p className="eyebrow">PERMANENT ACTION</p><h2 id="delete-unit-title">Delete {deletingUnit.name}?</h2></div><button type="button" className="modal-close" onClick={closeDeleteModal} disabled={isDeleting} aria-label="Close delete dialog">×</button></div>
        <p className="rename-modal-copy" id="delete-unit-description">This unit will be permanently removed. You can only delete a unit that has no members, duties, or pending requests.</p>
        {deleteError && <p className="modal-error" role="alert">{deleteError}</p>}
        <div className="rename-modal-actions"><button type="button" className="secondary-button" onClick={closeDeleteModal} disabled={isDeleting}>Keep unit</button><button type="button" className="danger-button" onClick={removeUnit} disabled={isDeleting}>{isDeleting ? "Deleting…" : "Delete unit"}</button></div>
      </div>
    </div>}
  </section>;
}

export function RosterPlanner({ token, members }) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [manualTime, setManualTime] = useState("09:00");
  const [viewMode, setViewMode] = useState("upcoming");
  const [entries, setEntries] = useState([]);
  const [generationResults, setGenerationResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleDraft, setScheduleDraft] = useState({ name: "", weekday: "0", startTime: "09:00", timezone: "Africa/Lagos", horizonDays: 35, autoPublish: true });
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const loadSchedules = useCallback(() => request("/recurring-schedules", token)
    .then((data) => setSchedules(data.schedules || []))
    .catch((error) => toast.error(error.message)), [token, toast]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const load = useCallback(async (mode = viewMode) => {
    const query = mode === "upcoming" ? `/rosters?scope=upcoming&from=${today()}` : `/rosters?date=${date}`;
    try { const data = await request(query, token); setEntries(data.rosterEntries || []); }
    catch (error) { toast.error(error.message); }
  }, [date, token, toast, viewMode]);
  useEffect(() => {
    const query = viewMode === "upcoming" ? `/rosters?scope=upcoming&from=${today()}` : `/rosters?date=${date}`;
    request(query, token)
      .then((data) => setEntries(data.rosterEntries || []))
      .catch((error) => toast.error(error.message));
  }, [date, token, toast, viewMode]);

  const act = async (action) => {
    setBusy(true);
    try {
      const data = await request(`/rosters/${action}`, token, { method: "POST", body: JSON.stringify({ serviceDate: date, serviceTime: manualTime, timezone: "Africa/Lagos" }) });
      if (action === "generate") setGenerationResults(data.results || []);
      if (action === "publish") {
        const notification = data.notification;
        const summary = notification?.data?.summary;
        if (notification?.status === "failed") {
          toast.error(`${data.message}, but task emails were not sent: ${notification.message}`);
        } else if (summary?.failed) {
          toast.error(`${data.message}. ${summary.sent + summary.alreadySent} of ${summary.total} task emails were delivered; ${summary.failed} failed.`);
        } else if (summary?.processing) {
          toast.warning(`${data.message}. ${summary.sent + summary.alreadySent} of ${summary.total} task emails are delivered; ${summary.processing} are still processing.`);
        } else if (summary) {
          toast.success(`${data.message}. Task emails delivered for all ${summary.total} assignments.`);
        } else {
          toast.warning(`${data.message}, but email delivery could not be confirmed.`);
        }
      } else {
        toast.success(data.message);
      }
      setViewMode("date");
      await load("date");
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const reassign = async (entryId, memberId) => {
    try { await request(`/rosters/${entryId}/assignment`, token, { method: "PATCH", body: JSON.stringify({ memberId }) }); toast.success("Assignment updated."); await load(); }
    catch (error) { toast.error(error.message); }
  };
  const attendance = async (entryId, attended) => {
    try { await request(`/rosters/${entryId}/attendance`, token, { method: "PATCH", body: JSON.stringify({ attended }) }); toast.success("Attendance updated."); await load(); }
    catch (error) { toast.error(error.message); }
  };

  const createRecurringSchedule = async (event) => {
    event.preventDefault();
    if (scheduleBusy) return;
    setScheduleBusy(true);
    try {
      const data = await request("/recurring-schedules", token, { method: "POST", body: JSON.stringify({ ...scheduleDraft, weekday: Number(scheduleDraft.weekday), horizonDays: Number(scheduleDraft.horizonDays) }) });
      toast.success(`${data.message}. ${data.generation.generatedAssignments} assignments created.`);
      setScheduleDraft((current) => ({ ...current, name: "" }));
      await Promise.all([loadSchedules(), load("upcoming")]);
      setViewMode("upcoming");
    } catch (error) { toast.error(error.message); }
    finally { setScheduleBusy(false); }
  };

  const updateRecurringSchedule = async (schedule, changes) => {
    try {
      const data = await request(`/recurring-schedules/${schedule.id}`, token, { method: "PUT", body: JSON.stringify({ ...schedule, ...changes }) });
      toast.success(data.message); await loadSchedules(); await load("upcoming");
    } catch (error) { toast.error(error.message); }
  };

  const deleteRecurringSchedule = async (schedule) => {
    if (!window.confirm(`Delete ${schedule.name}? Existing generated tasks will be kept.`)) return;
    try { const data = await request(`/recurring-schedules/${schedule.id}`, token, { method: "DELETE" }); toast.success(data.message); await loadSchedules(); }
    catch (error) { toast.error(error.message); }
  };

  return <section className="panel full-panel workspace-tool"><div className="view-heading"><div><p className="eyebrow">TASK PLANNING</p><h2>Generate, review and publish</h2><p>Assignments remain drafts until you explicitly publish them.</p></div></div>
    <section className="recurring-schedule-panel">
      <div><p className="eyebrow">AUTOMATION</p><h3>Recurring service times</h3><p>Rosterly keeps at least one month scheduled ahead and sends reminders automatically.</p></div>
      <form className="recurring-schedule-form" onSubmit={createRecurringSchedule}>
        <input value={scheduleDraft.name} onChange={(event) => setScheduleDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Sunday Service" required />
        <select value={scheduleDraft.weekday} onChange={(event) => setScheduleDraft((current) => ({ ...current, weekday: event.target.value }))}><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select>
        <input type="time" value={scheduleDraft.startTime} onChange={(event) => setScheduleDraft((current) => ({ ...current, startTime: event.target.value }))} required />
        <input value={scheduleDraft.timezone} onChange={(event) => setScheduleDraft((current) => ({ ...current, timezone: event.target.value }))} aria-label="Timezone" required />
        <label className="automation-checkbox"><input type="checkbox" checked={scheduleDraft.autoPublish} onChange={(event) => setScheduleDraft((current) => ({ ...current, autoPublish: event.target.checked }))} /> Auto-publish</label>
        <button disabled={scheduleBusy}>{scheduleBusy ? "Creating…" : "Add recurring time"}</button>
      </form>
      <div className="recurring-schedule-list">{schedules.map((schedule) => <article key={schedule.id} className="recurring-schedule-card"><div><strong>{schedule.name}</strong><small>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][schedule.weekday]} at {schedule.startTime} · {schedule.timezone}</small></div><span className={`status-pill ${schedule.isActive ? "" : "inactive"}`}>{schedule.isActive ? "active" : "paused"}</span><div><button type="button" onClick={() => updateRecurringSchedule(schedule, { isActive: !schedule.isActive })}>{schedule.isActive ? "Pause" : "Resume"}</button><button type="button" className="schedule-delete" onClick={() => deleteRecurringSchedule(schedule)}>Delete</button></div></article>)}{!schedules.length && <p className="compact-empty">No recurring service times configured yet.</p>}</div>
    </section>
    <div className="planner-actions"><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setViewMode("date"); }} /><input type="time" value={manualTime} onChange={(event) => setManualTime(event.target.value)} aria-label="Service start time" /><button type="button" className={viewMode === "upcoming" ? "selected-view" : ""} onClick={() => setViewMode("upcoming")}>Upcoming tasks</button><button onClick={() => act("generate")} disabled={busy}>Generate draft</button><button className="publish-button" onClick={() => act("publish")} disabled={busy || viewMode !== "date" || !entries.length}>Publish roster</button></div>
    {generationResults.filter((result) => result.status !== "assigned" || result.fairnessWarning).map((result) => <p className="tool-warning" key={result.duty.id}>{result.duty.name}: {result.reason || result.fairnessWarning}</p>)}
    <div className="schedule-list-heading"><h3>{viewMode === "upcoming" ? "Upcoming task log" : `Tasks for ${displayServiceDate(`${date}T00:00:00.000Z`)}`}</h3><span>{entries.length} {entries.length === 1 ? "assignment" : "assignments"}</span></div>
    <div className="roster-table">{entries.map((entry) => {
      const eligible = members.filter((member) => member.subunitId === entry.duty.subunitId && member.isActive !== false);
      return <div className="roster-row" key={entry.id}><div><strong>{entry.duty.name}</strong><small>{viewMode === "upcoming" ? `${displayServiceDate(entry.serviceDate)} · ` : ""}{entry.duty.subunit.name} · {entry.status}{entry.acknowledgedAt ? " · acknowledged" : ""}</small></div>
        <select value={entry.memberId} disabled={entry.status === "published"} onChange={(event) => reassign(entry.id, event.target.value)}>{eligible.map((member) => <option value={member.id} key={member.id}>{member.user?.name}</option>)}</select>
        {entry.status === "published" && <div className="attendance-actions"><button className={entry.attended === true ? "selected" : ""} onClick={() => attendance(entry.id, true)}>Present</button><button className={entry.attended === false ? "selected danger" : ""} onClick={() => attendance(entry.id, false)}>Absent</button></div>}
      </div>;
    })}{!entries.length && <p className="compact-empty">{viewMode === "upcoming" ? "No upcoming assignments yet." : "No assignments for this date."}</p>}</div>
  </section>;
}

export function MemberAssignments({ token }) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [viewMode, setViewMode] = useState("upcoming");
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    const query = viewMode === "upcoming" ? `/rosters?scope=upcoming&from=${today()}` : `/rosters?date=${date}`;
    request(query, token).then((data) => setEntries(data.rosterEntries || [])).catch((error) => toast.error(error.message));
  }, [date, token, toast, viewMode]);
  const acknowledge = async (id) => {
    try { const data = await request(`/rosters/${id}/acknowledge`, token, { method: "POST" }); setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, acknowledgedAt: data.rosterEntry.acknowledgedAt } : entry)); toast.success(data.message); }
    catch (error) { toast.error(error.message); }
  };
  return <section className="panel full-panel workspace-tool"><div className="view-heading"><div><p className="eyebrow">MY SCHEDULE</p><h2>{viewMode === "upcoming" ? "Upcoming assignments" : "Published assignments"}</h2><p>{viewMode === "upcoming" ? "Your published tasks from today onward." : "Viewing your published assignment for a specific service date."}</p></div><div className="member-schedule-filter"><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setViewMode("date"); }} /><button type="button" onClick={() => setViewMode("upcoming")}>Upcoming tasks</button></div></div><div className="roster-table">{entries.map((entry) => <div className="roster-row" key={entry.id}><div><strong>{entry.duty.name}</strong><small>{viewMode === "upcoming" ? `${displayServiceDate(entry.serviceDate)} · ` : ""}{entry.duty.subunit.name}</small></div>{entry.acknowledgedAt ? <span className="status-pill">Acknowledged</span> : <button className="acknowledge-button" onClick={() => acknowledge(entry.id)}>Acknowledge task</button>}</div>)}{!entries.length && <p className="compact-empty">{viewMode === "upcoming" ? "You have no upcoming published assignments." : "No published assignment for this date."}</p>}</div></section>;
}

export function RequestsView({ token, isAdmin, subunits }) {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationPage, setInvitationPage] = useState(1);
  const [invitationPagination, setInvitationPagination] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [target, setTarget] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInvitationIds, setSelectedInvitationIds] = useState([]);
  const [deleteInvitationIds, setDeleteInvitationIds] = useState([]);
  const [isDeletingInvitations, setIsDeletingInvitations] = useState(false);
  const applyInvitations = useCallback((nextInvitations, nextPagination) => {
    if (nextPagination && nextPagination.page > nextPagination.totalPages) {
      setInvitationPage(nextPagination.totalPages);
      return;
    }
    setInvitations(nextInvitations);
    if (nextPagination) setInvitationPagination(nextPagination);
    const visibleIds = new Set(nextInvitations.map((item) => item.id));
    setSelectedInvitationIds((current) => current.filter((id) => visibleIds.has(id)));
  }, []);
  const load = useCallback(async () => {
    try {
      const data = await request("/subunit-switch-requests", token); setRequests(data.requests || []);
      if (isAdmin) { const inviteData = await request(`/invitations?page=${invitationPage}`, token); applyInvitations(inviteData.invitations || [], inviteData.pagination); }
    } catch (error) { toast.error(error.message); }
  }, [token, isAdmin, toast, applyInvitations, invitationPage]);
  useEffect(() => {
    request("/subunit-switch-requests", token)
      .then((data) => setRequests(data.requests || []))
      .catch((error) => toast.error(error.message));
    if (isAdmin) {
      request(`/invitations?page=${invitationPage}`, token)
        .then((data) => applyInvitations(data.invitations || [], data.pagination))
        .catch((error) => toast.error(error.message));
    }
  }, [token, isAdmin, toast, applyInvitations, invitationPage]);
  const reportInvitation = (data) => {
    logInvitationUrl(data.inviteUrl);
    const delivery = data.notification?.data?.result;
    if (data.notification?.status === "not_configured" || data.notification?.code === "not_configured") {
      toast.error("Invitation created, but the production email service is not configured.");
      return;
    }
    if (data.notification?.status === "processed" && ["sent", "already_sent"].includes(delivery?.status)) toast.success("Invitation created and email sent.");
    else if (data.notification?.status === "failed" || delivery?.status === "failed") toast.error(`Invitation created, but the email was not sent: ${delivery?.error || data.notification?.message || "Notification delivery failed"}`);
    else if (delivery?.status === "already_processing") toast.warning("Invitation created and email delivery is still processing. Check the invitation list shortly.");
    else toast.warning("Invitation created, but the email provider returned an unknown delivery status.");
  };
  const submitSwitch = async () => { try { const data = await request("/subunit-switch-requests", token, { method: "POST", body: JSON.stringify({ toSubunitId: target }) }); toast.success(data.message); load(); } catch (error) { toast.error(error.message); } };
  const decide = async (id, status) => { try { await request(`/subunit-switch-requests/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }); toast.success(`Request ${status}.`); load(); } catch (error) { toast.error(error.message); } };
  const invite = async (event) => { event.preventDefault(); try { const data = await request("/invitations", token, { method: "POST", body: JSON.stringify({ email }) }); setEmail(""); reportInvitation(data); if (invitationPage === 1) load(); else setInvitationPage(1); } catch (error) { toast.error(error.message); } };
  const invitationAction = async (id, action) => { try { const data = await request(`/invitations/${id}${action === "resend" ? "/resend" : ""}`, token, { method: action === "revoke" ? "DELETE" : "POST" }); if (action === "resend") { reportInvitation(data); if (invitationPage === 1) load(); else setInvitationPage(1); } else { toast.success(data.message); load(); } } catch (error) { toast.error(error.message); } };
  const toggleInvitation = (id) => setSelectedInvitationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAllInvitations = () => setSelectedInvitationIds((current) => current.length === invitations.length ? [] : invitations.map((item) => item.id));
  const confirmInvitationDelete = (ids) => setDeleteInvitationIds(ids);
  const deleteSelectedInvitations = async () => {
    if (!deleteInvitationIds.length || isDeletingInvitations) return;
    setIsDeletingInvitations(true);
    try {
      const data = await request("/invitations/bulk-delete", token, { method: "POST", body: JSON.stringify({ ids: deleteInvitationIds }) });
      toast.success(data.message);
      setDeleteInvitationIds([]);
      setSelectedInvitationIds((current) => current.filter((id) => !deleteInvitationIds.includes(id)));
      await load();
    } catch (error) { toast.error(error.message); }
    finally { setIsDeletingInvitations(false); }
  };
  return <section className="panel full-panel workspace-tool"><div className="view-heading"><div><p className="eyebrow">REQUESTS</p><h2>{isAdmin ? "Membership requests and invitations" : "Change work unit"}</h2></div></div>
    {!isAdmin && <div className="planner-actions"><select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Choose a new unit</option>{subunits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button disabled={!target} onClick={submitSwitch}>Submit request</button></div>}
    {isAdmin && <form className="inline-tool-form" onSubmit={invite}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Member email" required /><button>Generate invitation</button></form>}
    <h3>Unit switch requests</h3><div className="request-list">{requests.map((item) => <div key={item.id} className="request-row"><div><strong>{item.member?.user?.name || "My request"}</strong><small>{item.fromSubunit.name} → {item.toSubunit.name}</small></div><span className="status-pill">{item.status}</span>{isAdmin && item.status === "pending" && <div><button onClick={() => decide(item.id, "approved")}>Approve</button><button onClick={() => decide(item.id, "rejected")}>Reject</button></div>}</div>)}{!requests.length && <p className="compact-empty">No requests yet.</p>}</div>
    {isAdmin && <><div className="invitation-heading"><h3>Invitations</h3><span>{invitationPagination.totalCount} total</span></div>
      {!!invitations.length && <div className="invitation-bulk-bar">
        <label><input type="checkbox" checked={selectedInvitationIds.length === invitations.length} onChange={toggleAllInvitations} /> Select this page</label>
        <span>{selectedInvitationIds.length} selected</span>
        <button type="button" className="bulk-delete-button" disabled={!selectedInvitationIds.length} onClick={() => confirmInvitationDelete(selectedInvitationIds)}>Delete selected</button>
      </div>}
      <div className="request-list invitation-list">{invitations.map((item) => <div key={item.id} className={`request-row invitation-row${selectedInvitationIds.includes(item.id) ? " selected" : ""}`}>
        <label className="invitation-checkbox"><input type="checkbox" checked={selectedInvitationIds.includes(item.id)} onChange={() => toggleInvitation(item.id)} aria-label={`Select invitation for ${item.email}`} /></label>
        <div className="invitation-identity"><strong>{item.email}</strong><small>Created {new Date(item.createdAt).toLocaleDateString()}</small></div>
        <span className="status-pill">{item.status}</span><small>Expires {new Date(item.expiresAt).toLocaleDateString()}</small>
        <div className="invitation-actions">{item.status === "pending" && <><button onClick={() => invitationAction(item.id, "resend")}>Resend</button><button onClick={() => invitationAction(item.id, "revoke")}>Revoke</button></>}<button className="row-delete-button" onClick={() => confirmInvitationDelete([item.id])}>Delete</button></div>
      </div>)}{!invitations.length && <p className="compact-empty">No invitations yet.</p>}</div>
      {invitationPagination.totalCount > 0 && <nav className="invitation-pagination" aria-label="Invitation pages">
        <button type="button" disabled={invitationPage <= 1} onClick={() => setInvitationPage((page) => page - 1)}>Previous</button>
        <span>Page {invitationPagination.page} of {invitationPagination.totalPages}</span>
        <button type="button" disabled={invitationPage >= invitationPagination.totalPages} onClick={() => setInvitationPage((page) => page + 1)}>Next</button>
      </nav>}
      {!!deleteInvitationIds.length && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingInvitations) setDeleteInvitationIds([]); }}>
        <div className="rename-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-invitations-title" aria-describedby="delete-invitations-description">
          <div className="delete-warning-icon" aria-hidden="true">!</div>
          <div className="rename-modal-header"><div><p className="eyebrow">INVITATION HISTORY</p><h2 id="delete-invitations-title">Delete {deleteInvitationIds.length === 1 ? "this invitation" : `${deleteInvitationIds.length} invitations`}?</h2></div><button type="button" className="modal-close" onClick={() => setDeleteInvitationIds([])} disabled={isDeletingInvitations} aria-label="Close delete dialog">×</button></div>
          <p className="rename-modal-copy" id="delete-invitations-description">This permanently removes the selected invitation records. Any selected pending invitation links will stop working.</p>
          <div className="rename-modal-actions"><button type="button" className="secondary-button" onClick={() => setDeleteInvitationIds([])} disabled={isDeletingInvitations}>Cancel</button><button type="button" className="danger-button" onClick={deleteSelectedInvitations} disabled={isDeletingInvitations}>{isDeletingInvitations ? "Deleting…" : "Delete permanently"}</button></div>
        </div>
      </div>}
    </>}
  </section>;
}

export function PerformanceView({ token, member }) {
  const toast = useToast();
  const [performance, setPerformance] = useState(null);
  useEffect(() => { if (member?.id) request(`/members/${member.id}/performance`, token).then((data) => setPerformance(data.performance)).catch((error) => toast.error(error.message)); }, [member?.id, token, toast]);
  const cards = useMemo(() => performance ? [["Published", performance.totalPublishedAssignments], ["Attended", performance.attended], ["Missed", performance.missed], ["Attendance rate", performance.attendanceRate === null ? "Not available" : `${performance.attendanceRate}%`]] : [], [performance]);
  return <section className="panel full-panel workspace-tool"><div className="view-heading"><div><p className="eyebrow">PERFORMANCE</p><h2>My attendance</h2><p>Unmarked assignments are never counted as absences.</p></div></div><div className="stats-grid">{cards.map(([label, value]) => <article className="stat-card" key={label}><div><p>{label}</p><strong>{value}</strong></div></article>)}</div></section>;
}
