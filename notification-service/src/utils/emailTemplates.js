const { escapeHtml } = require("./html");

const passwordResetEmail = ({ name, resetUrl }) => `<p>Hi ${escapeHtml(name || "there")},</p><p>We received a request to reset your Rosterly password.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in one hour and can be used only once. If you did not request this, you can ignore this email.</p>`;

module.exports = { passwordResetEmail };
