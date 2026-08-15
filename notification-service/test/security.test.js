const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../src/utils/html");
const { passwordResetEmail } = require("../src/utils/emailTemplates");

test("notification HTML escapes member-controlled content", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});

test("password reset email escapes the recipient name and reset URL", () => {
  const html = passwordResetEmail({
    name: '<img src=x onerror="alert(1)">',
    resetUrl: 'https://example.com/?reset=" onclick="alert(1)',
  });
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /onclick="alert/);
  assert.match(html, /expires in one hour/i);
});
