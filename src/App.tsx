import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import logo from "./assets/0.png";
import xcenturyWhite from "./assets/5.png";
import xcenturyBlack from "./assets/6.png";
import razorpayLogo from "./assets/0.1.png";
import wavyBackground from "./assets/wavy.jpg";
import "./App.css";

type Theme = "light" | "dark";

type FooterPageKey =
  | "terms"
  | "privacy"
  | "refunds"
  | "acceptableUse"
  | "abuse"
  | "contact"
  | "about"
  | "go";

type FooterPageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

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
  analyticsLimited?: boolean;
  visibleClickLimit?: number | null;
  upgradeMessage?: string;
  summary: AnalyticsSummary;
  clicks: ClickItem[];
};

type BillingPlan = {
  id: "one_year" | "two_years" | "five_years" | "lifetime";
  name: string;
  price: string;
  originalPrice?: string;
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
      image?: string;
      description: string;
      order_id: string;
      prefill?: {
        name?: string;
        email?: string;
        contact?: string;
      };
      readonly?: {
        name?: boolean;
        email?: boolean;
        contact?: boolean;
      };
      hidden?: {
        email?: boolean;
        contact?: boolean;
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
const PENDING_PLAN_KEY = "go-pending-plan";

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
    id: "lifetime",
    name: "Lifetime",
    originalPrice: "₹9,990",
    price: "₹9,490",
    duration: "Lifetime access",
    save: "Save ₹500",
    badge: "Best value",
  },
  {
    id: "five_years",
    name: "Pro",
    originalPrice: "₹4,995",
    price: "₹4,695",
    duration: "5 years access",
    save: "Save ₹300",
  },
  {
    id: "two_years",
    name: "Plus",
    originalPrice: "₹1,998",
    price: "₹1,898",
    duration: "2 years access",
    save: "Save ₹100",
  },
  {
    id: "one_year",
    name: "Starter",
    price: "₹999",
    duration: "1 year access",
  },
];

