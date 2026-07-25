const store = new Map();

function getCached(key, ttlMs) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key, data) {
  store.set(key, { at: Date.now(), data });
}

module.exports = { getCached, setCached };
