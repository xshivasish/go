import { useState } from "react";
import { BarChart3, Copy, Eye, EyeOff, Pencil, QrCode, RefreshCw, Search, Trash2 } from "lucide-react";
import type { ShortenResponse } from "../types";
import { formatDate } from "../lib/format";
import { getDestination, getNotes, getTitle } from "../lib/linkHelpers";
import { Modal } from "./Modal";

type Stats = { totalLinks: number; totalClicks: number; activeLinks: number; inactiveLinks: number };

type LinkManagerModalProps = {
  onClose: () => void;
  links: ShortenResponse[];
  filteredLinks: ShortenResponse[];
  stats: Stats;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  dashboardLoading: boolean;
  actionLoading: boolean;
  onRefresh: () => void;
  onCopy: (value: string) => void;
  onOpenAnalytics: (code: string) => void;
  onOpenQr: (code: string) => void;
  onUpdateStatus: (code: string, status: "active" | "inactive") => void;
  onUpdateDetails: (code: string, payload: { originalUrl: string; title: string; notes: string }) => Promise<boolean>;
  onDeleteRequest: (code: string) => void;
};

export function LinkManagerModal({
  onClose,
  links,
  filteredLinks,
  stats,
  searchQuery,
  onSearchChange,
  dashboardLoading,
  actionLoading,
  onRefresh,
  onCopy,
  onOpenAnalytics,
  onOpenQr,
  onUpdateStatus,
  onUpdateDetails,
  onDeleteRequest,
}: LinkManagerModalProps) {
  const [editingCode, setEditingCode] = useState("");
  const [editingUrl, setEditingUrl] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

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

  async function saveEditing(code: string) {
    const saved = await onUpdateDetails(code, {
      originalUrl: editingUrl,
      title: editingTitle,
      notes: editingNotes,
    });

    if (saved) cancelEditing();
  }

  return (
    <Modal onClose={onClose} panelClassName="linkManagerPanel" ariaLabel="Manage your links">
      <div className="dashboardHeader linkManagerTop">
        <div>
          <p className="sectionKicker">Link manager</p>
          <h2>Manage your links</h2>
          <p className="helperText">
            Copy, analyze, generate QR codes, edit, pause, reactivate, or delete your managed links.
          </p>
        </div>
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
        <div className="dashboardHeader">
          <div>
            <p className="sectionKicker">Dashboard</p>
            <h2>Your links</h2>
            <p className="helperText">Search by title, short link, custom alias, notes, or destination URL.</p>
          </div>

          <div className="dashboardHeaderActions">
            <div className="searchInputWrap">
              <Search size={15} strokeWidth={2.25} />
              <input
                className="dashboardSearchInput"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search links, title, notes, alias, or URL"
                aria-label="Search links"
              />
            </div>

            <button className="outlineButton" disabled={dashboardLoading} onClick={onRefresh}>
              <RefreshCw size={14} strokeWidth={2.25} className={dashboardLoading ? "spinIcon" : ""} />
              {dashboardLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {dashboardLoading && links.length === 0 ? (
          <div className="emptyState">Loading your links...</div>
        ) : links.length === 0 ? (
          <div className="emptyState">No permanent links yet. Create your first one above.</div>
        ) : filteredLinks.length === 0 ? (
          <div className="emptyState">
            No links found for “{searchQuery}”. Try searching by title, alias, notes, short link, or
            destination URL.
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
                  <span className={link.status === "active" ? "statusPill active" : "statusPill inactive"}>
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
                          disabled={!editingUrl || actionLoading}
                          onClick={() => saveEditing(link.code)}
                        >
                          Save
                        </button>
                        <button className="outlineButton smallButton" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{getDestination(link)}</p>
                      <div className="linkMetaStack">
                        <small>{link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : "Does not expire"}</small>
                        {getNotes(link) && <small className="notesText">{getNotes(link)}</small>}
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
                  <button className="iconButton" title="Copy" onClick={() => onCopy(link.shortUrl)}>
                    <Copy size={15} strokeWidth={2.25} />
                  </button>
                  <button className="iconButton" title="Analytics" onClick={() => onOpenAnalytics(link.code)}>
                    <BarChart3 size={15} strokeWidth={2.25} />
                  </button>
                  <button className="iconButton" title="QR code" onClick={() => onOpenQr(link.code)}>
                    <QrCode size={15} strokeWidth={2.25} />
                  </button>
                  <button className="iconButton" title="Edit" onClick={() => startEditing(link)}>
                    <Pencil size={15} strokeWidth={2.25} />
                  </button>

                  {link.status === "active" ? (
                    <button
                      className="iconButton"
                      title="Deactivate"
                      disabled={actionLoading}
                      onClick={() => onUpdateStatus(link.code, "inactive")}
                    >
                      <EyeOff size={15} strokeWidth={2.25} />
                    </button>
                  ) : (
                    <button
                      className="iconButton"
                      title="Reactivate"
                      disabled={actionLoading}
                      onClick={() => onUpdateStatus(link.code, "active")}
                    >
                      <Eye size={15} strokeWidth={2.25} />
                    </button>
                  )}

                  <button
                    className="iconButton iconButtonDanger"
                    title="Delete"
                    disabled={actionLoading}
                    onClick={() => onDeleteRequest(link.code)}
                  >
                    <Trash2 size={15} strokeWidth={2.25} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Modal>
  );
}
