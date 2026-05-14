import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { buildLogoutUrl } from "./auth";
import logo from "./assets/go.png";
import "./App.css";

type Theme = "light" | "dark";

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

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("go-theme") as Theme) || "light";
  });

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
      const normalizedCustomCode = customCode.trim().toLowerCase();

      const data = (await apiCall("/user/shorten", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: userUrl,
          customCode: normalizedCustomCode || undefined,
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
      const data = (await apiCall(`/links/${code.toLowerCase()}/clicks`, {
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
      await apiCall(`/links/${code.toLowerCase()}`, {
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
      await apiCall(`/links/${code.toLowerCase()}`, {
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

  function copyText(value: string) {
    navigator.clipboard.writeText(value);
    showSuccess("Copied to clipboard.");
  }

  return (
    <main className={`bitlyShell ${theme}`}>
      <header className="topNav">
        <a className="brand" href="/">
          <img src={logo} alt="Go by 17bytes logo" />
          <span>Go</span>
        </a>

        <nav className="desktopLinks">
          <a href="#shorten">Shorten</a>
          <a href="#features">Features</a>
          {isSignedIn && <a href="#dashboard">Dashboard</a>}
        </nav>

        <div className="navActions">
          <button
            className="textButton"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "Dark mode" : "Day mode"}
          </button>

          {auth.isLoading ? (
            <span className="navMuted">Checking...</span>
          ) : isSignedIn ? (
            <>
              <span className="accountPill">
                {auth.user?.profile.email || "Signed in"}
              </span>
              <button className="outlineButton navButton" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="textButton" onClick={() => auth.signinRedirect()}>
                Log in
              </button>
              <button
                className="primaryButton navButton"
                onClick={() => auth.signinRedirect()}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <p className="heroLabel">Go by 17bytes</p>
        <h1>Short links, big results</h1>
        <p className="heroCopy">
          A simple link shortener for temporary links, custom aliases, analytics,
          and full link management.
        </p>

        <div className="heroCtas">
          {!isSignedIn && (
            <button
              className="primaryButton largeButton"
              onClick={() => auth.signinRedirect()}
            >
              Get started for free
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
          Want custom aliases and permanent links? Sign in and use your dashboard.
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
          <p>Track clicks, referrers, timestamps, and device information.</p>
        </article>
      </section>

      {isSignedIn && (
        <>
          <section className="accountCreator">
            <div>
              <p className="sectionKicker">Your account</p>
              <h2>Create a permanent link</h2>
              <p>
                Permanent links stay in your dashboard and can be edited,
                paused, measured, or deleted.
              </p>
            </div>

            <div className="accountForm">
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

              <button
                className="primaryButton"
                disabled={!userUrl || loading}
                onClick={createPermanentLink}
              >
                {loading ? "Creating..." : "Create link"}
              </button>
            </div>
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

                      <strong>{link.code.toLowerCase()}</strong>

                      <a href={link.shortUrl} target="_blank" rel="noreferrer">
                        {link.shortUrl}
                      </a>
                    </div>

                    <div className="destinationCell">
                      {editingCode === link.code.toLowerCase() ? (
                        <div className="editForm">
                          <input
                            value={editingUrl}
                            onChange={(event) => setEditingUrl(event.target.value)}
                            placeholder="https://new-destination.com"
                          />

                          <div className="inlineActions">
                            <button
                              className="primaryButton smallButton"
                              disabled={!editingUrl || loading}
                              onClick={() => updateLinkUrl(link.code)}
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
                        <p>{getDestination(link)}</p>
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
                  <span>{click.referrer || "Direct / unknown referrer"}</span>
                  <small>{click.userAgent || "Unknown device"}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <strong>Go by 17bytes</strong>
        <span>Shorten. Share. Measure.</span>
      </footer>
    </main>
  );
}

export default App;