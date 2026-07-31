const STORAGE_KEY = 'snapbooth_anonymous_id';

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to non-crypto fallback
  }
  return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}
