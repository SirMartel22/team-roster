const { Resend } = require("resend");
const supabase = require("../config/supabaseClient");
const { escapeHtml } = require("../utils/html");
const { passwordResetEmail } = require("../utils/emailTemplates");
const { summarizeResults } = require("../utils/deliverySummary");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendLoggedEmail = async ({ churchId, rosterId = null, recipient, eventType, idempotencyKey, subject, html }) => {
  const { data: existing } = await supabase.from("notifications_logs").select("id, status").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing?.status === "sent") return { status: "already_sent" };
  if (existing?.status === "pending") return { status: "already_processing" };

  const logPayload = { church_id: churchId, roster_id: rosterId, channel: "email", status: "pending", idempotency_key: idempotencyKey, error_message: null, recipient, event_type: eventType };
  if (existing) {
    const { data: claimed, error } = await supabase.from("notifications_logs").update(logPayload).eq("id", existing.id).eq("status", "failed").select("id").maybeSingle();
    if (error || !claimed) return { status: "already_processing" };
  } else {
    const { error } = await supabase.from("notifications_logs").insert(logPayload);
    if (error?.code === "23505") return { status: "already_processing" };
    if (error) return { status: "failed", error: "Could not create delivery log" };
  }

  try {
    const sendResult = await resend.emails.send({ from: process.env.NOTIFICATION_FROM || "Rosterly <onboarding@resend.dev>", to: recipient, subject, html });
    if (sendResult.error) throw new Error(sendResult.error.message || "Email provider rejected the request");
    await supabase.from("notifications_logs").update({ status: "sent", sent_at: new Date().toISOString(), error_message: null }).eq("idempotency_key", idempotencyKey);
    return { status: "sent" };
  } catch (error) {
    console.error(`Failed to notify ${recipient}`, error);
    await supabase.from("notifications_logs").update({ status: "failed", error_message: error.message }).eq("idempotency_key", idempotencyKey);
    return { status: "failed", error: error.message };
  }
};

const notifyRosterPublished = async (req, res) => {
  const { churchId, serviceDate, assignments } = req.body;
  if (!churchId || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate || "") || !Array.isArray(assignments)) return res.status(400).json({ message: "churchId, a YYYY-MM-DD serviceDate, and assignments are required" });
  const results = [];
  for (const { rosterId, dutyName, memberName, memberEmail, subunitName } of assignments) {
    if (!rosterId || !memberEmail) {
      results.push({ rosterId, memberEmail, status: "failed", error: "Invalid assignment payload" });
      continue;
    }
    const result = await sendLoggedEmail({
      churchId, rosterId, recipient: memberEmail, eventType: "roster-published", idempotencyKey: `${rosterId}:email`,
      subject: `You're scheduled: ${dutyName} on ${serviceDate}`,
      html: `<p>Hi ${escapeHtml(memberName)},</p><p>You've been scheduled for <strong>${escapeHtml(dutyName)}</strong> (${escapeHtml(subunitName)}) on <strong>${escapeHtml(serviceDate)}</strong>.</p><p>See you there!</p>`,
    });
    results.push({ rosterId, memberEmail, ...result });
  }
  const summary = summarizeResults(results);
  return res.json({ message: `Processed ${assignments.length} task emails`, summary, results });
};

const notifyInvitation = async (req, res) => {
  const { churchId, invitationId, email, inviteUrl } = req.body;
  if (!churchId || !invitationId || !email || !inviteUrl) return res.status(400).json({ message: "Invalid invitation notification" });
  const result = await sendLoggedEmail({
    churchId, recipient: email, eventType: "invitation", idempotencyKey: `invitation:${invitationId}:${email}`,
    subject: "You're invited to join a Rosterly workspace",
    html: `<p>You've been invited to join a team workspace.</p><p><a href="${escapeHtml(inviteUrl)}">Accept your invitation</a></p><p>This link expires in seven days.</p>`,
  });
  return res.json({ message: "Invitation notification processed", result });
};

