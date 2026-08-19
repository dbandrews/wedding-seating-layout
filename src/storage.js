/* ============================================================
   Browser-local persistence.
   Everything the planner lets you change — seats, table positions,
   course defaults and the sheet header — is kept in localStorage so a
   reload picks up exactly where you left off. Nothing leaves the device.
   ============================================================ */

const KEY = "wedding-seating:v1";

export const isStorageAvailable = () => {
  try {
    const probe = "__probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

/* Returns the saved bundle, or null when there is nothing usable stored. */
export const loadSaved = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.seats) return null;
    return data;
  } catch {
    return null;
  }
};

export const save = (state) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const clearSaved = () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
};

/* A saved file can be older than the current table list, so merge rather than
   trust it: keep known tables, drop unknown ones, and repair malformed seats. */
export const mergeSeats = (saved, fallback) => {
  if (!saved || typeof saved !== "object") return fallback;
  const out = {};
  Object.keys(fallback).forEach((id) => {
    const arr = saved[id];
    out[id] = Array.isArray(arr)
      ? arr.map((p) =>
          p && typeof p === "object" && typeof p.name === "string"
            ? {
                id: String(p.id ?? ""),
                name: p.name,
                entree: p.entree || "",
                appetizer: p.appetizer || "",
                dessert: p.dessert || "",
                notes: p.notes || "",
                kids: p.kids || "",
              }
            : null
        )
      : fallback[id];
    if (!out[id].length) out[id] = fallback[id];
  });
  return out;
};

export const mergePos = (saved, fallback) => {
  if (!saved || typeof saved !== "object") return fallback;
  const out = {};
  Object.entries(fallback).forEach(([id, p]) => {
    const s = saved[id];
    out[id] =
      s && Number.isFinite(s.x) && Number.isFinite(s.y) ? { x: s.x, y: s.y } : p;
  });
  return out;
};

/* Guest ids look like "p12"; keep new ones from colliding with restored ones. */
export const highestGuestNumber = (seats) => {
  let max = 0;
  Object.values(seats || {}).forEach((arr) =>
    (arr || []).forEach((p) => {
      const n = p && /^p(\d+)$/.exec(p.id || "");
      if (n) max = Math.max(max, Number(n[1]));
    })
  );
  return max;
};
