import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import logo from "./assets/0.png";
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
    return (localStorage.getItem("go-theme") as Theme) || "light";
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

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const token = auth.user?.id_token;
  const isSignedIn = auth.isAuthenticated;

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
      auth.signinRedirect();
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
          color: "#0052cc",
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

  function signOut() {
    auth.removeUser();
    setLinks([]);
    setClicks([]);
    setAnalyticsSummary(emptySummary);
    setCurrentPlan(null);
    setSelectedCode("");
    setQrCode("");
    setQrSvg("");
    setMessage("");
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
        <button
          className="iconThemeButton mobileThemeLeft"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <a className="brand cleanBrand mobileBrand" href="/">
          <img src={logo} alt="Go by 17bytes logo" />
          <span>Go</span>
        </a>

        <nav className="desktopLinks cleanNavLinks">
          <a href="#shorten">Shorten</a>
          <a href="#features">Features</a>
          {isSignedIn && <a href="#pricing">Plan</a>}
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
                className="outlineButton navButton cleanSignButton fixedAuthButton"
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="primaryButton navButton cleanSignButton fixedAuthButton"
              onClick={() => auth.signinRedirect()}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <p className="heroLabel">Go by 17bytes</p>
        <h1>Short links, big results</h1>
        <p className="heroCopy">
          A simple link shortener for temporary links, custom aliases, analytics,
          QR codes, and full link management.
        </p>

        <div className="heroCtas">
          {!isSignedIn && (
            <button
              className="primaryButton largeButton"
              onClick={() => auth.signinRedirect()}
            >
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

          <section className="pricingSection" id="pricing">
            <div className="pricingHeader">
              <p className="sectionKicker">Plan</p>
              <h2>Your Go access.</h2>
              <p>
                Manage your current plan and upgrade only when you are ready. All
                prices are in Indian Rupees.
              </p>
            </div>

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

            {!hasPaidPlan() && (
              <>
                <div className="pricingHeader pricingUpgradeHeader">
                  <p className="sectionKicker">Upgrade</p>
                  <h2>Simple pricing, like software used to be.</h2>
                  <p>Pay once. Use Go without monthly subscription stress.</p>
                </div>

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
                        {billingLoadingPlan === plan.id ? "Opening..." : "Choose plan"}
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

            {hasPaidPlan() && (
              <div className="paidPlanNotice">
                <strong>You are subscribed.</strong>
                <span>
                  Your paid plan is active. Pricing cards are hidden because you
                  already have Go access.
                </span>
              </div>
            )}
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
              <img src={logo} alt="Go by 17bytes logo" />
              <span>Go</span>
            </a>

            <p>
              Go by 17Bytes helps you shorten, share, and measure links from one
              clean dashboard, with custom aliases, QR codes, analytics, and simple
              link management.
            </p>
          </div>

          <div className="footerLinks">
            <div>
              <strong>Product</strong>
              <a href="#shorten">Shorten</a>
              <a href="#features">Features</a>
              {isSignedIn && <a href="#pricing">Plan</a>}
              {isSignedIn && <a href="#dashboard">Dashboard</a>}
            </div>

            <div>
              <strong>Platform</strong>
              <span>AWS Lambda</span>
              <span>API Gateway</span>
              <span>DynamoDB</span>
              <span>Cognito</span>
              <span>Cloudflare Pages</span>
            </div>
          </div>

          <div className="footerBadge">
            <span>Production project</span>
            <strong>Serverless SaaS</strong>
            <small>Built with React, Cognito, API Gateway & DynamoDB</small>
          </div>
        </div>

        <div className="footerBottom">
          <span>
            © {new Date().getFullYear()} 17Bytes. Go is a product of 17Bytes.
            Certified by xCentury. All rights reserved.
          </span>
          <span>Simple pricing. No monthly subscription stress.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;