const notifySwitchRequest = async (req, res) => {
  const { churchId, requestId, event, recipients, memberName, subunitName } = req.body;
  if (!churchId || !requestId || !event || !Array.isArray(recipients)) return res.status(400).json({ message: "Invalid switch notification" });
  const results = await Promise.all(recipients.map(({ email, name }) => sendLoggedEmail({
    churchId, recipient: email, eventType: `switch-request-${event}`, idempotencyKey: `switch:${requestId}:${event}:${email}`,
    subject: event === "created" ? "New work-unit switch request" : `Your work-unit request was ${event}`,
    html: event === "created"
      ? `<p>Hi ${escapeHtml(name)},</p><p>${escapeHtml(memberName)} submitted a work-unit switch request. Open Rosterly to review it.</p>`
      : `<p>Hi ${escapeHtml(memberName)},</p><p>Your work-unit switch request was <strong>${escapeHtml(event)}</strong>${subunitName ? ` for ${escapeHtml(subunitName)}` : ""}.</p>`,
  })));
  return res.json({ message: "Switch notifications processed", results });
};

const notifyPasswordReset = async (req, res) => {
  const { churchId, resetRequestId, email, name, resetUrl } = req.body;
  if (!churchId || !resetRequestId || !email || !resetUrl) {
    return res.status(400).json({ message: "Invalid password reset notification" });
  }
  const result = await sendLoggedEmail({
    churchId,
    recipient: email,
    eventType: "password-reset",
    idempotencyKey: `password-reset:${resetRequestId}`,
    subject: "Reset your Rosterly password",
    html: passwordResetEmail({ name, resetUrl }),
  });
  return res.json({ message: "Password reset notification processed", result });
};

const notifyTaskReminders = async (req, res) => {
  const { reminderHours, taskUrl, assignments } = req.body;
  if (![4, 24].includes(reminderHours) || !Array.isArray(assignments)) {
    return res.status(400).json({ message: "A 4-hour or 24-hour reminder and assignments are required" });
  }
  const results = [];
  for (const assignment of assignments) {
    const { churchId, rosterId, dutyName, subunitName, memberName, memberEmail, serviceStartsAt, timezone } = assignment;
    if (!churchId || !rosterId || !memberEmail || !serviceStartsAt) {
      results.push({ rosterId, status: "failed", error: "Invalid reminder payload" });
      continue;
    }
    const action = taskUrl ? `<p><a href="${escapeHtml(taskUrl)}">Open Rosterly and acknowledge this task</a></p>` : "";
    let formattedStart;
    try {
      formattedStart = new Intl.DateTimeFormat("en-NG", { timeZone: timezone || "UTC", dateStyle: "full", timeStyle: "short" }).format(new Date(serviceStartsAt));
    } catch {
      formattedStart = new Date(serviceStartsAt).toUTCString();
    }
    const result = await sendLoggedEmail({
      churchId,
      rosterId,
      recipient: memberEmail,
      eventType: `task-reminder-${reminderHours}h`,
      idempotencyKey: `${rosterId}:reminder:${reminderHours}:email`,
      subject: `${reminderHours === 24 ? "Tomorrow" : "Starting soon"}: ${dutyName}`,
      html: `<p>Hi ${escapeHtml(memberName)},</p><p>This is your ${reminderHours}-hour reminder for <strong>${escapeHtml(dutyName)}</strong> (${escapeHtml(subunitName)}) at <strong>${escapeHtml(formattedStart)}</strong>.</p>${action}`,
    });
    results.push({ rosterId, memberEmail, ...result });
  }
  const summary = summarizeResults(results);
  return res.json({ message: `Processed ${assignments.length} task reminders`, summary, results });
};

module.exports = { notifyRosterPublished, notifyInvitation, notifySwitchRequest, notifyPasswordReset, notifyTaskReminders, sendLoggedEmail };
