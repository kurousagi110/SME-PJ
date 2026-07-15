// Shared utility: escape user-supplied strings before passing them to MongoDB
// $regex / new RegExp(). Without this, an attacker can submit a query like
//   ?q=.*.*.*.*.*(a+)+$
// and either freeze the mongod event loop (ReDoS) or trigger a full collection
// scan (regex injection / $where bypass). The escape is the standard
// regex-meta-character escape used across the JS ecosystem.

/**
 * Escape all regex metacharacters in a string so it can be safely embedded
 * inside a MongoDB $regex query (or new RegExp(...)).
 *
 * @param {unknown} s — the user-supplied search term (coerced to string)
 * @returns {string}  — the escaped, regex-safe string
 */
export function escapeRegex(s) {
  return String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default escapeRegex;