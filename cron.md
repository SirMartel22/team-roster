Can we work on a feature that, the admin will specify the constant date which the team are going to be working and the date won't change except if there is any emergency tasks in between. For example, We know that Sunday Service and Wednesday service is Constant for a Church media team. And so when the time is scheduled, the system will be sending reminder mail 1 day before and 4hours before each tasks day automatically without the interference of the admin.
The goal is to be scheduling at least a month tasks ahead automatically such that the algorithm pick those that have not work recently for each tasks. 
Is this possible based on the current system architecture that we have. the goal is to go full automatic as time goes on, if it's possible, make an implementation plan for that. or might we need an artificial intelligence that will take care of this, let me know so we can configure google gemma 4 for it.
And then, not email alone, I'm envisioning push notification, whatsapp message and sms message, such that whoever doesn't check their mail will see a push notification and whoever doesn't see a push notification will receive whatsapp message and whoever will not check their whatsapp due to internet or bad network will get sms message.
Analyse the system and see what we can do. Make an implementation plan for it.
Don't let your response be too much. Just go straight to the point.




Show less

5:15 PM






Worked for 51s



Yes, it is possible with the current architecture. We need to extend it, not rebuild it.
What is currently missing
Recurring service rules such as every Sunday and Wednesday.
Task start times and organisation timezone.
A background worker/cron process.
Member availability, leave, and scheduling exceptions.
Reminder jobs for 24 hours and 4 hours before service.
Push-notification subscriptions.
WhatsApp/SMS providers and delivery webhooks.
Member acknowledgement of assignments.
The existing fairness algorithm is a good foundation because it already prioritizes members who have not worked recently.
Implementation plan
Recurring schedule configuration
Add database models for service templates:
Name: Sunday Service
Weekday
Start time
Timezone
Active/inactive
Duties included
Automation horizon, initially 30 days

Exceptions and availability
Add:
Emergency or one-off tasks
Cancelled/rescheduled services
Member unavailable dates
Scheduling overrides

Automatic monthly scheduling
Create a daily background worker that:
Generates service dates for the next 30–45 days.
Processes dates chronologically.
Uses assignment history and availability.
Prevents duplicate roster entries.
Optionally auto-publishes or leaves drafts for admin approval.

Automatic reminders
Create reminder jobs when a roster is published:
First reminder: 24 hours before.
Final reminder: 4 hours before.
Idempotency prevents duplicate reminders.
Failed deliveries retry automatically.

Notification escalation
Recommended flow:
Email + push → wait for acknowledgement → WhatsApp → SMS fallback
We should not rely on email-open tracking because it is unreliable. Instead, each message should contain an Acknowledge task button. Unacknowledged assignments progress to WhatsApp and then SMS.

Channel infrastructure
Extend NotificationLog and add:
Push device subscriptions
Notification preferences and consent
Provider message IDs
Delivery/read webhooks
Retry count and next retry time

Admin interface
Add screens for recurring services, emergency tasks, automation settings, exceptions, reminder status, and failed-delivery retry.

Do we need Gemma 4?
No—not for scheduling or reminders. These rules should remain deterministic, testable, and explainable.
Gemma 4 exists and supports reasoning/function calling, but it would only be useful later for features such as interpreting “add an emergency rehearsal next Friday” or explaining scheduling decisions. It should not control the core roster algorithm. Google Gemma 4 documentation
I recommend implementing this in phases: recurring schedules → month-ahead generation → email reminders → acknowledgements → push → WhatsApp → SMS.


5:15 PM








go ahead and implement according to the order of priority of the phases. Recurring schedules - Month ahead generation - email reminder - Acknowledgement. Then we'll move to the rest later






5:31 PM






Worked for 25m 50s



Implemented the first four automation phases.
Admins can create recurring service times such as Sunday 09:00 and Wednesday 18:00.
The system immediately generates at least 35 days of assignments using the existing fairness algorithm.
Schedules can auto-publish, pause, resume, or be deleted.
Manual emergency schedules now include a start time.
Automatic email reminders run 24 hours and 4 hours before assignments.
Failed initial task emails are retried automatically.
Members can acknowledge individual assignments; acknowledgement suppresses later reminders.
Reminder and publication emails remain idempotent, preventing duplicates.
Timezone conversion supports values such as Africa/Lagos.
The database migration was successfully applied, and the configured database is up to date.
Production deployment:
Deploy notification-service.
Deploy roster-core-service.
Deploy the client.
For always-on hosting, the worker runs internally every 15 minutes.
For sleeping/serverless hosting, configure a cron job to run:
npm run automation
Run it every 15 minutes from roster-core-service.
All 48 tests, lint, and production build passed. No AI model is involved in these phases.

Edited 23 files+642-24Review changesUndoReview

client/src/components/WorkspaceTools.jsxclient/src/components/WorkspaceTools.jsx+56-4
client/src/dashboard.cssclient/src/dashboard.css+30-0
notification-service/src/controllers/notificationController.jsnotification-service/src/controllers/notificationController.js+35-1
Show 20 more files




5:57 PM








guide me to configure the cron job






6:10 PM






Worked for 1m 8s



Configure the Render cron job
Push and deploy the latest code first.

Open Render Dashboard → New → Cron Job.

Configure:

Name: rosterly-schedule-automation
Repository: your Rosterly repository
Branch: your production branch
Root Directory: roster-core-service
Runtime: Node
Build Command: npm ci
Command: npm run automation
Schedule: */15 * * * *
*/15 * * * * runs every 15 minutes. Render cron schedules use UTC, though timezone doesn’t affect a 15-minute interval. Render Cron Jobs documentation
Add these environment variables to the cron job:
NODE_ENV=production
DATABASE_URL=<same value used by roster-core-service>
NOTIFICATION_SERVICE_URL=https://team-roster-notification-service.onrender.com
NOTIFICATION_SERVICE_KEY=<same value used by both services>
CLIENT_URL=https://team-roster-front-end.vercel.app
An environment group can safely share these values between services. Render environment variables
On the existing roster-core web service, set:
AUTOMATION_ENABLED=false
This makes the Render cron job the only production scheduler.
Create the cron job, open its Runs page, and click Trigger Run.
A successful run should log:
Schedule automation cycle completed
In Rosterly, create Sunday and Wednesday recurring schedules. The next cron run will maintain the rolling schedule and process reminders automatically.
If you don’t configure Root Directory, use:
Build Command: npm --prefix roster-core-service ci
Command: npm --prefix roster-core-service run automation
Render recommends a root directory for individual services inside monorepos. Render monorepo documentation