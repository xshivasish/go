import { useState } from "react";
import type { ShortenResponse } from "../types";
import { apiCall, errorMessage } from "../lib/api";

type Notify = {
  showSuccess: (text: string) => void;
  showError: (text: string) => void;
};

/** The no-account-required "shorten a link" box shown to signed-out visitors. */
export function useGuestShorten(notify: Notify, onCreated: (link: ShortenResponse) => void) {
  const [guestUrl, setGuestUrl] = useState("");
  const [guestExpiresIn, setGuestExpiresIn] = useState("24h");
  const [loading, setLoading] = useState(false);

  async function createTemporaryLink() {
    setLoading(true);

    try {
      const data = (await apiCall("/shorten", {
        method: "POST",
        body: JSON.stringify({ url: guestUrl, expiresIn: guestExpiresIn }),
      })) as ShortenResponse;

      onCreated(data);
      setGuestUrl("");
      notify.showSuccess("Temporary link created.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to create link"));
    } finally {
      setLoading(false);
    }
  }

  return {
    guestUrl,
    setGuestUrl,
    guestExpiresIn,
    setGuestExpiresIn,
    loading,
    createTemporaryLink,
  };
}
