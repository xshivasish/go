function getOrdinalDay(day: number) {
  if (day > 3 && day < 21) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDate(value?: string | null) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  const month = date
    .toLocaleString("en-US", { month: "long", timeZone: "UTC" })
    .toLowerCase();

  const day = getOrdinalDay(date.getUTCDate());
  const year = date.getUTCFullYear();
  const hours = padDatePart(date.getUTCHours());
  const minutes = padDatePart(date.getUTCMinutes());
  const seconds = padDatePart(date.getUTCSeconds());

  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} UTC`;
}

export function formatAccess(value?: string) {
  if (!value || value === "free") return "Free";
  if (value === "lifetime") return "Lifetime";
  return formatDate(value);
}

export function entriesFromRecord(record: Record<string, number>) {
  return Object.entries(record || {}).sort((a, b) => b[1] - a[1]);
}
