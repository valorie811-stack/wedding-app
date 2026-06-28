// Role definitions and what each role can see. Drives nav filtering now and
// will back row-level access policies in Phase 4.

export const ROLES = ["owner", "planner", "family", "party", "guest", "vendor"];

export const ROLE_ORDER = {
  owner: 0,
  planner: 1,
  family: 2,
  party: 3,
  vendor: 4,
  guest: 5,
};

// Module keys each role may open. "*" = everything.
export const ROLE_MODULES = {
  owner: ["*"],
  planner: [
    "dashboard",
    "scheduler",
    "guests",
    "rsvp",
    "tables",
    "budget",
    "finance",
    "vendors",
    "moodboards",
    "attire",
    "planning",
    "traditions",
  ],
  family: ["dashboard", "scheduler", "moodboards", "finance", "traditions", "planning"],
  party: ["dashboard", "scheduler", "attire", "rsvp", "traditions"],
  vendor: ["scheduler", "traditions"],
  guest: ["rsvp", "traditions"],
};

export function canAccess(role, moduleKey) {
  const allowed = ROLE_MODULES[role] || [];
  return allowed.includes("*") || allowed.includes(moduleKey);
}
