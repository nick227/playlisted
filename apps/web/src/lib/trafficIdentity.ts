const STORAGE_KEY = "playlisted.traffic.visitorId";

function randomVisitorId() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getTrafficVisitorId() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && /^[a-zA-Z0-9_-]{12,64}$/.test(existing)) {
    return existing;
  }

  const next = randomVisitorId();
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function trafficHeaders() {
  return { "X-Playlisted-Visitor-Id": getTrafficVisitorId() };
}
