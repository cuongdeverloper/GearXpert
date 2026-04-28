/**
 * Log có cấu trúc cho luồng bồi thường / admin duyệt / confirmReturn (grep: COMPENSATION_AUDIT).
 * Chỉ dùng server-side; không ghi PII ngoài id.
 */
function compensationAuditLog(event, payload = {}) {
  const line = {
    tag: "COMPENSATION_AUDIT",
    event,
    ts: new Date().toISOString(),
    ...payload,
  };
  try {
    console.log("[COMPENSATION_AUDIT]", JSON.stringify(line));
  } catch {
    console.log("[COMPENSATION_AUDIT]", event, payload);
  }
}

module.exports = { compensationAuditLog };
