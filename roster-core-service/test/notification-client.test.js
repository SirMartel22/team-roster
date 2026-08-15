const test = require("node:test");
const assert = require("node:assert/strict");
const { buildNotificationUrl, notify } = require("../src/services/notificationClient");

test("notification URL joining removes duplicate slashes", () => {
  assert.equal(
    buildNotificationUrl("https://notification.example.com/", "/notify/invitation"),
    "https://notification.example.com/notify/invitation",
  );
});

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

test("notification HTTP errors preserve status and service message", async () => {
  const previousUrl = process.env.NOTIFICATION_SERVICE_URL;
  const previousFetch = global.fetch;
  process.env.NOTIFICATION_SERVICE_URL = "https://notification.example.com/";
  global.fetch = async () => new Response(JSON.stringify({ message: "Invalid service credentials" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
  try {
    const result = await notify("/notify/invitation", {});
    assert.deepEqual(result, {
      status: "failed",
      retryable: false,
      code: "notification_http_error",
      httpStatus: 401,
      message: "Invalid service credentials",
    });
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NOTIFICATION_SERVICE_URL;
    else process.env.NOTIFICATION_SERVICE_URL = previousUrl;
  }
});

test("non-JSON notification errors report the HTTP status", async () => {
  const previousUrl = process.env.NOTIFICATION_SERVICE_URL;
  const previousFetch = global.fetch;
  process.env.NOTIFICATION_SERVICE_URL = "https://notification.example.com";
  global.fetch = async () => new Response("Not Found", { status: 404 });
  try {
    const result = await notify("/notify/invitation", {});
    assert.equal(result.message, "Notification service returned HTTP 404");
    assert.equal(result.httpStatus, 404);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NOTIFICATION_SERVICE_URL;
    else process.env.NOTIFICATION_SERVICE_URL = previousUrl;
  }
});
