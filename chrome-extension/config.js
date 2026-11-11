/**
 * License API URL used only if the user clicks Activate.
 * The Free-tier manifest has no host_permissions, so this fetch fails closed
 * until Pro is enabled and a real origin is allowlisted.
 */
export const LICENSE_API_URL = "https://contextforge-license.example.workers.dev";
