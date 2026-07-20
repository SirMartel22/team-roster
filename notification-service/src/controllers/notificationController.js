const { Resend } = require("resend");

const supabase = require("../config/supabaseClient");

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /notify/roster-published
// Called by roster-core-service after publishing a roster for a date.
// Expects: { churchId, serviceDate, assignments: [{ rosterId, dutyName, memberName, memberEmail, subunitName }] }

const notifyRosterPublished = async (req, res) => {
  const { churchId, serviceDate, assignments } = req.body;

  if (!churchId || !serviceDate || !Array.isArray(assignments)) {
    return res.status(400).json({
      message: "churchId, serviceDate, and assignments array are required",
    });
  }

  // We process each assignment independently — one failed email shouldn't
  // block the others from sending. Using Promise.allSettled (not Promise.all)
  // specifically because it waits for EVERY promise to finish, success or
  // failure, rather than stopping at the first rejection.

  const results = await Promise.allSettled(
    assignments.map(async (assignment) => {
      const { rosterId, dutyName, memberName, memberEmail, subunitName } =
        assignment;

      try {
        //Send the actual email via Resend.

        await resend.emails.send({
          from: "BHBC Media Roster <onboarding@resend.dev>",
          to: memberEmail,
          subject: `You're scheduled: ${dutyName} on ${serviceDate}`,
          html: `
                        <p>Hi ${memberName}, </p>
                        <p> You've been scheduled for <strong>${dutyName}</strong>
                            (${subunitName}) on <strong>${serviceDate}</strong>.
                            <p>See you there!</p>
                        </p>
                    `,
        });

        //Log the successful send.
        const { error: logError } = await supabase
          .from("notifications_logs")
          .insert({
            church_id: churchId,
            roster_id: rosterId,
            channel: "email",
            status: "sent",
            sent_at: new Date().toISOString(),
          });

        if (logError) {
          // The email might have genuinely sent, but we couldn't LOG it.
          // Surface this clearly rather than silently reporting "sent".
          console.error(
            `Failed to log notification for ${memberEmail}:`,
            logError,
          );
          return {
            rosterId,
            status: "sent_but_log_failed",
            logError: logError.message,
          };
        }

        return { rosterId, status: "sent" };
      } catch (error) {
        console.error(`Failed to notify ${memberEmail}:`, error);

        // Log the failed attempt too — this is exactly why notification_logs
        // exists: so "did they get notified?" has a real, queryable answer,
        // not just silence when something goes wrong.

        const { error: logError } = await supabase
          .from("notifications_logs")
          .insert({
            church_id: churchId,
            roster_id: rosterId,
            channel: "email",
            status: "failed",
          });

        if (logError) {
          console.error(`Failed to log failure for ${memberEmail}:`, logError);
        }

        return { rosterId, status: "failed", error: error.message };
      }
    }),
  );

  res.status(200).json({
    message: `Processed ${assignments.length} notifications`,
    results: results.map((r) => r.value || r.reason),
  });
};

module.exports = { notifyRosterPublished };
