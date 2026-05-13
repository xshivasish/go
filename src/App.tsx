import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import "./App.css";


type ShortenResponse = {
  code: string;
  shortUrl: string;
  originalUrl?: string;
  url?: string;
  status: string;
  type: string;
  clickCount: number;
  expiresAt: string | null;
  createdAt: string;
  lastClickedAt?: string | null;
};

type ClickItem = {
  code: string;
  clickedAt: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
};

type LinksResponse = {
  count: number;
  links: ShortenResponse[];
};

type ClicksResponse = {
  count: number;
  clicks: ClickItem[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  const [guestUrl, setGuestUrl] = useState("");
  const [userUrl, setUserUrl] = useState("");
  const [customCode, setCustomCode] = useState("");

  const [createdLink, setCreatedLink] = useState<ShortenResponse | null>(null);
  const [links, setLinks] = useState<ShortenResponse[]>([]);
  const [clicks, setClicks] = useState<ClickItem[]>([]);

  const [selectedCode, setSelectedCode] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [editingUrl, setEditingUrl] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const token = auth.user?.id_token;

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

  function getDestination(link: ShortenResponse) {
    return link.originalUrl || link.url || "";
  }

  function showSuccess(text: string) {
    setMessageType("success");
    setMessage(text);
  }

  function showError(text: string) {
    setMessageType("error");
    setMessage(text);
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
      const data = (await apiCall("/user/shorten", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: userUrl,
          customCode: customCode || undefined,
        }),
      })) as ShortenResponse;

      setCreatedLink(data);
      setUserUrl("");
      setCustomCode("");
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

    setSelectedCode(code);
    setClicks([]);
    setMessage("");

    try {
      const data = (await apiCall(`/links/${code}/clicks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })) as ClicksResponse;

      setClicks(data.clicks || []);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to load clicks");
    }
  }

  async function updateLinkUrl(code: string) {
    if (!token) return;

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalUrl: editingUrl,
        }),
      });

      setEditingCode("");
      setEditingUrl("");

      await loadLinks();

      showSuccess("Link destination updated.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update link");
    } finally {
      setLoading(false);
    }
  }

  async function updateLinkStatus(code: string, status: "active" | "inactive") {
    if (!token) return;

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
        }),
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

    const confirmed = window.confirm(
      `Permanently delete ${code}? This will remove it from your dashboard and delete its click history.`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      await apiCall(`/links/${code}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLinks((currentLinks) =>
        currentLinks.filter((link) => link.code !== code)
      );

      if (selectedCode === code) {
        setSelectedCode("");
        setClicks([]);
      }

      showSuccess("Link permanently deleted.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to delete link");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(link: ShortenResponse) {
    setEditingCode(link.code);
    setEditingUrl(getDestination(link));
  }

  function cancelEditing() {
    setEditingCode("");
    setEditingUrl("");
  }

  function signOut() {
    auth.removeUser();
    setLinks([]);
    setClicks([]);
    setSelectedCode("");
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

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadLinks();
    }
  }, [auth.isAuthenticated]);

  return (
    <main className="page">
      <section className="hero">
        <div className="topbar">
          <div className="badge">Go by 17bytes</div>

          <div className="authArea">
            {auth.isLoading ? (
              <span className="authText">Checking login...</span>
            ) : auth.isAuthenticated ? (
              <>
                <span className="authText">
                  {auth.user?.profile.email || "Signed in"}
                </span>
                <button className="secondary smallButton" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <button
                className="secondary smallButton"
                onClick={() => auth.signinRedirect()}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <h1>Short links that move fast.</h1>

        <p>
          Create temporary links instantly. Sign in to unlock permanent links,
          custom aliases, analytics, and full link management.
        </p>
      </section>

      {auth.error && (
        <section className="error">Auth error: {auth.error.message}</section>
      )}

      {message && (
        <section className={messageType === "success" ? "noticeBox" : "error"}>
          {message}
        </section>
      )}

      {createdLink && (
        <section className="success">
          <span>Created link</span>

          <a href={createdLink.shortUrl} target="_blank" rel="noreferrer">
            {createdLink.shortUrl}
          </a>

          <small>
            {createdLink.type} · {createdLink.status}
            {createdLink.expiresAt ? ` · expires ${createdLink.expiresAt}` : ""}
          </small>
        </section>
      )}

      <section className="cards">
        <div className="card">
          <h2>Temporary guest link</h2>
          <p>No account needed. Good for quick sharing.</p>

          <div className="stack">
            <input
              value={guestUrl}
              onChange={(event) => setGuestUrl(event.target.value)}
              placeholder="https://example.com"
              onKeyDown={(event) => {
                if (event.key === "Enter" && guestUrl && !loading) {
                  createTemporaryLink();
                }
              }}
            />

            <button disabled={!guestUrl || loading} onClick={createTemporaryLink}>
              {loading ? "Creating..." : "Create temporary link"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Permanent user link</h2>

          {!auth.isAuthenticated ? (
            <>
              <p>Sign in to create permanent links with custom aliases.</p>
              <button onClick={() => auth.signinRedirect()}>Sign in first</button>
            </>
          ) : (
            <>
              <p>Create a permanent short link tied to your account.</p>

              <div className="stack">
                <input
                  value={userUrl}
                  onChange={(event) => setUserUrl(event.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && userUrl && !loading) {
                      createPermanentLink();
                    }
                  }}
                />

                <input
                  value={customCode}
                  onChange={(event) => setCustomCode(event.target.value)}
                  placeholder="custom alias, optional"
                />

                <button
                  disabled={!userUrl || loading}
                  onClick={createPermanentLink}
                >
                  {loading ? "Creating..." : "Create permanent link"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {auth.isAuthenticated && (
        <section className="dashboard">
          <div className="dashboardTop">
            <div>
              <h2>Your links</h2>
              <p>
                {links.length === 1
                  ? "1 permanent link"
                  : `${links.length} permanent links`}
              </p>
            </div>

            <button
              className="secondary"
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
            <div className="linkList">
              {links.map((link) => (
                <article className="linkRow" key={link.code}>
                  <div className="linkMain">
                    <div className="linkCode">{link.code}</div>

                    <a href={link.shortUrl} target="_blank" rel="noreferrer">
                      {link.shortUrl}
                    </a>

                    {editingCode === link.code ? (
                      <div className="editArea">
                        <input
                          value={editingUrl}
                          onChange={(event) => setEditingUrl(event.target.value)}
                          placeholder="https://new-destination.com"
                        />

                        <div className="rowActions">
                          <button
                            className="smallButton"
                            disabled={!editingUrl || loading}
                            onClick={() => updateLinkUrl(link.code)}
                          >
                            Save
                          </button>

                          <button
                            className="secondary smallButton"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <small>{getDestination(link)}</small>
                    )}
                  </div>

                  <div className="linkSide">
                    <div className="linkMeta">
                      <span>{link.status}</span>
                      <span>{link.clickCount} clicks</span>
                      <span>Created {formatDate(link.createdAt)}</span>
                      <span>Last click {formatDate(link.lastClickedAt)}</span>
                    </div>

                    <div className="rowActions">
                      <button
                        className="secondary smallButton"
                        onClick={() => loadClicks(link.code)}
                      >
                        Analytics
                      </button>

                      <button
                        className="secondary smallButton"
                        onClick={() => startEditing(link)}
                      >
                        Edit URL
                      </button>

                      {link.status === "active" ? (
                        <button
                          className="secondary smallButton"
                          disabled={loading}
                          onClick={() => updateLinkStatus(link.code, "inactive")}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="secondary smallButton"
                          disabled={loading}
                          onClick={() => updateLinkStatus(link.code, "active")}
                        >
                          Reactivate
                        </button>
                      )}

                      <button
                        className="danger smallButton"
                        disabled={loading}
                        onClick={() => deleteLink(link.code)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {auth.isAuthenticated && selectedCode && (
        <section className="analytics">
          <div className="dashboardTop">
            <div>
              <h2>Analytics</h2>
              <p>
                Click history for <strong>{selectedCode}</strong>
              </p>
            </div>

            <button
              className="secondary"
              onClick={() => {
                setSelectedCode("");
                setClicks([]);
              }}
            >
              Close
            </button>
          </div>

          {clicks.length === 0 ? (
            <div className="emptyState">No clicks recorded yet.</div>
          ) : (
            <div className="clickList">
              {clicks.map((click, index) => (
                <article className="clickRow" key={`${click.clickedAt}-${index}`}>
                  <strong>{formatDate(click.clickedAt)}</strong>
                  <small>{click.referrer || "Direct / unknown referrer"}</small>
                  <small>{click.userAgent || "Unknown device"}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;