const clockHours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const clockMinutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const footerPages: Record<FooterPageKey, FooterPageContent> = {
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro:
      "These terms explain how Go by 17Bytes may be used, what users are responsible for, and how paid access works.",
    sections: [
      {
        heading: "Service use",
        body:
          "Go by 17Bytes helps users create, manage, and measure short links. You are responsible for the links you create, the destinations you share, and any activity connected to your account.",
      },
      {
        heading: "Account and access",
        body:
          "Keep your login secure. We may restrict, suspend, or remove links or accounts that create risk, abuse the platform, or violate these terms.",
      },
      {
        heading: "Paid plans",
        body:
          "Paid plans provide premium access for the selected duration, including unlimited premium links under fair use, complete analytics history, advanced expiry controls, priority support, and future premium upgrades.",
      },
      {
        heading: "Fair use",
        body:
          "Unlimited usage is subject to fair-use protections. Automated spam, abusive bulk creation, resale, scraping, or activity that affects platform stability is not permitted.",
      },
      {
        heading: "Limitation",
        body:
          "The service is provided with reasonable care, but availability may vary due to maintenance, third-party providers, infrastructure issues, or misuse prevention.",
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "This policy explains the information Go by 17Bytes uses to operate accounts, short links, analytics, billing, and support.",
    sections: [
      {
        heading: "Information we process",
        body:
          "We may process your email, account identity, created links, link metadata, QR usage, click timestamps, referrers, device type, browser details, IP-derived visitor signals, support messages, and payment metadata.",
      },
      {
        heading: "How it is used",
        body:
          "Data is used to provide the service, secure accounts, record analytics, prevent abuse, process payments, improve reliability, and respond to support or legal requests.",
      },
      {
        heading: "Payments",
        body:
          "Payments are processed by Razorpay. Go by 17Bytes does not store card, UPI, or banking credentials on its own servers.",
      },
      {
        heading: "Your choices",
        body:
          "You may request correction, deletion, account removal, or privacy assistance by contacting the support or privacy contact listed on this site.",
      },
    ],
  },
  refunds: {
    eyebrow: "Payments",
    title: "Refund & Cancellation Policy",
    intro:
      "Go by 17Bytes sells one-time access plans. There are no recurring monthly subscriptions to cancel.",
    sections: [
      {
        heading: "One-time plans",
        body:
          "Plans are purchased for the selected access period. Lifetime access means access for the lifetime of the Go by 17Bytes product, subject to the terms and fair-use policy.",
      },
      {
        heading: "Refund requests",
        body:
          "Refunds may be reviewed when payment was accidental, duplicate, or the service could not be activated. Heavy usage, abuse, or completed value delivery may make a plan ineligible for refund.",
      },
      {
        heading: "How to request help",
        body:
          "Contact support with your account email, payment reference, plan selected, and reason for the request. We will review the request and respond as soon as reasonably possible.",
      },
    ],
  },
  acceptableUse: {
    eyebrow: "Trust",
    title: "Acceptable Use Policy",
    intro:
      "Short links must be safe, lawful, and respectful of users, platforms, and third-party rights.",
    sections: [
      {
        heading: "Not allowed",
        body:
          "Do not use Go for phishing, malware, credential theft, spam, scams, impersonation, illegal content, payment fraud, deceptive redirects, harassment, exploitation, or content that violates applicable law.",
      },
      {
        heading: "Enforcement",
        body:
          "We may disable links, limit accounts, remove content, or terminate access when links create security, legal, platform, or user-safety risk.",
      },
      {
        heading: "Responsible sharing",
        body:
          "Make sure your destination pages are accurate, safe, and permitted by the services where you share them.",
      },
    ],
  },
  abuse: {
    eyebrow: "Safety",
    title: "Report Abuse",
    intro:
      "If a Go short link is being used for phishing, malware, spam, scams, impersonation, or harmful activity, report it for review.",
    sections: [
      {
        heading: "What to include",
        body:
          "Send the short link, the destination if known, the reason for the report, screenshots if available, and any relevant context that helps us investigate quickly.",
      },
      {
        heading: "Abuse contact",
        body:
          "Email abuse@17bytes.com for abuse reports. Serious security or phishing reports should include as much evidence as possible.",
      },
      {
        heading: "Review process",
        body:
          "Reported links may be reviewed and disabled when they violate our policies or create risk for users or third parties.",
      },
    ],
  },
  contact: {
    eyebrow: "Support",
    title: "Contact & Support",
    intro:
      "For product help, billing questions, account issues, privacy requests, or business enquiries, contact the Go by 17Bytes team.",
    sections: [
      {
        heading: "Support",
        body:
          "Email support@17bytes.com for product support, billing assistance, account help, and general questions.",
      },
      {
        heading: "Privacy and data requests",
        body:
          "For privacy, correction, deletion, or account-data requests, contact privacy@17bytes.com with your account email and request details.",
      },
      {
        heading: "Business enquiries",
        body:
          "For partnerships, company enquiries, or product-related business communication, contact the 17Bytes team through the main company website.",
      },
    ],
  },

  about: {
    eyebrow: "Company",
    title: "About Go by 17Bytes",
    intro:
      "Go by 17Bytes is a professional link management product built for simple, secure, and measurable sharing.",
    sections: [
      {
        heading: "About us",
        body:
          "Go by 17Bytes helps individuals, creators, teams, and businesses create short links, manage campaigns, generate QR codes, and understand link performance from one clean dashboard.",
      },
      {
        heading: "Product",
        body:
          "Go is designed to keep link sharing fast, clear, and reliable, with temporary links, custom aliases, analytics, QR codes, and premium access options.",
      },
      {
        heading: "Company",
        body:
          "Go by 17Bytes is operated by 17Bytes. Visit 17bytes.com to learn more about the main company.",
      },
    ],
  },

  go: {
    eyebrow: "Product",
    title: "Go by 17Bytes",
    intro:
      "Go is the link management product by 17Bytes, built for fast sharing, clean dashboards, QR codes, and measurable campaign links.",
    sections: [
      {
        heading: "What Go does",
        body:
          "Go helps you shorten long URLs, create custom aliases, generate QR codes, manage link status, and track link performance from one focused workspace.",
      },
      {
        heading: "Free access",
        body:
          "Free users can create temporary links, manage up to 10 permanent links, generate QR codes, and view basic analytics for recent clicks.",
      },
      {
        heading: "Premium access",
        body:
          "Premium plans unlock unlimited premium links under fair use, complete analytics history, advanced expiry controls, priority support, and future premium upgrades.",
      },
    ],
  },
};


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
  const [guestExpiresIn, setGuestExpiresIn] = useState("24h");

  const [userUrl, setUserUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [userLinkMode, setUserLinkMode] = useState<"permanent" | "temporary">("permanent");
  const [userExpiresIn, setUserExpiresIn] = useState("24h");
  const [, setCustomExpiresAt] = useState("");
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [customExpiryHour, setCustomExpiryHour] = useState("12");
  const [customExpiryMinute, setCustomExpiryMinute] = useState("00");
  const [customExpiryPeriod, setCustomExpiryPeriod] = useState<"AM" | "PM">("PM");

  const [createdLink, setCreatedLink] = useState<ShortenResponse | null>(null);
  const [links, setLinks] = useState<ShortenResponse[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [clicks, setClicks] = useState<ClickItem[]>([]);
  const [analyticsSummary, setAnalyticsSummary] =
    useState<AnalyticsSummary>(emptySummary);
  const [analyticsLimited, setAnalyticsLimited] = useState(false);
  const [visibleClickLimit, setVisibleClickLimit] = useState<number | null>(null);
  const [analyticsUpgradeMessage, setAnalyticsUpgradeMessage] = useState("");

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
  const [billingStatusLoaded, setBillingStatusLoaded] = useState(false);
  const [billingLoadingPlan, setBillingLoadingPlan] = useState("");

  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [footerPage, setFooterPage] = useState<FooterPageKey | null>(null);

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

  const permanentManagedLinks = useMemo(() => {
    return links.filter((link) => String(link.type || "").toLowerCase() === "permanent").length;
  }, [links]);

  const temporaryManagedLinks = useMemo(() => {
    return links.filter((link) => String(link.type || "").toLowerCase() === "temporary").length;
  }, [links]);

  const freePermanentLinkLimit = 10;
  const freePermanentLinksLeft = Math.max(
    freePermanentLinkLimit - permanentManagedLinks,
    0
  );
  const planName = currentPlan?.planName || "Go Free";
  const planAccessLabel = formatAccess(currentPlan?.accessUntil);

  const filteredLinks = useMemo(() => {
    const query = linkSearchQuery.trim().toLowerCase();

    if (!query) return links;

    return links.filter((link) => {
      const searchableText = [
        getTitle(link),
        link.code,
        link.shortUrl,
        getDestination(link),
        getNotes(link),
        link.status,
        link.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [links, linkSearchQuery]);

  useEffect(() => {
    localStorage.setItem("go-theme", theme);
  }, [theme]);

  useEffect(() => {
    setCustomExpiresAt(buildCustomExpiryValue());
  }, [customExpiryDate, customExpiryHour, customExpiryMinute, customExpiryPeriod]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      setBillingStatusLoaded(false);
      loadLinks();
      loadBillingStatus();
    } else {
      setCurrentPlan(null);
      setBillingStatusLoaded(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated || !token) return;
    if (!billingStatusLoaded || billingStatusLoading) return;

    const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY) as
      | BillingPlan["id"]
      | null;

    if (!pendingPlan) return;

    sessionStorage.removeItem(PENDING_PLAN_KEY);

    if (hasPaidPlan()) {
      showSuccess(`${currentPlan?.planName || "Your premium plan"} is already active.`);
      return;
    }

    const checkoutTimer = window.setTimeout(() => {
      buyPlan(pendingPlan);
    }, 300);

    return () => window.clearTimeout(checkoutTimer);
  }, [
    auth.isAuthenticated,
    token,
    billingStatusLoaded,
    billingStatusLoading,
    currentPlan?.plan,
    currentPlan?.planName,
    currentPlan?.status,
  ]);

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

  async function startSignIn(pendingPlan?: BillingPlan["id"]) {
    if (pendingPlan) {
      sessionStorage.setItem(PENDING_PLAN_KEY, pendingPlan);
    }

    try {
      await auth.signinRedirect({
        extraQueryParams: {
          prompt: "login",
        },
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to open sign in");
    }
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

    setBillingStatusLoaded(false);
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
      setBillingStatusLoaded(true);
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

  function shouldShowPricingCards() {
    // Never show pricing cards to guests
    if (!isSignedIn) return false;

    // Wait until billing status is loaded
    if (!billingStatusLoaded || billingStatusLoading) return false;

    // Show pricing only to signed-in users without a paid plan
    return !hasPaidPlan();
  }

  async function choosePlan(planId: BillingPlan["id"]) {
    if (!auth.isAuthenticated || !token) {
      sessionStorage.setItem(PENDING_PLAN_KEY, planId);
      await startSignIn();
      return;
    }

    await buyPlan(planId);
  }

  async function getLatestBillingPlan() {
    if (!token) return null;

    const data = (await apiCall("/billing/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as BillingMeResponse;

    setCurrentPlan(data.plan);
    setBillingStatusLoaded(true);

    return data.plan;
  }

  function isPaidBillingPlan(plan?: BillingStatus | null) {
    return (
      plan?.status === "active" &&
      Boolean(plan?.plan) &&
      plan?.plan !== "free"
    );
  }

  async function buyPlan(planId: BillingPlan["id"]) {
    if (!auth.isAuthenticated || !token) {
      sessionStorage.setItem(PENDING_PLAN_KEY, planId);
      await startSignIn();
      return;
    }

    setBillingLoadingPlan(planId);
    setMessage("");

    try {
      const latestPlan = await getLatestBillingPlan();

      if (isPaidBillingPlan(latestPlan)) {
        sessionStorage.removeItem(PENDING_PLAN_KEY);
        showSuccess(
          `${latestPlan?.planName || "Your premium plan"} is already active.`
        );
        setBillingLoadingPlan("");
        return;
      }

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

      const userEmail = String(
        order.prefill?.email || auth.user?.profile.email || ""
      ).trim();

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Go",
        image: razorpayLogo,
        description: order.planName,
        order_id: order.orderId,
        prefill: {
          email: userEmail,
        },
        readonly: {
          email: Boolean(userEmail),
          contact: true,
        },
        hidden: {
          email: Boolean(userEmail),
          contact: true,
        },
        theme: {
          color: "#FF671F",
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

  function buildCustomExpiryValue() {
    if (!customExpiryDate) return "";

    let hour = Number(customExpiryHour);

    if (customExpiryPeriod === "PM" && hour !== 12) {
      hour += 12;
    }

    if (customExpiryPeriod === "AM" && hour === 12) {
      hour = 0;
    }

    return `${customExpiryDate}T${String(hour).padStart(2, "0")}:${customExpiryMinute}`;
  }

  function formatCustomExpiryPreview() {
    const value = buildCustomExpiryValue();

    if (!value) return "Select a date to preview the expiry time.";

    return `Expires ${formatDate(value)}`;
  }

  async function createTemporaryLink() {
    setLoading(true);
    setMessage("");
    setCreatedLink(null);

    try {
      const data = (await apiCall("/shorten", {
        method: "POST",
        body: JSON.stringify({
          url: guestUrl,
          expiresIn: guestExpiresIn,
        }),
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

    const selectedPremiumExpiry = ["30d", "90d", "1y", "custom"].includes(userExpiresIn);

    if (userLinkMode === "temporary" && selectedPremiumExpiry && !hasPaidPlan()) {
      showError("Premium temporary expiry is locked on the Free plan. Upgrade to use longer or custom expiry.");
      return;
    }

    const customExpiryValue = buildCustomExpiryValue();

    if (userLinkMode === "temporary" && userExpiresIn === "custom" && !customExpiryValue) {
      showError("Please select a custom expiry date and time.");
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
          linkMode: userLinkMode,
          expiresIn: userLinkMode === "temporary" ? userExpiresIn : undefined,
          customExpiresAt:
            userLinkMode === "temporary" && userExpiresIn === "custom"
              ? customExpiryValue
              : undefined,
        }),
      })) as ShortenResponse;

      setCreatedLink(data);
      setUserUrl("");
      setCustomCode("");
      setLinkTitle("");
      setLinkNotes("");
      setUserLinkMode("permanent");
      setUserExpiresIn("24h");
      setCustomExpiresAt("");
      setCustomExpiryDate("");
      setCustomExpiryHour("12");
      setCustomExpiryMinute("00");
      setCustomExpiryPeriod("PM");

      await loadLinks();
      showSuccess(userLinkMode === "temporary" ? "Temporary account link created." : "Permanent link created.");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to create account link"
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
    setAnalyticsLimited(false);
    setVisibleClickLimit(null);
    setAnalyticsUpgradeMessage("");
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
      setAnalyticsLimited(Boolean(data.analyticsLimited));
      setVisibleClickLimit(data.visibleClickLimit ?? null);
      setAnalyticsUpgradeMessage(data.upgradeMessage || "");
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
    setAnalyticsLimited(false);
    setVisibleClickLimit(null);
    setAnalyticsUpgradeMessage("");
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
        setAnalyticsLimited(false);
        setVisibleClickLimit(null);
        setAnalyticsUpgradeMessage("");
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
    setAnalyticsLimited(false);
    setVisibleClickLimit(null);
    setAnalyticsUpgradeMessage("");
    setCurrentPlan(null);
    setSelectedCode("");
    setQrCode("");
    setQrSvg("");
    setMessage("");
    setShowAccountSettings(false);
    setShowLinkManager(false);

    window.location.href = buildLogoutUrl();
  }

  function getOrdinalDay(day: number) {
    if (day > 3 && day < 21) return `${day}th`;

    switch (day % 10) {
      case 1:
        return `${day}st`;
      case 2:
        return `${day}nd`;
      case 3:
        return `${day}rd`;
      default:
        return `${day}th`;
    }
  }

  function padDatePart(value: number) {
    return String(value).padStart(2, "0");
  }

  function formatDate(value?: string | null) {
    if (!value) return "Never";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    const month = date
      .toLocaleString("en-US", { month: "long", timeZone: "UTC" })
      .toLowerCase();

    const day = getOrdinalDay(date.getUTCDate());
    const year = date.getUTCFullYear();
    const hours = padDatePart(date.getUTCHours());
    const minutes = padDatePart(date.getUTCMinutes());
    const seconds = padDatePart(date.getUTCSeconds());

    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} UTC`;
  }

  function copyText(value: string) {
    navigator.clipboard.writeText(value);
    showSuccess("Copied to clipboard.");
  }

  function openFooterPage(page: FooterPageKey) {
    setFooterPage(page);
  }

  function closeFooterPage() {
    setFooterPage(null);
  }

  function renderFooterPage() {
    if (!footerPage) return null;

    const page = footerPages[footerPage];

    return (
      <section
        className="footerPageOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="footer-page-title"
        onClick={closeFooterPage}
      >
        <div
          className="footerPageSection footerPagePopup"
          id="footer-page"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="footerPageHeader">
            <div>
              <p className="sectionKicker">{page.eyebrow}</p>
              <h2 id="footer-page-title">{page.title}</h2>
              <p>{page.intro}</p>
            </div>

            <button className="outlineButton" onClick={closeFooterPage}>
              Close
            </button>
          </div>

          <div className="footerPageGrid">
            {page.sections.map((section) => (
              <article className="footerPageCard" key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <main
      className={`bitlyShell ${theme}`}
      style={{ ["--bg-image" as string]: `url(${wavyBackground})` }}
    >
      <header className="topNav cleanTopNav mobileCleanTopNav">
        <a className="brand cleanBrand mobileBrand" href="/">
          <img src={logo} />
          <span>Go</span>
          {hasPaidPlan() && <em className="brandPlanText">Lifetime</em>}
        </a>

        <div className="navActions cleanNavActions mobileNavActions">
          {auth.isLoading ? (
            <span className="navMuted">Checking...</span>
          ) : isSignedIn ? (
            <>
              <span className="accountPill cleanAccountPill">
                {auth.user?.profile.email || "Signed in"}
              </span>

              <button
                className={`themeSwitch ${theme === "dark" ? "themeSwitchDark" : "themeSwitchLight"}`}
                aria-label={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                title={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                onClick={toggleTheme}
              >
                <span className="themeSwitchTrack">
                  <span className="themeSwitchThumb">
                    {theme === "light" ? "☀️" : "🌙"}
                  </span>
                </span>
              </button>

              <button
                className="settingsHeaderButton"
                aria-label="Open account settings"
                title="Account settings"
                onClick={() => setShowAccountSettings(true)}
              >
                Settings
              </button>

              <button
                className="signOutHeaderButton"
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                className={`themeSwitch ${theme === "dark" ? "themeSwitchDark" : "themeSwitchLight"}`}
                aria-label={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                title={
                  theme === "light" ? "Switch to dark mode" : "Switch to light mode"
                }
                onClick={toggleTheme}
              >
                <span className="themeSwitchTrack">
                  <span className="themeSwitchThumb">
                    {theme === "light" ? "☀️" : "🌙"}
                  </span>
                </span>
              </button>

              <button
                className="primaryButton navButton cleanSignButton fixedAuthButton"
                onClick={() => startSignIn()}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      {!isSignedIn && (
        <section className="hero">
        <p className="heroLabel">।। जय श्री राम ।।</p>
        <h1>Short links, big results</h1>
        <p className="heroCopy">
          A simple link shortener for temporary links, custom aliases, analytics,
          QR codes, and full link management.
        </p>

        <div className="heroCtas">
          {!isSignedIn && (
            <button className="primaryButton largeButton" onClick={() => startSignIn()}>
              Get started
            </button>
          )}

          <a className="outlineButton largeButton anchorButton" href="#shorten">
            Create a link
          </a>
        </div>
      </section>

      )}

      <section className="shortenBox" id="shorten">
        <div className="shortenTabs">
          <div>
            <strong>Shorten a long link</strong>
            <span>No account required for temporary links</span>
          </div>

          <span className="freeBadge">Free</span>
        </div>

        <div className="guestInput guestInputWithExpiry">
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

          <select
            className="expirySelect"
            value={guestExpiresIn}
            onChange={(event) => setGuestExpiresIn(event.target.value)}
            aria-label="Temporary link expiry"
          >
            <option value="1h">Expires in 1 hour</option>
            <option value="6h">Expires in 6 hours</option>
            <option value="24h">Expires in 24 hours</option>
            <option value="7d">Expires in 7 days</option>
          </select>

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
              {createdLink.expiresAt
                ? ` · expires ${formatDate(createdLink.expiresAt)}`
                : ""}
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

      {isSignedIn && (
        <>
          <section className="premiumLinkSection premiumWorkspaceSection creatorStudioSection">
            <div className="creatorStudioShell">
              <div className="creatorStudioHeader">
                <div>
                  <p className="sectionKicker">Link creator</p>
                  <h2>Create, organize, and track your links</h2>
                  <p>
                    Build permanent links for pages that stay live, or temporary links
                    for campaigns and limited-time sharing. Everything you create here
                    stays editable from Links.
                  </p>
                </div>

                <button
                  className="outlineButton premiumHeaderAction"
                  onClick={() => setShowLinkManager(true)}
                >
                  Open Links
                </button>
              </div>

              <div className="creatorStudioMetrics">
                <article className="creatorMetricCard primaryMetricCard">
                  <span>Your plan</span>
                  <strong>{planName}</strong>
                  <small>{hasPaidPlan() ? `${currentPlan?.displayPrice || "Premium"} · ${planAccessLabel}` : "Free workspace"}</small>
                </article>

                <article className="creatorMetricCard">
                  <span>{hasPaidPlan() ? "Premium access" : "Free links left"}</span>
                  <strong>{hasPaidPlan() ? "Unlimited" : freePermanentLinksLeft}</strong>
                  <small>
                    {hasPaidPlan()
                      ? "Permanent links under fair use"
                      : `${permanentManagedLinks}/${freePermanentLinkLimit} permanent links used`}
                  </small>
                </article>

                <article className="creatorMetricCard">
                  <span>Temporary links</span>
                  <strong>{temporaryManagedLinks}</strong>
                  <small>{hasPaidPlan() ? "Custom expiry available" : "Free expiry up to 7 days"}</small>
                </article>

                <article className="creatorMetricCard">
                  <span>Total clicks</span>
                  <strong>{stats.totalClicks}</strong>
                  <small>{stats.activeLinks} active links</small>
                </article>
              </div>

              <div className="creatorStudioGrid">
                <aside className="creatorControlPanel">
                  <div className="creatorPanelBlock">
                    <span className="miniLabel">Choose link type</span>

                    <div className="creatorModeCards">
                      <button
                        type="button"
                        className={
                          userLinkMode === "permanent"
                            ? "creatorModeCard active"
                            : "creatorModeCard"
                        }
                        onClick={() => setUserLinkMode("permanent")}
                      >
                        <span>Permanent</span>
                        <strong>Always-on link</strong>
                        <small>Use for websites, profiles, products, resumes, docs, and pages that should not expire.</small>
                      </button>

                      <button
                        type="button"
                        className={
                          userLinkMode === "temporary"
                            ? "creatorModeCard active"
                            : "creatorModeCard"
                        }
                        onClick={() => setUserLinkMode("temporary")}
                      >
                        <span>Temporary</span>
                        <strong>Time-limited link</strong>
                        <small>Use for campaigns, offers, event files, private sharing, and links that should close automatically.</small>
                      </button>
                    </div>
                  </div>

                  <div className="creatorPanelBlock usefulInfoBlock">
                    <span className="miniLabel">What you get</span>

                    <div className="creatorInfoList">
                      <div>
                        <strong>Custom aliases</strong>
                        <span>Create readable short links that people can remember.</span>
                      </div>

                      <div>
                        <strong>QR codes</strong>
                        <span>Generate downloadable QR codes from the Links manager.</span>
                      </div>

                      <div>
                        <strong>Analytics</strong>
                        <span>{hasPaidPlan() ? "View complete click history and long-term performance." : "Free users can view the latest 10 clicks per link."}</span>
                      </div>

                      <div>
                        <strong>Expiry controls</strong>
                        <span>{hasPaidPlan() ? "Use 30 days, 90 days, 1 year, or custom expiry." : "Use 1 hour, 6 hours, 24 hours, or 7 days for free."}</span>
                      </div>
                    </div>
                  </div>

                  {!hasPaidPlan() && (
                    <div className="freeUsageCard">
                      <div>
                        <span className="miniLabel">Free plan usage</span>
                        <strong>{freePermanentLinksLeft} permanent links left</strong>
                        <p>
                          You have used {permanentManagedLinks} of {freePermanentLinkLimit} free permanent links.
                          Temporary links up to 7 days are still available.
                        </p>
                      </div>

                      <a className="outlineButton anchorButton" href="#pricing">
                        View upgrades
                      </a>
                    </div>
                  )}
                </aside>

                <div className="creatorFormPanel">
                  <div className="creatorFormTopline">
                    <div>
                      <span className="miniLabel">{userLinkMode === "temporary" ? "Temporary setup" : "Permanent setup"}</span>
                      <h3>{userLinkMode === "temporary" ? "Create a temporary managed link" : "Create a permanent managed link"}</h3>
                      <p>
                        {userLinkMode === "temporary"
                          ? "Set a destination, optional alias, and expiry. The link will automatically stop working after the selected time."
                          : "Set a destination, optional alias, title, and notes. You can edit or pause it later from Links."}
                      </p>
                    </div>

                    <span className="creatorStatusPill">
                      {userLinkMode === "temporary" ? "Auto-expiry" : "No expiry"}
                    </span>
                  </div>

                  <div className="creatorFieldGroup creatorFullField">
                    <label>Destination URL</label>
                    <input
                      value={userUrl}
                      onChange={(event) => setUserUrl(event.target.value)}
                      placeholder="https://example.com/your-long-link"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && userUrl && !loading) {
                          createPermanentLink();
                        }
                      }}
                    />
                    <small>The page people will visit when they open your Go short link.</small>
                  </div>

                  <div className="creatorTwoColumnFields">
                    <div className="creatorFieldGroup">
                      <label>Custom alias</label>
                      <input
                        value={customCode}
                        onChange={(event) =>
                          setCustomCode(event.target.value.trim().toLowerCase())
                        }
                        placeholder="my-campaign"
                      />
                      <small>Optional. Leave blank to auto-generate.</small>
                    </div>

                    <div className="creatorFieldGroup">
                      <label>Title</label>
                      <input
                        value={linkTitle}
                        onChange={(event) => setLinkTitle(event.target.value)}
                        placeholder="Launch page, Resume, Offer link..."
                        maxLength={120}
                      />
                      <small>Only visible inside your dashboard.</small>
                    </div>
                  </div>

                  {userLinkMode === "temporary" && (
                    <div className="creatorExpiryPanel">
                      <div className="creatorFieldGroup">
                        <label>Expiry</label>

                        <select
                          className="expirySelect"
                          value={userExpiresIn}
                          onChange={(event) => setUserExpiresIn(event.target.value)}
                        >
                          <option value="1h">1 hour</option>
                          <option value="6h">6 hours</option>
                          <option value="24h">24 hours</option>
                          <option value="7d">7 days</option>
                          <option disabled={!hasPaidPlan()} value="30d">
                            30 days · Premium
                          </option>
                          <option disabled={!hasPaidPlan()} value="90d">
                            90 days · Premium
                          </option>
                          <option disabled={!hasPaidPlan()} value="1y">
                            1 year · Premium
                          </option>
                          <option disabled={!hasPaidPlan()} value="custom">
                            Custom date/time · Premium
                          </option>
                        </select>
                        <small>{hasPaidPlan() ? "Premium expiry controls are available." : "Free temporary links can expire up to 7 days later."}</small>
                      </div>

                      {userExpiresIn === "custom" && hasPaidPlan() && (
                        <div className="creatorFieldGroup creatorFullField customExpiryPicker">
                          <div className="customExpiryTop">
                            <div>
                              <label>Custom expiry</label>
                              <p>Pick a date, then tap the clock to choose the time.</p>
                            </div>

                            <span>{formatCustomExpiryPreview()}</span>
                          </div>

                          <div className="customExpiryGrid">
                            <div className="customDatePanel">
                              <label>Date</label>
                              <input
                                type="date"
                                value={customExpiryDate}
                                onChange={(event) => setCustomExpiryDate(event.target.value)}
                              />

                              <div className="periodToggle" aria-label="Select AM or PM">
                                <button
                                  type="button"
                                  className={customExpiryPeriod === "AM" ? "active" : ""}
                                  onClick={() => setCustomExpiryPeriod("AM")}
                                >
                                  AM
                                </button>

                                <button
                                  type="button"
                                  className={customExpiryPeriod === "PM" ? "active" : ""}
                                  onClick={() => setCustomExpiryPeriod("PM")}
                                >
                                  PM
                                </button>
                              </div>

                              <div className="manualTimeRow">
                                <select
                                  value={customExpiryHour}
                                  onChange={(event) => setCustomExpiryHour(event.target.value)}
                                  aria-label="Custom expiry hour"
                                >
                                  {clockHours.map((hour) => (
                                    <option value={hour} key={hour}>
                                      {hour.padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>

                                <span>:</span>

                                <select
                                  value={customExpiryMinute}
                                  onChange={(event) => setCustomExpiryMinute(event.target.value)}
                                  aria-label="Custom expiry minute"
                                >
                                  {clockMinutes.map((minute) => (
                                    <option value={minute} key={minute}>
                                      {minute}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="analogClockPanel" aria-label="Analogue time picker">
                              <div className="analogClockFace">
                                <span className="clockCenter" />
                                <span
                                  className="clockHandHour"
                                  style={{
                                    transform: `translateX(-50%) rotate(${(Number(customExpiryHour) % 12) * 30 + Number(customExpiryMinute) * 0.5}deg)`,
                                  }}
                                />
                                <span
                                  className="clockHandMinute"
                                  style={{
                                    transform: `translateX(-50%) rotate(${Number(customExpiryMinute) * 6}deg)`,
                                  }}
                                />

                                {clockHours.map((hour, index) => {
                                  const angle = (index + 1) * 30;

                                  return (
                                    <button
                                      type="button"
                                      className={customExpiryHour === hour ? "active" : ""}
                                      key={hour}
                                      style={{
                                        transform: `rotate(${angle}deg) translateY(-82px) rotate(-${angle}deg)`,
                                      }}
                                      onClick={() => setCustomExpiryHour(hour)}
                                    >
                                      {hour}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="minutePicker">
                                {clockMinutes.map((minute) => (
                                  <button
                                    type="button"
                                    className={customExpiryMinute === minute ? "active" : ""}
                                    key={minute}
                                    onClick={() => setCustomExpiryMinute(minute)}
                                  >
                                    {minute}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!hasPaidPlan() && (
                        <div className="lockedTemporaryCard premiumLockedCard creatorLockedCard">
                          <span className="lockIcon">🔒</span>
                          <div>
                            <strong>Premium expiry options</strong>
                            <p>
                              Longer expiry and custom date/time are available on paid plans.
                              Your free plan still supports 1 hour, 6 hours, 24 hours, and 7 days.
                            </p>
                          </div>
                          <a className="outlineButton anchorButton" href="#pricing">
                            Upgrade
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="creatorFieldGroup creatorFullField">
                    <label>Notes</label>
                    <textarea
                      value={linkNotes}
                      onChange={(event) => setLinkNotes(event.target.value)}
                      placeholder="Optional internal notes for this link"
                      maxLength={500}
                    />
                    <small>Use notes for campaign names, client names, source details, or reminders.</small>
                  </div>

                  <div className="creatorSubmitPanel">
                    <div>
                      <strong>Ready to create?</strong>
                      <p>
                        {userLinkMode === "temporary"
                          ? "After creation, you can copy the link, generate a QR code, view analytics, or delete it from Links."
                          : "After creation, you can copy the link, edit details, generate a QR code, pause it, or view analytics from Links."}
                      </p>
                    </div>

                    <button
                      className="primaryButton premiumCreateButton"
                      disabled={!userUrl || loading}
                      onClick={createPermanentLink}
                    >
                      {loading
                        ? "Creating..."
                        : userLinkMode === "temporary"
                          ? "Create temporary link"
                          : "Create permanent link"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>


        </>
      )}


      {isSignedIn && showLinkManager && (
        <section className="linkManagerOverlay">
          <div className="linkManagerModal">
            <div className="dashboardHeader linkManagerTop">
              <div>
                <p className="sectionKicker">Link manager</p>
                <h2>Manage your links</h2>
                <p className="helperText">Copy, analyze, generate QR codes, edit, pause, reactivate, or delete your managed links.</p>
              </div>

              <button
                className="outlineButton"
                onClick={() => {
                  setShowLinkManager(false);
                  setSelectedCode("");
                  setClicks([]);
                  setAnalyticsSummary(emptySummary);
                  setAnalyticsLimited(false);
                  setVisibleClickLimit(null);
                  setAnalyticsUpgradeMessage("");
                  setQrCode("");
                  setQrSvg("");
                }}
              >
                Close manager
              </button>
            </div>

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
            <div className="dashboardHeader dashboardHeaderWithSearch">
              <div>
                <p className="sectionKicker">Dashboard</p>
                <h2>Your links</h2>
                <p className="helperText">
                  Search by title, short link, custom alias, notes, or destination URL.
                </p>
              </div>

              <div className="dashboardHeaderActions">
                <input
                  className="dashboardSearchInput"
                  value={linkSearchQuery}
                  onChange={(event) => setLinkSearchQuery(event.target.value)}
                  placeholder="Search links, title, notes, alias, or URL"
                  aria-label="Search links"
                />

                <button
                  className="outlineButton"
                  disabled={dashboardLoading}
                  onClick={loadLinks}
                >
                  {dashboardLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {dashboardLoading && links.length === 0 ? (
              <div className="emptyState">Loading your links...</div>
            ) : links.length === 0 ? (
              <div className="emptyState">
                No permanent links yet. Create your first one above.
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="emptyState">
                No links found for “{linkSearchQuery}”. Try searching by title, alias, notes, short link, or destination URL.
              </div>
            ) : (
              <div className="linkTable">
                <div className="tableHead">
                  <span>Link</span>
                  <span>Destination</span>
                  <span>Performance</span>
                  <span>Actions</span>
                </div>

                {filteredLinks.map((link) => (
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

                          <div className="linkMetaStack">
                            <small>
                              {link.expiresAt
                                ? `Expires ${formatDate(link.expiresAt)}`
                                : "Does not expire"}
                            </small>

                            {getNotes(link) && (
                              <small className="notesText">{getNotes(link)}</small>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="performanceCell">
                      <strong>{link.clickCount}</strong>
                      <span>clicks</span>
                      <small>Type: {link.type}</small>
                      <small>Expires: {link.expiresAt ? formatDate(link.expiresAt) : "Never"}</small>
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

          </div>
        </section>
      )}
      <section className="pricingSection" id="pricing">
        {shouldShowPricingCards() && (
          <div className="pricingHeader">
            <p className="sectionKicker">Pricing</p>
            <h2>Simple pricing, like software used to be.</h2>
            <p>
              Pay once. Use Go without monthly subscription stress. All prices are in
              Indian Rupees.
            </p>
          </div>
        )}

        {isSignedIn && billingStatusLoaded && (
          <div className="currentPlanCard">
            <div>
              <p className="sectionKicker">Current plan</p>
              <h3>{currentPlan?.planName || "Go Free"}</h3>
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

        {shouldShowPricingCards() && (
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
                  {plan.badge && <span className="pricingBadge pricingBadgeRight">{plan.badge}</span>}

                  <h3>{plan.name}</h3>

                  <div className="priceLine">
                    <div className="priceAmountRow">
                      {plan.originalPrice && (
                        <span className="originalPrice">{plan.originalPrice}</span>
                      )}
                      <strong>{plan.price}</strong>
                    </div>

                    <div className="priceMetaRow">
                      <span>{plan.duration}</span>
                      {plan.save && <span className="saveTextInline">{plan.save}</span>}
                    </div>
                  </div>

                  <ul>
                    <li>Unlimited premium links</li>
                    <li>Complete analytics history</li>
                    <li>Advanced expiry controls</li>
                    <li>Priority support</li>
                    <li>Future premium upgrades</li>
                  </ul>

                  <button
                    className={
                      plan.id === "lifetime"
                        ? "primaryButton pricingButton"
                        : "outlineButton pricingButton"
                    }
                    disabled={Boolean(billingLoadingPlan)}
                    onClick={() => choosePlan(plan.id)}
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
          </>
        )}
      </section>

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
        <section className="analyticsOverlay">
          <div className="analyticsPanel qrPanel popupPanel">
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
          </div>
        </section>
      )}

      {isSignedIn && selectedCode && (
        <section className="analyticsOverlay">
          <div className="analyticsPanel popupPanel">
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
                setAnalyticsLimited(false);
                setVisibleClickLimit(null);
                setAnalyticsUpgradeMessage("");
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

          <div className="premiumAnalyticsGrid">
            <article className={analyticsLimited ? "lockedFeature" : "aiInsightCard"}>
              <span className="lockIcon">✨</span>
              <h3>AI insights</h3>
              <p>
                Analyze traffic quality, referrers, devices, campaigns, and link
                performance with AI-powered recommendations.
              </p>

              {analyticsLimited && (
                <a className="outlineButton anchorButton" href="#pricing">
                  Upgrade to unlock
                </a>
              )}
            </article>

            <article className={analyticsLimited ? "lockedFeature" : "aiInsightCard"}>
              <span className="lockIcon">📊</span>
              <h3>Full analytics history</h3>
              <p>
                View complete click history, long-term patterns, and detailed
                analytics for every link.
              </p>

              {analyticsLimited && (
                <a className="outlineButton anchorButton" href="#pricing">
                  Upgrade to unlock
                </a>
              )}
            </article>

            <article className={analyticsLimited ? "lockedFeature" : "aiInsightCard"}>
              <span className="lockIcon">⬇️</span>
              <h3>Export analytics</h3>
              <p>
                Export click history and performance reports for campaigns, clients,
                and business records.
              </p>

              {analyticsLimited && (
                <a className="outlineButton anchorButton" href="#pricing">
                  Upgrade to unlock
                </a>
              )}
            </article>
          </div>

          <div className="recentClicksHeader">
            <h3>Recent clicks</h3>
            <span>
              {analyticsLimited && visibleClickLimit
                ? `Showing latest ${visibleClickLimit} of ${analyticsSummary.totalClicks}`
                : `${clicks.length} total`}
            </span>
          </div>

          {analyticsLimited && (
            <div className="lockedAnalyticsCard">
              <div>
                <span className="lockIcon">🔒</span>
                <h3>Full click history is locked</h3>
                <p>
                  {analyticsUpgradeMessage ||
                    "Free users can view the latest 10 clicks per link. Upgrade to unlock full analytics history, long-term insights, exports, and future AI analysis."}
                </p>
              </div>

              <a className="primaryButton anchorButton" href="#pricing">
                Upgrade
              </a>
            </div>
          )}

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
          </div>
        </section>
      )}

      {renderFooterPage()}

      <footer className="specialFooter">
        <div className="footerMain compactFooterMain">
          <div className="footerBrand">
            <a className="footerLogo" href="/">
              <img src={logo} /><span>Go by 17Bytes</span></a>
            <p><strong>Shorten, Manage and Share links with custom aliases, QR codes, temporary expiry, analytics, and dashboard controls.</strong></p>
            </div>

          <div className="footerLinks professionalFooterLinks">
            <div>
              <strong>LEGAL</strong>
              <button className="footerTextButton" onClick={() => openFooterPage("terms")}>TERMS</button>
              <button className="footerTextButton" onClick={() => openFooterPage("privacy")}>PRIVACY</button>
              <button className="footerTextButton" onClick={() => openFooterPage("refunds")}>REFUNDS</button>
            </div>
            <div>
              <strong>TRUST</strong>
              <button className="footerTextButton" onClick={() => openFooterPage("acceptableUse")}>USE POLICY</button>
              <button className="footerTextButton" onClick={() => openFooterPage("abuse")}>REPORT ABUSE</button>
              <button className="footerTextButton" onClick={() => openFooterPage("contact")}>CONTACT</button>
            </div>

            <div>
              <strong>ABOUT US</strong>
              <a href="https://17bytes.com" target="_blank" rel="noreferrer">17BYTES</a>
            </div>
          </div>
        </div>

        <div className="footerBottom">
          <span>
            © {new Date().getFullYear() === 2026 ? "2026" : `2026 – ${new Date().getFullYear()}`} {" "}
            Go by 17Bytes. All rights reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}

export default App;