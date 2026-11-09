const STORAGE_KEY = "playlisted.traffic.visitorId";

function randomVisitorId() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

let ephemeralVisitorId: string | null = null;

export function getTrafficVisitorId() {
  let candidate = ephemeralVisitorId;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{12,64}$/.test(existing)) {
      return existing;
    }

    if (!candidate) {
      candidate = randomVisitorId();
    }
    localStorage.setItem(STORAGE_KEY, candidate);
    ephemeralVisitorId = null;
    return candidate;
  } catch {
    if (!candidate) {
      candidate = randomVisitorId();
    }
    ephemeralVisitorId = candidate;
    return candidate;
  }
}

export function trafficHeaders() {
  return { "X-Playlisted-Visitor-Id": getTrafficVisitorId() };
}
