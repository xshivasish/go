import type { AnalyticsSummary } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const PENDING_PLAN_KEY = "go-pending-plan";
export const THEME_STORAGE_KEY = "go-theme";

export const emptySummary: AnalyticsSummary = {
  totalClicks: 0,
  uniqueVisitors: 0,
  clicksToday: 0,
  topReferrer: "None",
  referrers: {},
  devices: {},
  browsers: {},
};

export const clockHours = Array.from({ length: 12 }, (_, index) => String(index + 1));
export const clockMinutes = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

export const freePermanentLinkLimit = 10;

export const guestExpiryOptions = [
  { value: "1h", label: "Expires in 1 hour" },
  { value: "6h", label: "Expires in 6 hours" },
  { value: "24h", label: "Expires in 24 hours" },
  { value: "7d", label: "Expires in 7 days" },
];

export const userExpiryOptions = [
  { value: "1h", label: "1 hour", premium: false },
  { value: "6h", label: "6 hours", premium: false },
  { value: "24h", label: "24 hours", premium: false },
  { value: "7d", label: "7 days", premium: false },
  { value: "30d", label: "30 days · Premium", premium: true },
  { value: "90d", label: "90 days · Premium", premium: true },
  { value: "1y", label: "1 year · Premium", premium: true },
  { value: "custom", label: "Custom date/time · Premium", premium: true },
];
