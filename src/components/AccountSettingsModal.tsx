import { ExternalLink } from "lucide-react";
import { Modal } from "./Modal";

type AccountSettingsModalProps = {
  onClose: () => void;
  userEmail?: string;
  userSub?: string;
  identityProvider: string;
  isGoogleUser: boolean;
  isExternalProviderUser: boolean;

  oldPassword: string;
  setOldPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (value: string) => void;
  changePassword: () => void;

  newEmail: string;
  setNewEmail: (value: string) => void;
  emailVerificationCode: string;
  setEmailVerificationCode: (value: string) => void;
  changeEmail: () => void;
  verifyEmailChange: () => void;

  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  deleteAccount: () => void;

  accountActionLoading: string;
};

export function AccountSettingsModal({
  onClose,
  userEmail,
  userSub,
  identityProvider,
  isGoogleUser,
  isExternalProviderUser,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  changePassword,
  newEmail,
  setNewEmail,
  emailVerificationCode,
  setEmailVerificationCode,
  changeEmail,
  verifyEmailChange,
  deleteConfirmation,
  setDeleteConfirmation,
  deleteAccount,
  accountActionLoading,
}: AccountSettingsModalProps) {
  return (
    <Modal onClose={onClose} panelClassName="accountSettingsPanel" ariaLabel="Account settings">
      <div className="dashboardHeader">
        <div>
          <p className="sectionKicker">Account</p>
          <h2>Account settings</h2>
          <p className="helperText">Manage your login, email, password, and account deletion.</p>
        </div>
      </div>

      <div className="accountSettingsGrid">
        <article className="settingsCard">
          <h3>Profile</h3>
          <p>Signed in as</p>
          <strong>{userEmail || "Unknown email"}</strong>
          <span>{userSub}</span>

          {identityProvider && (
            <p>
              Login provider: <strong>{identityProvider}</strong>
            </p>
          )}
        </article>

        {isExternalProviderUser ? (
          <article className="settingsCard">
            <h3>{isGoogleUser ? "Google account" : "Social login account"}</h3>
            <p>
              You signed in with {identityProvider}. Your password and email are managed by{" "}
              {identityProvider}, not Go.
            </p>
            <p>
              You can still delete your Go account below. Deleting your Go account will remove
              your Go links, analytics, and billing record, but it will not delete your{" "}
              {identityProvider} account.
            </p>

            {isGoogleUser && (
              <a
                className="outlineButton anchorButton"
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
              >
                Open Google security settings
                <ExternalLink size={14} strokeWidth={2.25} />
              </a>
            )}
          </article>
        ) : (
          <>
            <article className="settingsCard">
              <h3>Change password</h3>
              <p>Password changes are available for email/password accounts.</p>

              <input
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                placeholder="Current password"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Confirm new password"
              />

              <button className="primaryButton" disabled={accountActionLoading === "password"} onClick={changePassword}>
                {accountActionLoading === "password" ? "Updating..." : "Change password"}
              </button>
            </article>

            <article className="settingsCard">
              <h3>Change email</h3>
              <p>Enter a new email. Cognito will send a verification code before the change is completed.</p>

              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="New email address"
              />

              <button className="outlineButton" disabled={accountActionLoading === "email"} onClick={changeEmail}>
                {accountActionLoading === "email" ? "Sending..." : "Send verification code"}
              </button>

              <input
                value={emailVerificationCode}
                onChange={(event) => setEmailVerificationCode(event.target.value)}
                placeholder="Verification code"
              />

              <button
                className="primaryButton"
                disabled={accountActionLoading === "verify-email"}
                onClick={verifyEmailChange}
              >
                {accountActionLoading === "verify-email" ? "Verifying..." : "Verify email"}
              </button>
            </article>
          </>
        )}

        <article className="settingsCard dangerSettingsCard">
          <h3>Delete account</h3>
          <p>
            This permanently deletes your Go account, links, click history, and billing record.
            This action cannot be undone.
          </p>

          {isExternalProviderUser && (
            <p>
              This will not delete your {identityProvider} account. It only deletes your Go by
              17Bytes account data.
            </p>
          )}

          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="Type DELETE to confirm"
          />

          <button className="dangerButton" disabled={accountActionLoading === "delete"} onClick={deleteAccount}>
            {accountActionLoading === "delete" ? "Deleting..." : "Delete account"}
          </button>
        </article>
      </div>
    </Modal>
  );
}
