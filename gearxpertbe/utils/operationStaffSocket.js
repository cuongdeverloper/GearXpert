/**
 * Broadcast tới room Socket.IO `operation_staff` (staff join từ FE).
 * Khởi tạo qua init(io) trong server.js (sau khi tạo io).
 */

const ROOM = "operation_staff";

let ioRef = null;

function init(io) {
  ioRef = io;
}

function emitOperationStaffUpdate(payload = {}) {
  if (!ioRef) return;
  try {
    ioRef.to(ROOM).emit("operationStaffUpdate", {
      at: new Date().toISOString(),
      ...payload,
    });
  } catch (e) {
    console.error("[operationStaffSocket] emit failed:", e.message);
  }
}

module.exports = {
  init,
  emitOperationStaffUpdate,
  OPERATION_STAFF_SOCKET_ROOM: ROOM,
};
