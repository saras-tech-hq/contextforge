import { beforeEach, describe, expect, test, vi } from "vitest";
import { activateLicense, getLicenseState, isPro } from "../license.js";

const mockStorage: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: async (key: string | string[]) => {
        const k = Array.isArray(key) ? key[0] : key;
        return { [k]: mockStorage[k] };
      },
      set: async (obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj);
      },
      remove: async (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        keys.forEach((k) => {
          delete mockStorage[k];
        });
      },
    },
  },
} as unknown as typeof chrome;

describe("License Handling", () => {
  beforeEach(() => {
    delete mockStorage.proLicense;
    vi.unstubAllGlobals();
  });

  describe("getLicenseState", () => {
    test("returns default state when no license stored", async () => {
      const state = await getLicenseState();
      expect(state.valid).toBe(false);
      expect(state.licenseKey).toBe("");
      expect(state.status).toBe("none");
      expect(state.checkedAt).toBeNull();
    });

    test("returns stored license state", async () => {
      mockStorage.proLicense = {
        valid: true,
        licenseKey: "ABC123",
        status: "active",
        checkedAt: new Date().toISOString(),
      };
      const state = await getLicenseState();
      expect(state.valid).toBe(true);
      expect(state.licenseKey).toBe("ABC123");
      expect(state.status).toBe("active");
    });
  });

  describe("isPro", () => {
    test("returns false when license is not valid", async () => {
      mockStorage.proLicense = {
        valid: false,
        licenseKey: "",
        status: "invalid",
        checkedAt: new Date().toISOString(),
      };
      expect(await isPro()).toBe(false);
    });

    test("returns true when license is valid", async () => {
      mockStorage.proLicense = {
        valid: true,
        licenseKey: "ABC123",
        status: "active",
        checkedAt: new Date().toISOString(),
      };
      expect(await isPro()).toBe(true);
    });
  });

  describe("activateLicense", () => {
    test("returns invalid state for empty key", async () => {
      const result = await activateLicense("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("returns invalid state for malformed key", async () => {
      const result = await activateLicense("short");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("stores valid license state on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => ({
            ok: true,
            valid: true,
            status: "active",
            instanceId: "inst-1",
            error: null,
          }),
        }))
      );
      const result = await activateLicense("valid-key-12345678");
      expect(typeof result.valid).toBe("boolean");
      expect(result.valid).toBe(true);
      expect(mockStorage.proLicense).toBeDefined();
    });
  });
});
