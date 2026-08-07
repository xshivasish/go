import type { BillingPlan, BillingStatus } from "../types";
import { billingPlans, planFeatures } from "../constants/billingPlans";
import { formatAccess } from "../lib/format";

type PricingSectionProps = {
  show: boolean;
  isSignedIn: boolean;
  billingStatusLoaded: boolean;
  currentPlan: BillingStatus | null;
  billingLoadingPlan: string;
  onChoosePlan: (planId: BillingPlan["id"]) => void;
};

export function PricingSection({
  show,
  isSignedIn,
  billingStatusLoaded,
  currentPlan,
  billingLoadingPlan,
  onChoosePlan,
}: PricingSectionProps) {
  const showCurrentPlanCard = isSignedIn && billingStatusLoaded;

  if (!show && !showCurrentPlanCard) return null;

  return (
    <section className="pricingSection" id="pricing">
      {show && (
        <div className="pricingHeader">
          <p className="sectionKicker">Pricing</p>
          <h2>Simple pricing, like software used to be.</h2>
          <p>Pay once. Use Go without monthly subscription stress. All prices are in Indian Rupees.</p>
        </div>
      )}

      {showCurrentPlanCard && (
        <div className="currentPlanCard">
          <div>
            <p className="sectionKicker">Current plan</p>
            <h3>{currentPlan?.planName || "Go Free"}</h3>
            <span>{currentPlan ? `${currentPlan.displayPrice} · ${currentPlan.status}` : "₹0 · active"}</span>
          </div>
          <div>
            <strong>Access</strong>
            <span>{formatAccess(currentPlan?.accessUntil)}</span>
          </div>
        </div>
      )}

      {show && (
        <div className="pricingGrid">
          {billingPlans.map((plan) => (
            <article className={plan.id === "lifetime" ? "pricingCard highlightedPricingCard" : "pricingCard"} key={plan.id}>
              {plan.badge && <span className="pricingBadge">{plan.badge}</span>}

              <h3>{plan.name}</h3>

              <div className="priceLine">
                <div className="priceAmountRow">
                  {plan.originalPrice && <span className="originalPrice">{plan.originalPrice}</span>}
                  <strong>{plan.price}</strong>
                </div>
                <div className="priceMetaRow">
                  <span>{plan.duration}</span>
                  {plan.save && <span className="saveTextInline">{plan.save}</span>}
                </div>
              </div>

              <ul>
                {planFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <button
                className={plan.id === "lifetime" ? "primaryButton pricingButton" : "outlineButton pricingButton"}
                disabled={Boolean(billingLoadingPlan)}
                onClick={() => onChoosePlan(plan.id)}
              >
                {!isSignedIn ? "Sign in to choose" : billingLoadingPlan === plan.id ? "Opening..." : "Choose plan"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
