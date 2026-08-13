const prisma = require("../config/prismaClient");

const recordAudit = async ({ churchId, actorUserId, action, entityType, entityId, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: { churchId, actorUserId, action, entityType, entityId, metadata },
    });
  } catch (error) {
    console.error("Failed to record audit event", { action, entityType, entityId, error: error.message });
  }
};

module.exports = { recordAudit };
