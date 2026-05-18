import { WebStorageStateStore } from "oidc-client-ts";

export const cognitoAuthConfig = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
  response_type: "code",
  scope: "email openid phone aws.cognito.signin.user.admin",
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, "/");
  },
};

export function buildLogoutUrl() {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI;

  return `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
    logoutUri
  )}`;
}