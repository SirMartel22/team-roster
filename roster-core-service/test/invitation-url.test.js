const test = require("node:test");
const assert = require("node:assert/strict");
const { buildInvitationUrl } = require("../src/utils/invitationUrl");

test("invitation URL uses the configured client origin", () => {
  assert.equal(
    buildInvitationUrl("secret-token", "https://team-roster-front-end.vercel.app"),
    "https://team-roster-front-end.vercel.app/join?invite=secret-token",
  );
});

test("invitation URL refuses to fall back to localhost when CLIENT_URL is missing", () => {
  assert.throws(() => buildInvitationUrl("secret-token", ""), { code: "CLIENT_URL_NOT_CONFIGURED" });
});

test("invitation URL rejects localhost in production", () => {
  assert.throws(
    () => buildInvitationUrl("secret-token", "http://localhost:5173", "production"),
    { code: "CLIENT_URL_LOCALHOST" },
  );
});
