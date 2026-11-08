import { LICENSE_API_URL } from "./config.js";

const STORAGE_KEY = "proLicense";
const REVALIDATION_TTL_DAYS = 30;

function isStale(checkedAt) {
  if (!checkedAt) return true;
  const checked = new Date(checkedAt).getTime();
  if (Number.isNaN(checked)) return true;
  return Date.now() - checked > REVALIDATION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export async function getLicenseState() {
  const { [STORAGE_KEY]: state } = await chrome.storage.local.get(STORAGE_KEY);
  if (!state) {
    return { valid: false, licenseKey: "", status: "none", checkedAt: null };
  }
  if (isStale(state.checkedAt)) {
    return {
      valid: false,
      licenseKey: state.licenseKey,
      status: "stale",
      checkedAt: state.checkedAt,
    };
  }
  return state;
}

export async function isPro() {
  const s = await getLicenseState();
  return Boolean(s.valid);
}

export async function activateLicense(licenseKey) {
  const key = String(licenseKey || "").trim();
  if (key.length < 8 || key.length > 256) {
    const state = {
      valid: false,
      licenseKey: "",
      status: "invalid",
      instanceId: null,
      checkedAt: new Date().toISOString(),
      error: "Invalid license key",
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return state;
  }

  try {
    const res = await fetch(`${LICENSE_API_URL.replace(/\/$/, "")}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key, instanceName: "ContextForge" }),
    });
    const data = await res.json().catch(() => ({}));
    const valid = Boolean(data.ok && data.valid);
    const state = {
      valid,
      licenseKey: valid ? key : "",
      status: data.status || (valid ? "active" : "invalid"),
      instanceId: data.instanceId || null,
      checkedAt: new Date().toISOString(),
      error: data.error || (res.ok ? null : "License check failed"),
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return state;
  } catch (err) {
    const state = {
      valid: false,
      licenseKey: "",
      status: "invalid",
      instanceId: null,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return state;
  }
}

export async function clearLicense() {
  await chrome.storage.local.remove(STORAGE_KEY);
}
