import { useState } from "react";
import { textApiCall, authHeader, errorMessage } from "../lib/api";

type Notify = { showError: (text: string) => void };

/** Owns the QR-code panel for a single link: fetch as SVG text, and download-as-file. */
export function useQrCode(token: string | undefined, notify: Notify) {
  const [qrCode, setQrCode] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  function closeQr() {
    setQrCode("");
    setQrSvg("");
  }

  async function loadQrCode(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();
    setQrCode(normalizedCode);
    setQrSvg("");
    setQrLoading(true);

    try {
      const svg = await textApiCall(`/links/${normalizedCode}/qr`, {
        method: "GET",
        headers: authHeader(token),
      });

      setQrSvg(svg);
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to load QR code"));
    } finally {
      setQrLoading(false);
    }
  }

  function downloadQrSvg() {
    if (!qrSvg || !qrCode) return;

    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `go-${qrCode}-qr.svg`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function forgetDeletedLink(code: string) {
    if (qrCode.toLowerCase() === code.toLowerCase()) {
      closeQr();
    }
  }

  return { qrCode, qrSvg, qrLoading, loadQrCode, closeQr, downloadQrSvg, forgetDeletedLink };
}
