import type { BillingPlan } from "../types";

export const billingPlans: BillingPlan[] = [
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

export const planFeatures = [
  "Unlimited premium links",
  "Complete analytics history",
  "Advanced expiry controls",
  "Priority support",
  "Future premium upgrades",
];
