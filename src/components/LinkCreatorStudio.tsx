import { useState } from "react";
import { Lock } from "lucide-react";
import type { BillingStatus, LinkMode } from "../types";
import { formatDate } from "../lib/format";
import { freePermanentLinkLimit, userExpiryOptions } from "../constants/misc";
import type { CreateLinkPayload } from "../hooks/useLinks";
import { ExpiryTimePicker } from "./ExpiryTimePicker";

type LinkCreatorStudioProps = {
  planName: string;
  hasPaidPlan: boolean;
  currentPlan: BillingStatus | null;
  planAccessLabel: string;
  freePermanentLinksLeft: number;
  permanentManagedLinks: number;
  temporaryManagedLinks: number;
  totalClicks: number;
  activeLinks: number;
  loading: boolean;
  onOpenLinkManager: () => void;
  onCreate: (payload: CreateLinkPayload) => Promise<unknown>;
  showError: (text: string) => void;
};

const premiumExpiryValues = ["30d", "90d", "1y", "custom"];

export function LinkCreatorStudio({
  planName,
  hasPaidPlan,
  currentPlan,
  planAccessLabel,
  freePermanentLinksLeft,
  permanentManagedLinks,
  temporaryManagedLinks,
  totalClicks,
  activeLinks,
  loading,
  onOpenLinkManager,
  onCreate,
  showError,
}: LinkCreatorStudioProps) {
  const [linkMode, setLinkMode] = useState<LinkMode>("permanent");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresIn, setExpiresIn] = useState("24h");
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [customExpiryHour, setCustomExpiryHour] = useState("12");
  const [customExpiryMinute, setCustomExpiryMinute] = useState("00");
  const [customExpiryPeriod, setCustomExpiryPeriod] = useState<"AM" | "PM">("PM");

  function buildCustomExpiryValue() {
    if (!customExpiryDate) return "";

    let hour = Number(customExpiryHour);
    if (customExpiryPeriod === "PM" && hour !== 12) hour += 12;
    if (customExpiryPeriod === "AM" && hour === 12) hour = 0;

    return `${customExpiryDate}T${String(hour).padStart(2, "0")}:${customExpiryMinute}`;
  }

  function formatCustomExpiryPreview() {
    const value = buildCustomExpiryValue();
    if (!value) return "Select a date to preview the expiry time.";
    return `Expires ${formatDate(value)}`;
  }

  function resetForm() {
    setUrl("");
    setCustomCode("");
    setTitle("");
    setNotes("");
    setLinkMode("permanent");
    setExpiresIn("24h");
    setCustomExpiryDate("");
    setCustomExpiryHour("12");
    setCustomExpiryMinute("00");
    setCustomExpiryPeriod("PM");
  }

  async function handleCreate() {
    const selectedPremiumExpiry = premiumExpiryValues.includes(expiresIn);

    if (linkMode === "temporary" && selectedPremiumExpiry && !hasPaidPlan) {
      showError(
        "Premium temporary expiry is locked on the Free plan. Upgrade to use longer or custom expiry."
      );
      return;
    }

    const customExpiryValue = buildCustomExpiryValue();

    if (linkMode === "temporary" && expiresIn === "custom" && !customExpiryValue) {
      showError("Please select a custom expiry date and time.");
      return;
    }

    const result = await onCreate({
      url,
      customCode: customCode.trim().toLowerCase(),
      title,
      notes,
      linkMode,
      expiresIn: linkMode === "temporary" ? expiresIn : undefined,
      customExpiresAt: linkMode === "temporary" && expiresIn === "custom" ? customExpiryValue : undefined,
    });

    if (result) resetForm();
  }

  return (
    <section className="premiumLinkSection creatorStudioSection">
      <div className="creatorStudioShell">
        <div className="creatorStudioHeader">
          <div>
            <p className="sectionKicker">Link creator</p>
            <h2>Create a link</h2>
          </div>

          <button className="outlineButton premiumHeaderAction" onClick={onOpenLinkManager}>
            Open Links
          </button>
        </div>

        <div className="creatorStudioMetrics">
          <article className="creatorMetricCard primaryMetricCard">
            <span>Your plan</span>
            <strong>{planName}</strong>
            <small>{hasPaidPlan ? `${currentPlan?.displayPrice || "Premium"} · ${planAccessLabel}` : "Free workspace"}</small>
          </article>

          <article className="creatorMetricCard">
            <span>{hasPaidPlan ? "Premium access" : "Free links left"}</span>
            <strong>{hasPaidPlan ? "Unlimited" : freePermanentLinksLeft}</strong>
            <small>
              {hasPaidPlan
                ? "Permanent links under fair use"
                : `${permanentManagedLinks}/${freePermanentLinkLimit} permanent links used`}
            </small>
          </article>

          <article className="creatorMetricCard">
            <span>Temporary links</span>
            <strong>{temporaryManagedLinks}</strong>
            <small>{hasPaidPlan ? "Custom expiry available" : "Free expiry up to 7 days"}</small>
          </article>

          <article className="creatorMetricCard">
            <span>Total clicks</span>
            <strong>{totalClicks}</strong>
            <small>{activeLinks} active links</small>
          </article>
        </div>

        <div className="creatorStudioGrid">
          <aside className="creatorControlPanel">
            <div className="creatorPanelBlock">
              <span className="miniLabel">Choose link type</span>

              <div className="creatorModeCards">
                <button
                  type="button"
                  className={linkMode === "permanent" ? "creatorModeCard active" : "creatorModeCard"}
                  onClick={() => setLinkMode("permanent")}
                >
                  <span>Permanent</span>
                  <strong>Always-on link</strong>
                  <small>Never expires.</small>
                </button>

                <button
                  type="button"
                  className={linkMode === "temporary" ? "creatorModeCard active" : "creatorModeCard"}
                  onClick={() => setLinkMode("temporary")}
                >
                  <span>Temporary</span>
                  <strong>Time-limited link</strong>
                  <small>Auto-expires after the time you set.</small>
                </button>
              </div>
            </div>

            {!hasPaidPlan && (
              <div className="freeUsageCard">
                <div>
                  <span className="miniLabel">Free plan usage</span>
                  <strong>{freePermanentLinksLeft} permanent links left</strong>
                  <p>{permanentManagedLinks}/{freePermanentLinkLimit} used</p>
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
                <span className="miniLabel">{linkMode === "temporary" ? "Temporary setup" : "Permanent setup"}</span>
                <h3>{linkMode === "temporary" ? "New temporary link" : "New permanent link"}</h3>
              </div>
              <span className="creatorStatusPill">{linkMode === "temporary" ? "Auto-expiry" : "No expiry"}</span>
            </div>

            <div className="creatorFieldGroup creatorFullField">
              <label>Destination URL</label>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/your-long-link"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && url && !loading) handleCreate();
                }}
              />
              <small>The page people will visit when they open your Go short link.</small>
            </div>

            <div className="creatorTwoColumnFields">
              <div className="creatorFieldGroup">
                <label>Custom alias</label>
                <input
                  value={customCode}
                  onChange={(event) => setCustomCode(event.target.value.trim().toLowerCase())}
                  placeholder="my-campaign"
                />
                <small>Optional. Leave blank to auto-generate.</small>
              </div>

              <div className="creatorFieldGroup">
                <label>Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Launch page, Resume, Offer link..."
                  maxLength={120}
                />
                <small>Only visible inside your dashboard.</small>
              </div>
            </div>

            {linkMode === "temporary" && (
              <div className="creatorExpiryPanel">
                <div className="creatorFieldGroup">
                  <label>Expiry</label>
                  <select
                    className="expirySelect"
                    value={expiresIn}
                    onChange={(event) => setExpiresIn(event.target.value)}
                  >
                    {userExpiryOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.premium && !hasPaidPlan}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small>{hasPaidPlan ? "Premium expiry controls are available." : "Free temporary links can expire up to 7 days later."}</small>
                </div>

                {expiresIn === "custom" && hasPaidPlan && (
                  <ExpiryTimePicker
                    date={customExpiryDate}
                    onDateChange={setCustomExpiryDate}
                    hour={customExpiryHour}
                    onHourChange={setCustomExpiryHour}
                    minute={customExpiryMinute}
                    onMinuteChange={setCustomExpiryMinute}
                    period={customExpiryPeriod}
                    onPeriodChange={setCustomExpiryPeriod}
                    previewText={formatCustomExpiryPreview()}
                  />
                )}

                {!hasPaidPlan && (
                  <div className="lockedTemporaryCard creatorLockedCard">
                    <span className="lockIcon">
                      <Lock size={16} strokeWidth={2.25} />
                    </span>
                    <div>
                      <strong>Premium expiry options</strong>
                      <p>
                        Longer expiry and custom date/time are available on paid plans. Your free
                        plan still supports 1 hour, 6 hours, 24 hours, and 7 days.
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
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional internal notes for this link"
                maxLength={500}
              />
              <small>Use notes for campaign names, client names, source details, or reminders.</small>
            </div>

            <div className="creatorSubmitPanel">
              <button className="primaryButton premiumCreateButton" disabled={!url || loading} onClick={handleCreate}>
                {loading ? "Creating..." : linkMode === "temporary" ? "Create temporary link" : "Create permanent link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
