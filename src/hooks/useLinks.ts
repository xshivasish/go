import { useEffect, useMemo, useState } from "react";
import type { LinksResponse, LinkMode, ShortenResponse } from "../types";
import { apiCall, authHeader, errorMessage } from "../lib/api";
import { getDestination, getNotes, getTitle } from "../lib/linkHelpers";

type Notify = {
  showSuccess: (text: string) => void;
  showError: (text: string) => void;
};

export type CreateLinkPayload = {
  url: string;
  customCode?: string;
  title: string;
  notes: string;
  linkMode: LinkMode;
  expiresIn?: string;
  customExpiresAt?: string;
};

/** Owns the signed-in user's link list: loading, search, derived stats, and mutations. */
export function useLinks(token: string | undefined, isSignedIn: boolean, notify: Notify) {
  const [links, setLinks] = useState<ShortenResponse[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const stats = useMemo(() => {
    const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
    const activeLinks = links.filter((link) => link.status === "active").length;
    const inactiveLinks = links.filter((link) => link.status !== "active").length;

    return { totalLinks: links.length, totalClicks, activeLinks, inactiveLinks };
  }, [links]);

  const permanentManagedLinks = useMemo(
    () => links.filter((link) => String(link.type || "").toLowerCase() === "permanent").length,
    [links]
  );

  const temporaryManagedLinks = useMemo(
    () => links.filter((link) => String(link.type || "").toLowerCase() === "temporary").length,
    [links]
  );

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

  async function loadLinks() {
    if (!token) return;

    setDashboardLoading(true);

    try {
      const data = (await apiCall("/links", {
        method: "GET",
        headers: authHeader(token),
      })) as LinksResponse;

      setLinks(data.links || []);
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to load links"));
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (isSignedIn) {
      loadLinks();
    } else {
      setLinks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function createLink(payload: CreateLinkPayload) {
    if (!token) throw new Error("Please sign in first.");

    setActionLoading(true);

    try {
      const data = (await apiCall("/user/shorten", {
        method: "POST",
        headers: authHeader(token),
        body: JSON.stringify({
          url: payload.url,
          customCode: payload.customCode || undefined,
          title: payload.title,
          notes: payload.notes,
          linkMode: payload.linkMode,
          expiresIn: payload.linkMode === "temporary" ? payload.expiresIn : undefined,
          customExpiresAt:
            payload.linkMode === "temporary" && payload.expiresIn === "custom"
              ? payload.customExpiresAt
              : undefined,
        }),
      })) as ShortenResponse;

      await loadLinks();
      notify.showSuccess(
        payload.linkMode === "temporary" ? "Temporary account link created." : "Permanent link created."
      );

      return data;
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to create account link"));
      return null;
    } finally {
      setActionLoading(false);
    }
  }

  async function updateLinkDetails(
    code: string,
    payload: { originalUrl: string; title: string; notes: string }
  ) {
    if (!token) return false;

    const normalizedCode = code.toLowerCase();
    setActionLoading(true);

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "PATCH",
        headers: authHeader(token),
        body: JSON.stringify(payload),
      });

      await loadLinks();
      notify.showSuccess("Link details updated.");
      return true;
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to update link"));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function updateLinkStatus(code: string, status: "active" | "inactive") {
    if (!token) return;

    const normalizedCode = code.toLowerCase();
    setActionLoading(true);

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "PATCH",
        headers: authHeader(token),
        body: JSON.stringify({ status }),
      });

      await loadLinks();
      notify.showSuccess(status === "active" ? "Link reactivated." : "Link deactivated.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to update status"));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteLink(code: string) {
    if (!token) return;

    const normalizedCode = code.toLowerCase();
    setActionLoading(true);

    try {
      await apiCall(`/links/${normalizedCode}`, {
        method: "DELETE",
        headers: authHeader(token),
      });

      setLinks((current) => current.filter((link) => link.code.toLowerCase() !== normalizedCode));
      notify.showSuccess("Link permanently deleted.");
    } catch (error) {
      notify.showError(errorMessage(error, "Failed to delete link"));
    } finally {
      setActionLoading(false);
    }
  }

  return {
    links,
    filteredLinks,
    linkSearchQuery,
    setLinkSearchQuery,
    dashboardLoading,
    actionLoading,
    stats,
    permanentManagedLinks,
    temporaryManagedLinks,
    loadLinks,
    createLink,
    updateLinkDetails,
    updateLinkStatus,
    deleteLink,
  };
}
