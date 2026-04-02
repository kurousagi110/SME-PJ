// Phase 2: 2026-04-02 | Performance – centralized MongoDB index helpers
// Shared by all DAOs to avoid copy-paste of ensureNormalIndex / ensureTextIndex

/**
 * Create a normal (non-text) index only if it does not already exist.
 * Skips silently when the key matches an existing index (idempotent startup).
 */
export async function ensureNormalIndex(col, keySpec, options = {}) {
  const tag = options.name || col.collectionName;
  const indexes = await col.indexes();
  const existed = indexes.find((i) => _sameKey(i.key, keySpec));
  if (existed) {
    const wantUnique = !!options.unique;
    const haveUnique = !!existed.unique;
    if (wantUnique !== haveUnique) {
      console.warn(`[${tag}] Index key exists but unique mismatch — skip. Set REBUILD_INDEXES=true to drop & recreate.`);
    }
    return;
  }
  await col.createIndex(keySpec, options);
}

/**
 * Create a text index, respecting the MongoDB constraint of 1 text index per collection.
 * - If no text index exists → create.
 * - If text index exists with same weights + language → skip (idempotent).
 * - If different → warn. Set REBUILD_TEXT_INDEX=true to drop & recreate.
 */
export async function ensureTextIndex(col, keySpec, options = {}) {
  const tag = options.name || col.collectionName;
  const rebuild = String(process.env.REBUILD_TEXT_INDEX || "").toLowerCase() === "true";
  const indexes = await col.indexes();

  const desiredWeights = options.weights || _weightsFromKeySpec(keySpec);
  const desiredLang = options.default_language || "none";

  const existing = indexes.find(_isTextIndex);

  if (!existing) {
    await col.createIndex(keySpec, {
      ...options,
      name: options.name || "search_text",
      default_language: desiredLang,
    });
    return;
  }

  const weightsMatch = JSON.stringify(existing.weights || {}) === JSON.stringify(desiredWeights);
  const langMatch = (existing.default_language || "english") === desiredLang;
  if (weightsMatch && langMatch) return;

  if (!rebuild) {
    console.warn(
      `[${tag}] Text index '${existing.name}' already exists with different config — skip. ` +
      `Set REBUILD_TEXT_INDEX=true to drop & recreate.`
    );
    return;
  }

  try {
    await col.dropIndex(existing.name);
    console.log(`[${tag}] Dropped old text index: ${existing.name}`);
  } catch (e) {
    console.warn(`[${tag}] dropIndex failed: ${e?.message || e}`);
  }

  await col.createIndex(keySpec, {
    ...options,
    name: options.name || "search_text",
    default_language: desiredLang,
  });
  console.log(`[${tag}] Created text index: ${options.name || "search_text"}`);
}

function _sameKey(a = {}, b = {}) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function _isTextIndex(idx) {
  return !!idx?.key?._fts || Object.values(idx?.key || {}).includes("text");
}

function _weightsFromKeySpec(keySpec = {}) {
  const w = {};
  for (const k of Object.keys(keySpec)) {
    if (keySpec[k] === "text") w[k] = 1;
  }
  return w;
}
