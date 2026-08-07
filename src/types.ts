export type Theme = "light" | "dark";

export type FooterPageKey =
  | "terms"
  | "privacy"
  | "refunds"
  | "acceptableUse"
  | "abuse"
  | "contact"
  | "about"
  | "go";

export type FooterPageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export type ShortenResponse = {
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

export type ClickItem = {
  code: string;
  clickedAt: string;
  visitorHash?: string;
  referrer?: string;
  rawReferrer?: string;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
};

export type AnalyticsSummary = {
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  topReferrer: string;
  referrers: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
};

export type LinksResponse = {
  count: number;
  links: ShortenResponse[];
};

export type ClicksResponse = {
  code: string;
  count: number;
  analyticsLimited?: boolean;
  visibleClickLimit?: number | null;
  upgradeMessage?: string;
  summary: AnalyticsSummary;
  clicks: ClickItem[];
};

export type BillingPlan = {
  id: "one_year" | "two_years" | "five_years" | "lifetime";
  name: string;
  price: string;
  originalPrice?: string;
  duration: string;
  badge?: string;
  save?: string;
};

export type BillingStatus = {
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

export type BillingMeResponse = {
  plan: BillingStatus;
};

export type RazorpayOrderResponse = {
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

export type RazorpayVerifyResponse = {
  message: string;
  status: string;
  plan: string;
  planName: string;
  displayPrice?: string;
  accessUntil: string;
};

export type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type LinkMode = "permanent" | "temporary";
export type LinkStatus = "active" | "inactive";
export type ToastType = "success" | "error";

export type Toast = {
  key: number;
  type: ToastType;
  text: string;
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
