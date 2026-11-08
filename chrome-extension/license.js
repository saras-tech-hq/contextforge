import { LICENSE_API_URL } from "./config.js";

const STORAGE_KEY = "proLicense";

export async function getLicenseState() {
  const { [STORAGE_KEY]: state } = await chrome.storage.local.get(STORAGE_KEY);
  return (
    state || {
      valid: false,
      licenseKey: "",
      status: "none",
      checkedAt: null,
    }
  );
}

export async function isPro() {
  const s = await getLicenseState();
  return Boolean(s.valid);
}

export async function activateLicense(licenseKey) {
  const key = String(licenseKey || "").trim();
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
}

export async function clearLicense() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

