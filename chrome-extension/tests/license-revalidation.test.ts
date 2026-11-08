import { beforeEach, describe, expect, test } from "vitest";
import { getLicenseState } from "../license.js";

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

describe("License Cache Revalidation", () => {
  beforeEach(() => {
    delete mockStorage.proLicense;
  });

  describe("getLicenseState", () => {
    test("returns default state when no license stored", async () => {
      const state = await getLicenseState();
      expect(state.valid).toBe(false);
      expect(state.status).toBe("none");
    });

    test("returns stored state when checkedAt is within TTL", async () => {
      const withinTtl = new Date();
      withinTtl.setDate(withinTtl.getDate() - 20);
      mockStorage.proLicense = {
        valid: true,
        licenseKey: "ABC123",
        status: "active",
        checkedAt: withinTtl.toISOString(),
      };
      const state = await getLicenseState();
      expect(state.valid).toBe(true);
      expect(state.status).toBe("active");
    });

    test("returns stale state when checkedAt exceeds TTL", async () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 60);
      mockStorage.proLicense = {
        valid: true,
        licenseKey: "ABC123",
        status: "active",
        checkedAt: expired.toISOString(),
      };
      const state = await getLicenseState();
      expect(state.valid).toBe(false);
      expect(state.status).toBe("stale");
    });

    test("returns stale state when no checkedAt present", async () => {
      mockStorage.proLicense = {
        valid: true,
        licenseKey: "ABC123",
        status: "active",
      };
      const state = await getLicenseState();
      expect(state.valid).toBe(false);
      expect(state.status).toBe("stale");
    });
  });
});
