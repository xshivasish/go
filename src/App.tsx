import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import logo from "./assets/0.png";
import xcenturyWhite from "./assets/5.png";
import xcenturyBlack from "./assets/6.png";
import "./App.css";

type Theme = "light" | "dark";

type ShortenResponse = {
  code: string;
  shortUrl: string;
  originalUrl?: string;
  url?: string;
  title?: string;
  notes?: string;
  status: string;
  type: string;
  clickCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
  lastClickedAt?: string | null;
};

type ClickItem = {
  code: string;
  clickedAt: string;
  visitorHash?: string;
  referrer?: string;
  rawReferrer?: string;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
};

type AnalyticsSummary = {
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topReferrer: string;
  referrers: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
};

type LinksResponse = {
  count: number;
  links: ShortenResponse[];
};

type ClicksResponse = {
  code: string;
  count: number;
  summary: AnalyticsSummary;
  clicks: ClickItem[];
};

type BillingPlan = {
  id: "one_year" | "two_years" | "five_years" | "lifetime";
  name: string;
  price: string;
  duration: string;
  badge?: string;
  save?: string;
};

type BillingStatus = {
  ownerId: string;
  email: string;
  plan: string;
  planName: string;
  displayPrice: string;
  status: string;
  accessUntil: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

type BillingMeResponse = {
  plan: BillingStatus;
};

type RazorpayOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: string;
  planName: string;
  displayPrice: string;
  accessUntil: string;
  prefill: {
    email?: string;
  };
};

type RazorpayVerifyResponse = {
  message: string;
  status: string;
  plan: string;
  planName: string;
  displayPrice?: string;
  accessUntil: string;
};

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      prefill?: {
        email?: string;
      };
      theme?: {
        color: string;
      };
      handler: (response: RazorpayCheckoutResponse) => void;
      modal?: {
        ondismiss?: () => void;
      };
    }) => {
      open: () => void;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const emptySummary: AnalyticsSummary = {
  totalClicks: 0,
  uniqueVisitors: 0,
  clicksToday: 0,
  topReferrer: "None",
  referrers: {},
  devices: {},
  browsers: {},
};

const billingPlans: BillingPlan[] = [
  {
    id: "one_year",
    name: "Starter",
    price: "₹999",
    duration: "1 year access",
  },
  {
    id: "two_years",
    name: "Plus",
    price: "₹1,898",
    duration: "2 years access",
    save: "Save ₹100",
    badge: "Popular",
  },
  {
    id: "five_years",
    name: "Pro",
    price: "₹4,695",
    duration: "5 years access",
    save: "Save ₹300",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "₹9,490",
    duration: "Pay once, use forever",
    save: "Save ₹500",
    badge: "Best value",
  },
];

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: text || "Server returned a non-JSON response",
    };
  }
}

