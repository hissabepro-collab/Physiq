// Authentification très simple : un seul mot de passe partagé (site perso,
// mono-utilisateur), session matérialisée par un cookie signé (HMAC-SHA256
// via Web Crypto, compatible aussi bien en runtime Node qu'Edge).

const SESSION_COOKIE = "physiq_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret) {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(expiry))
  );
  return `${expiry}.${toHex(signature)}`;
}

export async function isValidSessionToken(token, secret) {
  if (!token || !token.includes(".")) return false;
  const [expiryStr, signatureHex] = token.split(".");
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  const key = await getKey(secret);
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(expiryStr)
  );
  return toHex(expected) === signatureHex;
}

export { SESSION_COOKIE };
