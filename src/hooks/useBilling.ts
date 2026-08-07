import { useEffect, useState } from "react";
import type { BillingMeResponse, BillingPlan, BillingStatus, RazorpayOrderResponse, RazorpayVerifyResponse } from "../types";
import { apiCall, authHeader, errorMessage } from "../lib/api";
import { formatAccess } from "../lib/format";
import { loadRazorpayScript } from "../lib/razorpay";
import { PENDING_PLAN_KEY } from "../constants/misc";
import razorpayLogo from "../assets/0.1.png";

type Notify = {
  showSuccess: (text: string) => void;
  showError: (text: string) => void;
};

function isPaidBillingPlan(plan?: BillingStatus | null) {
  return plan?.status === "active" && Boolean(plan?.plan) && plan?.plan !== "free";
}

/** Owns billing status + the full Razorpay checkout flow, including the post-sign-in "pending plan" resume. */
export function useBilling(
  token: string | undefined,
  isAuthenticated: boolean,
  userEmail: string | undefined,
  startSignIn: (pendingPlan?: BillingPlan["id"]) => Promise<void>,
  notify: Notify
) {
  const [currentPlan, setCurrentPlan] = useState<BillingStatus | null>(null);
  const [billingStatusLoading, setBillingStatusLoading] = useState(false);
  const [billingStatusLoaded, setBillingStatusLoaded] = useState(false);
  const [billingLoadingPlan, setBillingLoadingPlan] = useState("");

  function hasPaidPlan() {
    return isPaidBillingPlan(currentPlan);
  }

  function shouldShowPricingCards() {
    // Never show pricing cards to guests
    if (!isAuthenticated) return false;
    // Wait until billing status is loaded
    if (!billingStatusLoaded || billingStatusLoading) return false;
    // Show pricing only to signed-in users without a paid plan
    return !hasPaidPlan();
  }

  async function loadBillingStatus() {
    if (!token) return;

    setBillingStatusLoaded(false);
    setBillingStatusLoading(true);

    try {
      const data = (await apiCall("/billing/me", {
        method: "GET",
        headers: authHeader(token),
      })) as BillingMeResponse;

      setCurrentPlan(data.plan);
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to load billing status"));
    } finally {
      setBillingStatusLoading(false);
      setBillingStatusLoaded(true);
    }
  }

  async function getLatestBillingPlan() {
    if (!token) return null;

    const data = (await apiCall("/billing/me", {
      method: "GET",
      headers: authHeader(token),
    })) as BillingMeResponse;

    setCurrentPlan(data.plan);
    setBillingStatusLoaded(true);

    return data.plan;
  }

  async function buyPlan(planId: BillingPlan["id"]) {
    if (!isAuthenticated || !token) {
      sessionStorage.setItem(PENDING_PLAN_KEY, planId);
      await startSignIn();
      return;
    }

    setBillingLoadingPlan(planId);

    try {
      const latestPlan = await getLatestBillingPlan();

      if (isPaidBillingPlan(latestPlan)) {
        sessionStorage.removeItem(PENDING_PLAN_KEY);
        notify.showSuccess(`${latestPlan?.planName || "Your premium plan"} is already active.`);
        setBillingLoadingPlan("");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout");
      }

      const order = (await apiCall("/billing/create-order", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({ plan: planId }),
      })) as RazorpayOrderResponse;

      const prefillEmail = String(order.prefill?.email || userEmail || "").trim();

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Go",
        image: razorpayLogo,
        description: order.planName,
        order_id: order.orderId,
        prefill: { email: prefillEmail },
        readonly: { email: Boolean(prefillEmail), contact: true },
        hidden: { email: Boolean(prefillEmail), contact: true },
        theme: { color: "#FF671F" },
        handler: async (paymentResponse) => {
          try {
            const verified = (await apiCall("/billing/verify-payment", {
              method: "POST",
              headers: authHeader(token),
              body: JSON.stringify(paymentResponse),
            })) as RazorpayVerifyResponse;

            notify.showSuccess(
              `${verified.planName || "Your plan"} is active. Access: ${formatAccess(verified.accessUntil)}`
            );

            await loadBillingStatus();
          } catch (error) {
            notify.showError(errorMessage(error, "Payment completed, but verification failed"));
          } finally {
            setBillingLoadingPlan("");
          }
        },
        modal: {
          ondismiss: () => setBillingLoadingPlan(""),
        },
      });

      checkout.open();
    } catch (error) {
      setBillingLoadingPlan("");
      notify.showError(errorMessage(error, "Failed to start checkout"));
    }
  }

  async function choosePlan(planId: BillingPlan["id"]) {
    if (!isAuthenticated || !token) {
      sessionStorage.setItem(PENDING_PLAN_KEY, planId);
      await startSignIn();
      return;
    }

    await buyPlan(planId);
  }

  useEffect(() => {
    if (isAuthenticated) {
      setBillingStatusLoaded(false);
      loadBillingStatus();
    } else {
      setCurrentPlan(null);
      setBillingStatusLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (!billingStatusLoaded || billingStatusLoading) return;

    const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY) as BillingPlan["id"] | null;
    if (!pendingPlan) return;

    sessionStorage.removeItem(PENDING_PLAN_KEY);

    if (hasPaidPlan()) {
      notify.showSuccess(`${currentPlan?.planName || "Your premium plan"} is already active.`);
      return;
    }

    const checkoutTimer = window.setTimeout(() => {
      buyPlan(pendingPlan);
    }, 300);

    return () => window.clearTimeout(checkoutTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, billingStatusLoaded, billingStatusLoading, currentPlan?.plan, currentPlan?.planName, currentPlan?.status]);

  return {
    currentPlan,
    billingStatusLoading,
    billingStatusLoaded,
    billingLoadingPlan,
    hasPaidPlan,
    shouldShowPricingCards,
    choosePlan,
    buyPlan,
    loadBillingStatus,
  };
}
