// Shape shared by:
//   - audit log entries (`log.user.tai_khoan` / `log.user.ho_ten` consumed by FE)
//   - created_by / approved_by / rejected_by snapshot fields on phieu/đơn hàng
//   - socket.io notifications (`updated_by` / `deleted_by` / `approved_by`)
//
// Centralized so a single field rename propagates through every audit + notification
// consumer without a silent breakage.

/**
 * Extract the audit-identity snapshot from an Express request populated by verifyToken.
 * Returns `{ tai_khoan, ho_ten }` — both may be `undefined` for unauthenticated paths,
 * which is intentional (the caller decides whether to throw).
 *
 * @param {import('express').Request} req
 * @returns {{ tai_khoan?: string, ho_ten?: string }}
 */
export const performedByOf = (req) => ({
  tai_khoan: req?.user?.tai_khoan,
  ho_ten:    req?.user?.ho_ten,
});
