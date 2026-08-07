import type { ShortenResponse } from "../types";

export function getDestination(link: ShortenResponse) {
  return link.originalUrl || link.url || "";
}

export function getTitle(link: ShortenResponse) {
  return link.title || link.code;
}

export function getNotes(link: ShortenResponse) {
  return link.notes || "";
}
