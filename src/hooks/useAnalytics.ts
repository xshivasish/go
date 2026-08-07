import { useState } from "react";
import type { AnalyticsSummary, ClickItem, ClicksResponse } from "../types";
import { apiCall, authHeader, errorMessage } from "../lib/api";
import { emptySummary } from "../constants/misc";

type Notify = { showError: (text: string) => void };

/** Owns the analytics panel for a single link (click history + summary + free-tier limiting). */
export function useAnalytics(token: string | undefined, notify: Notify) {
  const [selectedCode, setSelectedCode] = useState("");
  const [clicks, setClicks] = useState<ClickItem[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>(emptySummary);
  const [analyticsLimited, setAnalyticsLimited] = useState(false);
  const [visibleClickLimit, setVisibleClickLimit] = useState<number | null>(null);
  const [analyticsUpgradeMessage, setAnalyticsUpgradeMessage] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  function closeAnalytics() {
    setSelectedCode("");
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setAnalyticsLimited(false);
    setVisibleClickLimit(null);
    setAnalyticsUpgradeMessage("");
  }

  async function loadClicks(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();
    setSelectedCode(normalizedCode);
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setAnalyticsLimited(false);
    setVisibleClickLimit(null);
    setAnalyticsUpgradeMessage("");
    setAnalyticsLoading(true);

    try {
      const data = (await apiCall(`/links/${normalizedCode}/clicks`, {
        method: "GET",
        headers: authHeader(token),
      })) as ClicksResponse;

      setClicks(data.clicks || []);
      setAnalyticsSummary(data.summary || emptySummary);
      setAnalyticsLimited(Boolean(data.analyticsLimited));
      setVisibleClickLimit(data.visibleClickLimit ?? null);
      setAnalyticsUpgradeMessage(data.upgradeMessage || "");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to load clicks"));
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function forgetDeletedLink(code: string) {
    if (selectedCode.toLowerCase() === code.toLowerCase()) {
      closeAnalytics();
    }
  }

  return {
    selectedCode,
    clicks,
    analyticsSummary,
    analyticsLimited,
    visibleClickLimit,
    analyticsUpgradeMessage,
    analyticsLoading,
    loadClicks,
    closeAnalytics,
    forgetDeletedLink,
  };
}
