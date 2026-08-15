const { notify } = require("./notificationClient");

const taskAssignments = (entries) => entries.map((entry) => ({
  rosterId: entry.id,
  dutyName: entry.duty.name,
  subunitName: entry.duty.subunit.name,
  memberName: entry.member.user.name,
  memberEmail: entry.member.user.email,
}));

const notifyPublishedAssignments = (churchId, serviceDate, entries) => notify("/notify/roster-published", {
  churchId,
  serviceDate,
  assignments: taskAssignments(entries),
});

module.exports = { notifyPublishedAssignments, taskAssignments };
