import { useState } from "react";
import { apiCall, authHeader, errorMessage } from "../lib/api";

type Notify = {
  showSuccess: (text: string) => void;
  showError: (text: string) => void;
};

type ConfirmFn = (options: { title: string; description: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;

/** Owns the account-settings actions: change password, change/verify email, delete account. */
export function useAccountActions(
  token: string | undefined,
  accessToken: string | undefined,
  isExternalProviderUser: boolean,
  notify: Notify,
  confirm: ConfirmFn,
  onAccountDeleted: () => Promise<void>
) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState("");

  async function changePassword() {
    if (isExternalProviderUser) {
      notify.showError("Password is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      notify.showError("Please sign in again.");
      return;
    }

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      notify.showError("Please fill all password fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      notify.showError("New passwords do not match.");
      return;
    }

    setAccountActionLoading("password");

    try {
      await apiCall("/account/change-password", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ accessToken, oldPassword, newPassword }),
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      notify.showSuccess("Password changed successfully.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to change password"));
    } finally {
      setAccountActionLoading("");
    }
  }

  async function changeEmail() {
    if (isExternalProviderUser) {
      notify.showError("Email is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      notify.showError("Please sign in again.");
      return;
    }

    if (!newEmail) {
      notify.showError("Please enter a new email.");
      return;
    }

    setAccountActionLoading("email");

    try {
      await apiCall("/account/change-email", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ accessToken, newEmail }),
      });

      notify.showSuccess("Verification code sent to your new email.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to change email"));
    } finally {
      setAccountActionLoading("");
    }
  }

  async function verifyEmailChange() {
    if (isExternalProviderUser) {
      notify.showError("Email is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      notify.showError("Please sign in again.");
      return;
    }

    if (!emailVerificationCode) {
      notify.showError("Please enter the verification code.");
      return;
    }

    setAccountActionLoading("verify-email");

    try {
      await apiCall("/account/verify-email", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ accessToken, code: emailVerificationCode }),
      });

      setNewEmail("");
      setEmailVerificationCode("");
      notify.showSuccess("Email verified. Please sign out and sign in again.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to verify email"));
    } finally {
      setAccountActionLoading("");
    }
  }

  async function deleteAccount() {
    if (!token) {
      notify.showError("Please sign in again.");
      return;
    }

    if (deleteConfirmation !== "DELETE") {
      notify.showError("Type DELETE to confirm account deletion.");
      return;
    }

    const confirmed = await confirm({
      title: "Delete your account?",
      description:
        "This will permanently delete your account, links, analytics, and billing record. This cannot be undone.",
      confirmLabel: "Delete account",
      danger: true,
    });

    if (!confirmed) return;

    setAccountActionLoading("delete");

    try {
      await apiCall("/account", {
        method: "DELETE",
        headers: authHeader(token),
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      await onAccountDeleted();
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to delete account"));
    } finally {
      setAccountActionLoading("");
    }
  }

  return {
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    newEmail,
    setNewEmail,
    emailVerificationCode,
    setEmailVerificationCode,
    deleteConfirmation,
    setDeleteConfirmation,
    accountActionLoading,
    changePassword,
    changeEmail,
    verifyEmailChange,
    deleteAccount,
  };
}
