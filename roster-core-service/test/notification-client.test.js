const test = require("node:test");
const assert = require("node:assert/strict");
const { notify } = require("../src/services/notificationClient");

test("missing notification service configuration is reported as a delivery failure", async () => {
  const previous = process.env.NOTIFICATION_SERVICE_URL;
  delete process.env.NOTIFICATION_SERVICE_URL;
  try {
    const result = await notify("/notify/invitation", {});
    assert.deepEqual(result, {
      status: "failed",
      retryable: false,
      code: "not_configured",
      message: "Notification service is not configured",
    });
  } finally {
    if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_URL;
    else process.env.NOTIFICATION_SERVICE_URL = previous;
  }
});