function App() {
  const auth = useAuth();

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("go-theme") as Theme) || "dark";
  });

  const [guestUrl, setGuestUrl] = useState("");

  const [userUrl, setUserUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  const [createdLink, setCreatedLink] = useState<ShortenResponse | null>(null);
  const [links, setLinks] = useState<ShortenResponse[]>([]);
  const [clicks, setClicks] = useState<ClickItem[]>([]);
  const [analyticsSummary, setAnalyticsSummary] =
    useState<AnalyticsSummary>(emptySummary);

  const [selectedCode, setSelectedCode] = useState("");

  const [qrCode, setQrCode] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  const [editingCode, setEditingCode] = useState("");
  const [editingUrl, setEditingUrl] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  const [currentPlan, setCurrentPlan] = useState<BillingStatus | null>(null);
  const [billingStatusLoading, setBillingStatusLoading] = useState(false);
  const [billingLoadingPlan, setBillingLoadingPlan] = useState("");

  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const token = auth.user?.id_token;
  const accessToken = auth.user?.access_token;
  const isSignedIn = auth.isAuthenticated;

  const identityProvider = getIdentityProvider();
  const isGoogleUser = identityProvider.toLowerCase() === "google";
  const isExternalProviderUser = Boolean(identityProvider);

  const stats = useMemo(() => {
    const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
    const activeLinks = links.filter((link) => link.status === "active").length;
    const inactiveLinks = links.filter((link) => link.status !== "active").length;

    return {
      totalLinks: links.length,
      totalClicks,
      activeLinks,
      inactiveLinks,
    };
  }, [links]);

  useEffect(() => {
    localStorage.setItem("go-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadLinks();
      loadBillingStatus();
    } else {
      setCurrentPlan(null);
    }
  }, [auth.isAuthenticated]);

  function getIdentityProvider() {
    const profile = auth.user?.profile as Record<string, unknown> | undefined;
    const identitiesValue = profile?.identities;

    if (!identitiesValue) return "";

    try {
      const identities =
        typeof identitiesValue === "string"
          ? JSON.parse(identitiesValue)
          : identitiesValue;

      if (Array.isArray(identities) && identities.length > 0) {
        return String(identities[0]?.providerName || "");
      }

      return "";
    } catch {
      return "";
    }
  }

  async function apiCall(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || `Request failed with ${response.status}`);
    }

    return data;
  }

  async function textApiCall(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    if (!response.ok) {
      try {
        const data = JSON.parse(text);
        throw new Error(data.message || `Request failed with ${response.status}`);
      } catch {
        throw new Error(text || `Request failed with ${response.status}`);
      }
    }

    return text;
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  function startSignIn() {
    auth.signinRedirect({
      extraQueryParams: {
        prompt: "login",
      },
    });
  }

  function loadRazorpayScript() {
    return new Promise<boolean>((resolve) => {
      const existingScript = document.getElementById("razorpay-checkout-js");

      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  async function loadBillingStatus() {
    if (!token) return;

    setBillingStatusLoading(true);

    try {
      const data = (await apiCall("/billing/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })) as BillingMeResponse;

      setCurrentPlan(data.plan);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to load billing status"
      );
    } finally {
      setBillingStatusLoading(false);
    }
  }

  function getDestination(link: ShortenResponse) {
    return link.originalUrl || link.url || "";
  }

  function getTitle(link: ShortenResponse) {
    return link.title || link.code;
  }

  function getNotes(link: ShortenResponse) {
    return link.notes || "";
  }

  function showSuccess(text: string) {
    setMessageType("success");
    setMessage(text);
  }

  function showError(text: string) {
    setMessageType("error");
    setMessage(text);
  }

  function entriesFromRecord(record: Record<string, number>) {
    return Object.entries(record || {}).sort((a, b) => b[1] - a[1]);
  }

  function formatAccess(value?: string) {
    if (!value || value === "free") return "Free";
    if (value === "lifetime") return "Lifetime";
    return formatDate(value);
  }

  function hasPaidPlan() {
    return (
      currentPlan?.status === "active" &&
      Boolean(currentPlan?.plan) &&
      currentPlan?.plan !== "free"
    );
  }

  async function buyPlan(planId: BillingPlan["id"]) {
    if (!token) {
      showError("Please sign in before buying a plan.");
      startSignIn();
      return;
    }

    setBillingLoadingPlan(planId);
    setMessage("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout");
      }

      const order = (await apiCall("/billing/create-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
        }),
      })) as RazorpayOrderResponse;

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Go by 17Bytes",
        description: order.planName,
        order_id: order.orderId,
        prefill: {
          email: order.prefill?.email || auth.user?.profile.email || "",
        },
        theme: {
          color: "#ff6b00",
        },
        handler: async (paymentResponse) => {
          try {
            const verified = (await apiCall("/billing/verify-payment", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(paymentResponse),
            })) as RazorpayVerifyResponse;

            showSuccess(
              `${verified.planName || "Your plan"} is active. Access: ${formatAccess(
                verified.accessUntil
              )}`
            );

            await loadBillingStatus();
          } catch (error) {
            showError(
              error instanceof Error
                ? error.message
                : "Payment completed, but verification failed"
            );
          } finally {
            setBillingLoadingPlan("");
          }
        },
        modal: {
          ondismiss: () => {
            setBillingLoadingPlan("");
          },
        },
      });

      checkout.open();
    } catch (error) {
      setBillingLoadingPlan("");
      showError(error instanceof Error ? error.message : "Failed to start checkout");
    }
  }

  async function createTemporaryLink() {
    setLoading(true);
    setMessage("");
    setCreatedLink(null);

    try {
      const data = (await apiCall("/shorten", {
        method: "POST",
        body: JSON.stringify({ url: guestUrl }),
      })) as ShortenResponse;

      setCreatedLink(data);
      setGuestUrl("");
      showSuccess("Temporary link created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  async function createPermanentLink() {
    if (!token) {
      showError("Please sign in first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setCreatedLink(null);

    try {
      const normalizedCustomCode = customCode.trim().toLowerCase();

      const data = (await apiCall("/user/shorten", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: userUrl,
          customCode: normalizedCustomCode || undefined,
          title: linkTitle,
          notes: linkNotes,
        }),
      })) as ShortenResponse;

      setCreatedLink(data);
      setUserUrl("");
      setCustomCode("");
      setLinkTitle("");
      setLinkNotes("");

      await loadLinks();
      showSuccess("Permanent link created.");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to create permanent link"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLinks() {
    if (!token) return;

    setDashboardLoading(true);
    setMessage("");

    try {
      const data = (await apiCall("/links", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })) as LinksResponse;

      setLinks(data.links || []);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to load links");
    } finally {
      setDashboardLoading(false);
    }
  }

  async function loadClicks(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();

    setSelectedCode(normalizedCode);
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setQrCode("");
    setQrSvg("");
    setMessage("");

    try {
      const data = (await apiCall(`/links/${normalizedCode}/clicks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })) as ClicksResponse;

      setClicks(data.clicks || []);
      setAnalyticsSummary(data.summary || emptySummary);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to load clicks");
    }
  }

  async function loadQrCode(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();

    setQrCode(normalizedCode);
    setQrSvg("");
    setSelectedCode("");
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setQrLoading(true);
    setMessage("");

    try {
      const svg = await textApiCall(`/links/${normalizedCode}/qr`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setQrSvg(svg);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to load QR code");
    } finally {
      setQrLoading(false);
    }
  }

  function downloadQrSvg() {
    if (!qrSvg || !qrCode) return;

    const blob = new Blob([qrSvg], {
      type: "image/svg+xml",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `go-${qrCode}-qr.svg`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  async function updateLinkDetails(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalUrl: editingUrl,
          title: editingTitle,
          notes: editingNotes,
        }),
      });

      setEditingCode("");
      setEditingUrl("");
      setEditingTitle("");
      setEditingNotes("");

      await loadLinks();
      showSuccess("Link details updated.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update link");
    } finally {
      setLoading(false);
    }
  }

  async function updateLinkStatus(code: string, status: "active" | "inactive") {
    if (!token) return;

    const normalizedCode = code.toLowerCase();

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      await loadLinks();
      showSuccess(status === "active" ? "Link reactivated." : "Link deactivated.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLink(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();

    const confirmed = window.confirm(
      `Permanently delete ${normalizedCode}? This will remove it from your dashboard and delete its click history.`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLinks((currentLinks) =>
        currentLinks.filter((link) => link.code.toLowerCase() !== normalizedCode)
      );

      if (selectedCode.toLowerCase() === normalizedCode) {
        setSelectedCode("");
        setClicks([]);
        setAnalyticsSummary(emptySummary);
      }

      if (qrCode.toLowerCase() === normalizedCode) {
        setQrCode("");
        setQrSvg("");
      }

      showSuccess("Link permanently deleted.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to delete link");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (isExternalProviderUser) {
      showError("Password is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      showError("Please sign in again.");
      return;
    }

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showError("Please fill all password fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showError("New passwords do not match.");
      return;
    }

    setAccountActionLoading("password");
    setMessage("");

    try {
      await apiCall("/account/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken,
          oldPassword,
          newPassword,
        }),
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      showSuccess("Password changed successfully.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setAccountActionLoading("");
    }
  }

  async function changeEmail() {
    if (isExternalProviderUser) {
      showError("Email is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      showError("Please sign in again.");
      return;
    }

    if (!newEmail) {
      showError("Please enter a new email.");
      return;
    }

    setAccountActionLoading("email");
    setMessage("");

    try {
      await apiCall("/account/change-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken,
          newEmail,
        }),
      });

      showSuccess("Verification code sent to your new email.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to change email");
    } finally {
      setAccountActionLoading("");
    }
  }

  async function verifyEmailChange() {
    if (isExternalProviderUser) {
      showError("Email is managed by your social login provider.");
      return;
    }

    if (!token || !accessToken) {
      showError("Please sign in again.");
      return;
    }

    if (!emailVerificationCode) {
      showError("Please enter the verification code.");
      return;
    }

    setAccountActionLoading("verify-email");
    setMessage("");

    try {
      await apiCall("/account/verify-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken,
          code: emailVerificationCode,
        }),
      });

      setNewEmail("");
      setEmailVerificationCode("");

      showSuccess("Email verified. Please sign out and sign in again.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to verify email");
    } finally {
      setAccountActionLoading("");
    }
  }

  async function deleteAccount() {
    if (!token) {
      showError("Please sign in again.");
      return;
    }

    if (deleteConfirmation !== "DELETE") {
      showError("Type DELETE to confirm account deletion.");
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete your account, links, analytics, and billing record. Continue?"
    );

    if (!confirmed) return;

    setAccountActionLoading("delete");
    setMessage("");

    try {
      await apiCall("/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmation: "DELETE",
        }),
      });

      await auth.removeUser();
      window.location.href = buildLogoutUrl();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setAccountActionLoading("");
    }
  }

  function startEditing(link: ShortenResponse) {
    setEditingCode(link.code.toLowerCase());
    setEditingUrl(getDestination(link));
    setEditingTitle(getTitle(link));
    setEditingNotes(getNotes(link));
  }

  function cancelEditing() {
    setEditingCode("");
    setEditingUrl("");
    setEditingTitle("");
    setEditingNotes("");
  }

  async function signOut() {
    await auth.removeUser();

    setLinks([]);
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setCurrentPlan(null);
    setSelectedCode("");
    setQrCode("");
    setQrSvg("");
    setMessage("");
    setShowAccountSettings(false);

    window.location.href = buildLogoutUrl();
  }

  function formatDate(value?: string | null) {
    if (!value) return "Never";

    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function copyText(value: string) {
    navigator.clipboard.writeText(value);
    showSuccess("Copied to clipboard.");
  }

  return (
    <main className={`bitlyShell ${theme}`}>
      <header className="topNav cleanTopNav mobileCleanTopNav">
        <a className="brand cleanBrand mobileBrand" href="/">
          <img src={logo} alt="Go by 17bytes logo" />
          <span>Go</span>
        </a>

        <nav className="desktopLinks cleanNavLinks">
          <a href="#shorten">Shorten</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          {isSignedIn && <a href="#dashboard">Dashboard</a>}
        </nav>

        <div className="navActions cleanNavActions mobileNavActions">
          {auth.isLoading ? (
            <span className="navMuted">Checking...</span>
          ) : isSignedIn ? (
            <>
              <span className="accountPill cleanAccountPill">
                {auth.user?.profile.email || "Signed in"}
              </span>

              <button
                className="iconThemeButton"
                aria-label={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                title={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                onClick={toggleTheme}
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>

              <button
                className="settingsIconButton"
                aria-label="Open account settings"
                title="Account settings"
                onClick={() => setShowAccountSettings(true)}
              >
                ⚙️
              </button>

              <button
                className="outlineButton navButton cleanSignButton fixedAuthButton"
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                className="iconThemeButton"
                aria-label={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                title={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                onClick={toggleTheme}
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>

              <button
                className="primaryButton navButton cleanSignButton fixedAuthButton"
                onClick={startSignIn}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <p className="heroLabel">।। जय श्री राम ।।</p>
        <h1>Short links, big results</h1>
        <p className="heroCopy">
          A simple link shortener for temporary links, custom aliases, analytics,
          QR codes, and full link management.
        </p>

        <div className="heroCtas">
          {!isSignedIn && (
            <button className="primaryButton largeButton" onClick={startSignIn}>
              Get started
            </button>
          )}

          <a className="outlineButton largeButton anchorButton" href="#shorten">
            Create a link
          </a>
        </div>
      </section>

      <section className="shortenBox" id="shorten">
        <div className="shortenTabs">
          <div>
            <strong>Shorten a long link</strong>
            <span>No account required for temporary links</span>
          </div>

          <span className="freeBadge">Free</span>
        </div>

        <div className="guestInput">
          <input
            value={guestUrl}
            onChange={(event) => setGuestUrl(event.target.value)}
            placeholder="Paste a long URL"
            onKeyDown={(event) => {
              if (event.key === "Enter" && guestUrl && !loading) {
                createTemporaryLink();
              }
            }}
          />

          <button
            className="primaryButton"
            disabled={!guestUrl || loading}
            onClick={createTemporaryLink}
          >
            {loading ? "Shortening..." : "Shorten"}
          </button>
        </div>

        <p className="helperText">
          Want custom aliases, QR codes, analytics, and permanent links? Sign in and
          use your dashboard.
        </p>
      </section>

      {auth.error && (
        <section className="messageBox errorBox">
          Auth error: {auth.error.message}
        </section>
      )}

      {message && (
        <section
          className={
            messageType === "success"
              ? "messageBox successBox"
              : "messageBox errorBox"
          }
        >
          {message}
        </section>
      )}

      {createdLink && (
        <section className="resultBox">
          <div>
            <span>Your short link</span>
            <a href={createdLink.shortUrl} target="_blank" rel="noreferrer">
              {createdLink.shortUrl}
            </a>
            <small>
              {createdLink.type} · {createdLink.status}
              {createdLink.title ? ` · ${createdLink.title}` : ""}
              {createdLink.expiresAt ? ` · expires ${createdLink.expiresAt}` : ""}
            </small>
          </div>

          <button
            className="outlineButton"
            onClick={() => copyText(createdLink.shortUrl)}
          >
            Copy
          </button>
        </section>
      )}

      <section className="features" id="features">
        <article>
          <span>01</span>
          <h3>Create links fast</h3>
          <p>Shorten long links instantly with a clean, simple interface.</p>
        </article>

        <article>
          <span>02</span>
          <h3>Use custom aliases</h3>
          <p>Signed-in users can create branded and memorable permanent links.</p>
        </article>

        <article>
          <span>03</span>
          <h3>Measure every click</h3>
          <p>Track clicks, referrers, devices, browsers, timestamps, and QR usage.</p>
        </article>
      </section>

      <section className="pricingSection" id="pricing">
        <div className="pricingHeader">
          <p className="sectionKicker">Pricing</p>
          <h2>Simple pricing, like software used to be.</h2>
          <p>
            Pay once. Use Go without monthly subscription stress. All prices are in
            Indian Rupees.
          </p>
        </div>

        {isSignedIn && (
          <div className="currentPlanCard">
            <div>
              <p className="sectionKicker">Current plan</p>
              <h3>
                {billingStatusLoading
                  ? "Checking plan..."
                  : currentPlan?.planName || "Go Free"}
              </h3>
              <span>
                {currentPlan
                  ? `${currentPlan.displayPrice} · ${currentPlan.status}`
                  : "₹0 · active"}
              </span>
            </div>

            <div>
              <strong>Access</strong>
              <span>{formatAccess(currentPlan?.accessUntil)}</span>
            </div>
          </div>
        )}

        {(!isSignedIn || !hasPaidPlan()) && (
          <>
            <div className="pricingGrid">
              {billingPlans.map((plan) => (
                <article
                  className={
                    plan.id === "lifetime"
                      ? "pricingCard highlightedPricingCard"
                      : "pricingCard"
                  }
                  key={plan.id}
                >
                  {plan.badge && <span className="pricingBadge">{plan.badge}</span>}

                  <h3>{plan.name}</h3>

                  <div className="priceLine">
                    <strong>{plan.price}</strong>
                    <span>{plan.duration}</span>
                  </div>

                  {plan.save && <p className="saveText">{plan.save}</p>}

                  <ul>
                    <li>Unlimited short links under fair use</li>
                    <li>Custom aliases</li>
                    <li>QR code generation</li>
                    <li>Click analytics</li>
                    <li>Link editing and lifecycle controls</li>
                  </ul>

                  <button
                    className={
                      plan.id === "lifetime"
                        ? "primaryButton pricingButton"
                        : "outlineButton pricingButton"
                    }
                    disabled={Boolean(billingLoadingPlan)}
                    onClick={() => buyPlan(plan.id)}
                  >
                    {!isSignedIn
                      ? "Sign in to choose"
                      : billingLoadingPlan === plan.id
                        ? "Opening..."
                        : "Choose plan"}
                  </button>
                </article>
              ))}
            </div>

            <p className="pricingNote">
              Payments are processed securely by Razorpay. Fair-use protections
              apply to prevent spam, abuse, and automated high-volume traffic.
            </p>
          </>
        )}

        {isSignedIn && hasPaidPlan() && (
          <div className="paidPlanNotice">
            <strong>You are subscribed.</strong>
            <span>
              Your paid plan is active. Pricing cards are hidden because you already
              have Go access.
            </span>
          </div>
        )}
      </section>

      {isSignedIn && (
        <>
          <section className="accountCreator">
            <div>
              <p className="sectionKicker">Your account</p>
              <h2>Create a permanent link</h2>
              <p>
                Permanent links stay in your dashboard and can be edited, paused,
                measured, or deleted.
              </p>
            </div>

            <div className="accountForm accountFormExpanded">
              <input
                value={userUrl}
                onChange={(event) => setUserUrl(event.target.value)}
                placeholder="Destination URL"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && userUrl && !loading) {
                    createPermanentLink();
                  }
                }}
              />

              <input
                value={customCode}
                onChange={(event) =>
                  setCustomCode(event.target.value.trim().toLowerCase())
                }
                placeholder="Custom alias, optional"
              />

              <input
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                placeholder="Title, optional"
                maxLength={120}
              />

              <textarea
                value={linkNotes}
                onChange={(event) => setLinkNotes(event.target.value)}
                placeholder="Notes, optional"
                maxLength={500}
              />

              <button
                className="primaryButton"
                disabled={!userUrl || loading}
                onClick={createPermanentLink}
              >
                {loading ? "Creating..." : "Create link"}
              </button>
            </div>
          </section>

          <section className="statsGrid">
            <article>
              <span>Total links</span>
              <strong>{stats.totalLinks}</strong>
            </article>
            <article>
              <span>Total clicks</span>
              <strong>{stats.totalClicks}</strong>
            </article>
            <article>
              <span>Active links</span>
              <strong>{stats.activeLinks}</strong>
            </article>
            <article>
              <span>Inactive links</span>
              <strong>{stats.inactiveLinks}</strong>
            </article>
          </section>

          <section className="dashboard" id="dashboard">
            <div className="dashboardHeader">
              <div>
                <p className="sectionKicker">Dashboard</p>
                <h2>Your links</h2>
              </div>

              <button
                className="outlineButton"
                disabled={dashboardLoading}
                onClick={loadLinks}
              >
                {dashboardLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {dashboardLoading && links.length === 0 ? (
              <div className="emptyState">Loading your links...</div>
            ) : links.length === 0 ? (
              <div className="emptyState">
                No permanent links yet. Create your first one above.
              </div>
            ) : (
              <div className="linkTable">
                <div className="tableHead">
                  <span>Link</span>
                  <span>Destination</span>
                  <span>Performance</span>
                  <span>Actions</span>
                </div>

                {links.map((link) => (
                  <article className="linkRow" key={link.code}>
                    <div className="linkCell">
                      <span
                        className={
                          link.status === "active"
                            ? "statusBadge active"
                            : "statusBadge inactive"
                        }
                      >
                        {link.status}
                      </span>

                      <strong>{getTitle(link)}</strong>
                      <span className="codeText">{link.code.toLowerCase()}</span>

                      <a href={link.shortUrl} target="_blank" rel="noreferrer">
                        {link.shortUrl}
                      </a>
                    </div>

                    <div className="destinationCell">
                      {editingCode === link.code.toLowerCase() ? (
                        <div className="editForm">
                          <input
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            placeholder="Title"
                            maxLength={120}
                          />

                          <input
                            value={editingUrl}
                            onChange={(event) => setEditingUrl(event.target.value)}
                            placeholder="https://new-destination.com"
                          />

                          <textarea
                            value={editingNotes}
                            onChange={(event) => setEditingNotes(event.target.value)}
                            placeholder="Notes"
                            maxLength={500}
                          />

                          <div className="inlineActions">
                            <button
                              className="primaryButton smallButton"
                              disabled={!editingUrl || loading}
                              onClick={() => updateLinkDetails(link.code)}
                            >
                              Save
                            </button>

                            <button
                              className="outlineButton smallButton"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{getDestination(link)}</p>
                          {getNotes(link) && (
                            <small className="notesText">{getNotes(link)}</small>
                          )}
                        </>
                      )}
                    </div>

                    <div className="performanceCell">
                      <strong>{link.clickCount}</strong>
                      <span>clicks</span>
                      <small>Last click: {formatDate(link.lastClickedAt)}</small>
                    </div>

                    <div className="actionCell">
                      <button
                        className="outlineButton smallButton"
                        onClick={() => copyText(link.shortUrl)}
                      >
                        Copy
                      </button>

                      <button
                        className="outlineButton smallButton"
                        onClick={() => loadClicks(link.code)}
                      >
                        Analytics
                      </button>

                      <button
                        className="outlineButton smallButton"
                        onClick={() => loadQrCode(link.code)}
                      >
                        QR
                      </button>

                      <button
                        className="outlineButton smallButton"
                        onClick={() => startEditing(link)}
                      >
                        Edit
                      </button>

                      {link.status === "active" ? (
                        <button
                          className="outlineButton smallButton"
                          disabled={loading}
                          onClick={() => updateLinkStatus(link.code, "inactive")}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="outlineButton smallButton"
                          disabled={loading}
                          onClick={() => updateLinkStatus(link.code, "active")}
                        >
                          Reactivate
                        </button>
                      )}

                      <button
                        className="dangerButton smallButton"
                        disabled={loading}
                        onClick={() => deleteLink(link.code)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isSignedIn && showAccountSettings && (
        <section className="accountSettingsOverlay">
          <div className="accountSettingsModal">
            <div className="dashboardHeader">
              <div>
                <p className="sectionKicker">Account</p>
                <h2>Account settings</h2>
                <p className="helperText">
                  Manage your login, email, password, and account deletion.
                </p>
              </div>

              <button
                className="outlineButton"
                onClick={() => setShowAccountSettings(false)}
              >
                Close
              </button>
            </div>

            <div className="accountSettingsGrid">
              <article className="settingsCard">
                <h3>Profile</h3>
                <p>Signed in as</p>
                <strong>{auth.user?.profile.email || "Unknown email"}</strong>
                <span>{auth.user?.profile.sub}</span>

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
                    You signed in with {identityProvider}. Your password and email
                    are managed by {identityProvider}, not Go.
                  </p>

                  <p>
                    You can still delete your Go account below. Deleting your Go
                    account will remove your Go links, analytics, and billing record,
                    but it will not delete your {identityProvider} account.
                  </p>

                  {isGoogleUser && (
                    <a
                      className="outlineButton anchorButton"
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Google security settings
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

                    <button
                      className="primaryButton"
                      disabled={accountActionLoading === "password"}
                      onClick={changePassword}
                    >
                      {accountActionLoading === "password"
                        ? "Updating..."
                        : "Change password"}
                    </button>
                  </article>

                  <article className="settingsCard">
                    <h3>Change email</h3>
                    <p>
                      Enter a new email. Cognito will send a verification code before
                      the change is completed.
                    </p>

                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="New email address"
                    />

                    <button
                      className="outlineButton"
                      disabled={accountActionLoading === "email"}
                      onClick={changeEmail}
                    >
                      {accountActionLoading === "email"
                        ? "Sending..."
                        : "Send verification code"}
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
                      {accountActionLoading === "verify-email"
                        ? "Verifying..."
                        : "Verify email"}
                    </button>
                  </article>
                </>
              )}

              <article className="settingsCard dangerSettingsCard">
                <h3>Delete account</h3>
                <p>
                  This permanently deletes your Go account, links, click history, and
                  billing record. This action cannot be undone.
                </p>

                {isExternalProviderUser && (
                  <p>
                    This will not delete your {identityProvider} account. It only
                    deletes your Go by 17Bytes account data.
                  </p>
                )}

                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="Type DELETE to confirm"
                />

                <button
                  className="dangerButton"
                  disabled={accountActionLoading === "delete"}
                  onClick={deleteAccount}
                >
                  {accountActionLoading === "delete"
                    ? "Deleting..."
                    : "Delete account"}
                </button>
              </article>
            </div>
          </div>
        </section>
      )}

      {isSignedIn && qrCode && (
        <section className="analyticsPanel qrPanel">
          <div className="dashboardHeader">
            <div>
              <p className="sectionKicker">QR Code</p>
              <h2>{qrCode}</h2>
              <p className="helperText">Scan or download this QR code as SVG.</p>
            </div>

            <div className="inlineActions">
              <button
                className="outlineButton"
                disabled={!qrSvg}
                onClick={downloadQrSvg}
              >
                Download SVG
              </button>

              <button
                className="outlineButton"
                onClick={() => {
                  setQrCode("");
                  setQrSvg("");
                }}
              >
                Close
              </button>
            </div>
          </div>

          {qrLoading ? (
            <div className="emptyState">Generating QR code...</div>
          ) : qrSvg ? (
            <div className="qrPreview" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          ) : (
            <div className="emptyState">No QR code loaded.</div>
          )}
        </section>
      )}

      {isSignedIn && selectedCode && (
        <section className="analyticsPanel">
          <div className="dashboardHeader">
            <div>
              <p className="sectionKicker">Analytics</p>
              <h2>{selectedCode.toLowerCase()}</h2>
            </div>

            <button
              className="outlineButton"
              onClick={() => {
                setSelectedCode("");
                setClicks([]);
                setAnalyticsSummary(emptySummary);
              }}
            >
              Close
            </button>
          </div>

          <div className="analyticsSummaryGrid">
            <article>
              <span>Total clicks</span>
              <strong>{analyticsSummary.totalClicks}</strong>
            </article>

            <article>
              <span>Unique visitors</span>
              <strong>{analyticsSummary.uniqueVisitors}</strong>
            </article>

            <article>
              <span>Clicks today</span>
              <strong>{analyticsSummary.clicksToday}</strong>
            </article>

            <article>
              <span>Top referrer</span>
              <strong>{analyticsSummary.topReferrer}</strong>
            </article>
          </div>

          <div className="breakdownGrid">
            <article className="breakdownCard">
              <h3>Referrers</h3>
              {entriesFromRecord(analyticsSummary.referrers).length === 0 ? (
                <p>No referrer data yet.</p>
              ) : (
                entriesFromRecord(analyticsSummary.referrers).map(([name, count]) => (
                  <div className="breakdownRow" key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </article>

            <article className="breakdownCard">
              <h3>Devices</h3>
              {entriesFromRecord(analyticsSummary.devices).length === 0 ? (
                <p>No device data yet.</p>
              ) : (
                entriesFromRecord(analyticsSummary.devices).map(([name, count]) => (
                  <div className="breakdownRow" key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </article>

            <article className="breakdownCard">
              <h3>Browsers</h3>
              {entriesFromRecord(analyticsSummary.browsers).length === 0 ? (
                <p>No browser data yet.</p>
              ) : (
                entriesFromRecord(analyticsSummary.browsers).map(([name, count]) => (
                  <div className="breakdownRow" key={name}>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </article>
          </div>

          <div className="recentClicksHeader">
            <h3>Recent clicks</h3>
            <span>{clicks.length} total</span>
          </div>

          {clicks.length === 0 ? (
            <div className="emptyState">No clicks recorded yet.</div>
          ) : (
            <div className="clickList">
              {clicks.map((click, index) => (
                <article
                  className="clickRow improvedClickRow"
                  key={`${click.clickedAt}-${index}`}
                >
                  <div>
                    <strong>{formatDate(click.clickedAt)}</strong>
                    <span>{click.referrer || "Direct"}</span>
                  </div>

                  <div className="clickMeta">
                    <small>{click.deviceType || "unknown"}</small>
                    <small>{click.browser || "Other"}</small>
                    <small>
                      {click.visitorHash
                        ? `Visitor ${click.visitorHash.slice(0, 8)}`
                        : "Legacy click"}
                    </small>
                  </div>

                  <small className="userAgentText">
                    {click.userAgent || "Unknown device"}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="specialFooter">
        <div className="footerMain">
          <div className="footerBrand">
            <a className="footerLogo" href="/">
              <img src={logo} alt="Go by 17Bytes logo" />
              <span>Go by 17Bytes</span>
            </a>

            <strong><p>
              Create, share, and manage short links with QR codes, custom aliases,
              and analytics.
            </p></strong>
          </div>

          <div className="footerLinks">
            <div>
              <strong>Product</strong>
              <a href="#shorten">Shorten</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              {isSignedIn && <a href="#dashboard">Dashboard</a>}
            </div>

            <div>
              <strong>About us</strong>
              <span>17Bytes</span>
            </div>
          </div>

          <div className="footerBadge xcenturyFooterBadge">
            <span>Certified by</span>
            <img
              className="xcenturyFooterLogo xcenturyLogoDark"
              src={xcenturyWhite}
              alt="xCentury certified"
            />
            <img
              className="xcenturyFooterLogo xcenturyLogoLight"
              src={xcenturyBlack}
              alt="xCentury certified"
            />
          </div>
        </div>

        <div className="footerBottom">
          <span>
            ©{" "}
            {new Date().getFullYear() === 2026
              ? "2026"
              : `2026–${new Date().getFullYear()}`}{" "}
            Go by 17Bytes. All rights reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}

export default App;