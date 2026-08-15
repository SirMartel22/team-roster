const buildNotificationUrl = (baseUrl, path) =>
  `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const notify = async (path, payload) => {
  if (!process.env.NOTIFICATION_SERVICE_URL) {
    return { status: "failed", retryable: false, code: "not_configured", message: "Notification service is not configured" };
  }
  try {
    const response = await fetch(buildNotificationUrl(process.env.NOTIFICATION_SERVICE_URL, path), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Key": process.env.NOTIFICATION_SERVICE_KEY || "" },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();
    let data = {};
    try {
      data = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      data = {};
    }
    if (response.ok) return { status: "processed", data };

    const message = data.message || `Notification service returned HTTP ${response.status}`;
    console.error("Notification service request failed", { path, status: response.status, message });
    return {
      status: "failed",
      retryable: response.status === 429 || response.status >= 500,
      code: "notification_http_error",
      httpStatus: response.status,
      message,
    };
  } catch (error) {
    console.error("Notification service request could not be completed", { path, message: error.message });
    return { status: "failed", retryable: true, code: "notification_network_error", message: error.message };
  }
};

module.exports = { buildNotificationUrl, notify };
