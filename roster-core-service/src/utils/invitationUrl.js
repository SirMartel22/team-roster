const buildInvitationUrl = (
  token,
  clientUrl = process.env.CLIENT_URL,
  environment = process.env.NODE_ENV,
) => {
  if (!clientUrl?.trim()) {
    const error = new Error("CLIENT_URL is not configured");
    error.code = "CLIENT_URL_NOT_CONFIGURED";
    throw error;
  }

  const url = new URL(clientUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error("CLIENT_URL must use HTTP or HTTPS");
    error.code = "CLIENT_URL_INVALID";
    throw error;
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (environment === "production" && localHosts.has(url.hostname)) {
    const error = new Error("CLIENT_URL cannot point to localhost in production");
    error.code = "CLIENT_URL_LOCALHOST";
    throw error;
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/join`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("invite", token);
  return url.toString();
};

module.exports = { buildInvitationUrl };
