const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../src/utils/html");

test("notification HTML escapes member-controlled content", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});
