const notify = async (path, payload) => {
  if (!process.env.NOTIFICATION_SERVICE_URL) {
    return { status: "failed", retryable: false, code: "not_configured", message: "Notification service is not configured" };
  }
  try {
    const response = await fetch(`${process.env.NOTIFICATION_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Key": process.env.NOTIFICATION_SERVICE_KEY || "" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { status: "processed", data } : { status: "failed", retryable: true, message: data.message || "Notification request failed" };
  } catch (error) {
    return { status: "failed", retryable: true, message: error.message };
  }
};

module.exports = { notify };
