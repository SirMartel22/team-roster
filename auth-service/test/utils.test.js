const test = require("node:test");
const assert = require("node:assert/strict");
const { toSlug } = require("../src/utils/slug");
const { toUserDto } = require("../src/utils/userDto");

test("workspace names produce stable URL slugs", () => {
  assert.equal(toSlug("  BHBC Media Team  "), "bhbc-media-team");
  assert.equal(toSlug("Grace & Fellowship"), "grace-fellowship");
});

test("user DTO exposes camelCase and excludes password data", () => {
  const dto = toUserDto({ id: "1", church_id: "c1", email: "a@example.com", name: "A", role: "member", password_hash: "secret" });
  assert.deepEqual(dto, { id: "1", churchId: "c1", email: "a@example.com", name: "A", role: "member" });
  assert.equal("password_hash" in dto, false);
});
