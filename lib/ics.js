// iCalendar (RFC 5545) builder for the event scheduler.
//
// Produces a VCALENDAR that Google Calendar, Apple Calendar, and Outlook can
// import. Timed events are anchored to their venue timezone via TZID so the
// clock time stays correct no matter where the importer lives; events without
// a start time become all-day (VALUE=DATE).
//
// Pure + dependency-free so it runs on the client or the server.

const PRODID = "-//Two Weddings//Event Scheduler//EN";

// Venue timezones. Neither Vietnam nor Malaysia observes DST, so each is a
// single fixed-offset STANDARD component. Shared events default to Ho_Chi_Minh.
const TZ = {
  HP: { id: "Asia/Ho_Chi_Minh", offset: "+0700", name: "+07" },
  KK: { id: "Asia/Kuching", offset: "+0800", name: "+08" },
};
const DEFAULT_TZ = TZ.HP;

function tzForCode(code) {
  return TZ[code] || DEFAULT_TZ;
}

// Escape TEXT values per RFC 5545 §3.3.11.
function escapeText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold content lines at 75 octets (RFC 5545 §3.1). Continuation lines start
// with a single space. We fold by UTF-8 byte length, not char count.
function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  let out = "";
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const chBytes = enc.encode(ch).length;
    // Leave room; continuation lines get a leading space (counts toward 75).
    const limit = out === "" ? 75 : 74;
    if (curBytes + chBytes > limit) {
      out += (out === "" ? "" : "\r\n ") + cur;
      cur = ch;
      curBytes = chBytes;
    } else {
      cur += ch;
      curBytes += chBytes;
    }
  }
  out += (out === "" ? "" : "\r\n ") + cur;
  return out;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// "2027-10-09" -> "20271009"
function dateCompact(dateStr) {
  return String(dateStr).replace(/-/g, "");
}

// "09:00" or "09:00:00" -> "090000"
function timeCompact(timeStr) {
  const [h = "0", m = "0", s = "0"] = String(timeStr).split(":");
  return `${pad(h)}${pad(m)}${pad(s)}`;
}

// Add one day to a "YYYY-MM-DD" string (for all-day DTEND, which is exclusive).
function nextDay(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// UTC timestamp for DTSTAMP: "20260703T120000Z"
function utcStamp(date = new Date()) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function vtimezone(tz) {
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${tz.id}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    `TZOFFSETFROM:${tz.offset}`,
    `TZOFFSETTO:${tz.offset}`,
    `TZNAME:${tz.name}`,
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

function eventTitle(ev, locale = "en") {
  return ev.name?.[locale] || ev.name?.en || ev.name?.vi || ev.name?.zh || "Event";
}

function eventDescription(ev, labels = {}) {
  const parts = [];
  if (ev.type) parts.push(labels[ev.type] || ev.type);
  if (ev.dress) parts.push(`${labels.dressCode || "Dress code"}: ${ev.dress}`);
  if (ev.halal) parts.push(labels.halal || "Halal");
  if (ev.notes) parts.push(ev.notes);
  return parts.join(" · ");
}

// Stable UID: reuse the row id when present, else derive from title+date.
function eventUid(ev) {
  const base = ev.id != null ? String(ev.id) : `${dateCompact(ev.date || "")}-${eventTitle(ev)}`;
  return `${base.replace(/[^A-Za-z0-9-]/g, "-")}@two-weddings`;
}

function buildVevent(ev, { locale, labels, stamp }) {
  if (!ev.date) return null;
  const lines = ["BEGIN:VEVENT", `UID:${eventUid(ev)}`, `DTSTAMP:${stamp}`];

  if (ev.start) {
    const tz = tzForCode(ev.code);
    const startVal = `${dateCompact(ev.date)}T${timeCompact(ev.start)}`;
    lines.push(`DTSTART;TZID=${tz.id}:${startVal}`);
    const endTime = ev.end || ev.start;
    const endVal = `${dateCompact(ev.date)}T${timeCompact(endTime)}`;
    lines.push(`DTEND;TZID=${tz.id}:${endVal}`);
  } else {
    // All-day: DTEND is exclusive, so use the next day.
    lines.push(`DTSTART;VALUE=DATE:${dateCompact(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${dateCompact(nextDay(ev.date))}`);
  }

  lines.push(`SUMMARY:${escapeText(eventTitle(ev, locale))}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  const desc = eventDescription(ev, labels);
  if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
  lines.push("END:VEVENT");
  return lines;
}

/**
 * Build a full iCalendar document string from an array of events.
 * @param {Array} events  Calendar events ({ id, code, name, date, start, end, location, type, dress, halal, notes }).
 * @param {Object} [opts]
 * @param {string} [opts.locale="en"]  Locale for SUMMARY.
 * @param {Object} [opts.labels]       Localized labels for DESCRIPTION (type keys, dressCode, halal).
 * @param {string} [opts.calendarName] X-WR-CALNAME shown by some clients.
 * @returns {string} ICS text with CRLF line endings.
 */
export function buildICS(events, opts = {}) {
  const { locale = "en", labels = {}, calendarName = "Wedding Schedule" } = opts;
  const stamp = utcStamp();
  const dated = (events || []).filter((e) => e && e.date);

  const usedZones = new Set();
  dated.forEach((e) => {
    if (e.start) usedZones.add(tzForCode(e.code).id);
  });

  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  // Emit only the timezones actually referenced.
  Object.values(TZ)
    .filter((tz) => usedZones.has(tz.id))
    .forEach((tz) => rows.push(...vtimezone(tz)));

  dated.forEach((ev) => {
    const v = buildVevent(ev, { locale, labels, stamp });
    if (v) rows.push(...v);
  });

  rows.push("END:VCALENDAR");
  return rows.map(foldLine).join("\r\n") + "\r\n";
}

// Exposed for testing.
export const _internal = { escapeText, foldLine, timeCompact, nextDay, tzForCode };
