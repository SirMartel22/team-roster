const toUserDto = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  churchId: user.church_id ?? user.churchId,
});

module.exports = { toUserDto };
