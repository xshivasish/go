import type { User } from "oidc-client-ts";

/** Reads the linked social-login provider (e.g. "Google") off a Cognito federated user, if any. */
export function getIdentityProvider(user: User | null | undefined) {
  const profile = user?.profile as Record<string, unknown> | undefined;
  const identitiesValue = profile?.identities;

  if (!identitiesValue) return "";

  try {
    const identities =
      typeof identitiesValue === "string" ? JSON.parse(identitiesValue) : identitiesValue;

    if (Array.isArray(identities) && identities.length > 0) {
      return String(identities[0]?.providerName || "");
    }

    return "";
  } catch {
    return "";
  }
}
