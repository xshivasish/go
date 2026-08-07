import { BarChart3, Download, Lock, Sparkles } from "lucide-react";
import type { AnalyticsSummary, ClickItem } from "../types";
import { entriesFromRecord, formatDate } from "../lib/format";
import { Modal } from "./Modal";

type AnalyticsModalProps = {
  code: string;
  summary: AnalyticsSummary;
  limited: boolean;
  visibleClickLimit: number | null;
  upgradeMessage: string;
  clicks: ClickItem[];
  onClose: () => void;
};

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = entriesFromRecord(data);

  return (
    <article className="breakdownCard">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p>No {title.toLowerCase()} data yet.</p>
      ) : (
        entries.map(([name, count]) => (
          <div className="breakdownRow" key={name}>
            <span>{name}</span>
            <strong>{count}</strong>
          </div>
        ))
      )}
    </article>
  );
}

export function AnalyticsModal({
  code,
  summary,
  limited,
  visibleClickLimit,
  upgradeMessage,
  clicks,
  onClose,
}: AnalyticsModalProps) {
  return (
    <Modal onClose={onClose} panelClassName="popupPanel analyticsPanel" ariaLabel={`Analytics for ${code}`}>
      <div className="dashboardHeader">
        <div>
          <p className="sectionKicker">Analytics</p>
          <h2>{code.toLowerCase()}</h2>
        </div>
      </div>

      <div className="analyticsSummaryGrid">
        <article>
          <span>Total clicks</span>
          <strong>{summary.totalClicks}</strong>
        </article>
        <article>
          <span>Unique visitors</span>
          <strong>{summary.uniqueVisitors}</strong>
        </article>
        <article>
          <span>Clicks today</span>
          <strong>{summary.clicksToday}</strong>
        </article>
        <article>
          <span>Top referrer</span>
          <strong>{summary.topReferrer}</strong>
        </article>
      </div>

      <div className="breakdownGrid">
        <BreakdownCard title="Referrers" data={summary.referrers} />
        <BreakdownCard title="Devices" data={summary.devices} />
        <BreakdownCard title="Browsers" data={summary.browsers} />
      </div>

      <div className="premiumAnalyticsGrid">
        <article className={limited ? "lockedFeature" : "aiInsightCard"}>
          <span className="lockIcon">
            <Sparkles size={16} strokeWidth={2.25} />
          </span>
          <h3>AI insights</h3>
          <p>
            Analyze traffic quality, referrers, devices, campaigns, and link performance with
            AI-powered recommendations.
          </p>
          {limited && (
            <a className="outlineButton anchorButton" href="#pricing">
              Upgrade to unlock
            </a>
          )}
        </article>

        <article className={limited ? "lockedFeature" : "aiInsightCard"}>
          <span className="lockIcon">
            <BarChart3 size={16} strokeWidth={2.25} />
          </span>
          <h3>Full analytics history</h3>
          <p>View complete click history, long-term patterns, and detailed analytics for every link.</p>
          {limited && (
            <a className="outlineButton anchorButton" href="#pricing">
              Upgrade to unlock
            </a>
          )}
        </article>

        <article className={limited ? "lockedFeature" : "aiInsightCard"}>
          <span className="lockIcon">
            <Download size={16} strokeWidth={2.25} />
          </span>
          <h3>Export analytics</h3>
          <p>Export click history and performance reports for campaigns, clients, and business records.</p>
          {limited && (
            <a className="outlineButton anchorButton" href="#pricing">
              Upgrade to unlock
            </a>
          )}
        </article>
      </div>

      <div className="recentClicksHeader">
        <h3>Recent clicks</h3>
        <span>
          {limited && visibleClickLimit
            ? `Showing latest ${visibleClickLimit} of ${summary.totalClicks}`
            : `${clicks.length} total`}
        </span>
      </div>

      {limited && (
        <div className="lockedAnalyticsCard">
          <div>
            <span className="lockIcon">
              <Lock size={16} strokeWidth={2.25} />
            </span>
            <h3>Full click history is locked</h3>
            <p>
              {upgradeMessage ||
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
            <article className="clickRow" key={`${click.clickedAt}-${index}`}>
              <div>
                <strong>{formatDate(click.clickedAt)}</strong>
                <span>{click.referrer || "Direct"}</span>
              </div>

              <div className="clickMeta">
                <small>{click.deviceType || "unknown"}</small>
                <small>{click.browser || "Other"}</small>
                <small>{click.visitorHash ? `Visitor ${click.visitorHash.slice(0, 8)}` : "Legacy click"}</small>
              </div>

              <small className="userAgentText">{click.userAgent || "Unknown device"}</small>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
