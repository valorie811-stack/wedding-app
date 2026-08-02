// The 13 app modules — single source of truth for navigation, routing,
// build-phase tagging, and section grouping. i18nKey resolves a label from
// the nav.* dictionary; phase drives the "Phase N" badge on placeholders.
//
// Icons are no longer stored here: each module's `key` doubles as the icon name
// in components/ui/Icon.jsx, so the two can never drift apart.

export const MODULES = [
  { key: "dashboard", route: "/dashboard", section: "plan", phase: 1 },
  { key: "scheduler", route: "/scheduler", section: "plan", phase: 2 },
  { key: "planning", route: "/planning", section: "plan", phase: 2 },

  { key: "guests", route: "/guests", section: "people", phase: 2 },
  { key: "rsvp", route: "/rsvp", section: "people", phase: 2 },
  { key: "tables", route: "/tables", section: "people", phase: 3 },
  { key: "vendors", route: "/vendors", section: "people", phase: 2 },

  { key: "budget", route: "/budget", section: "money", phase: 2 },
  { key: "finance", route: "/finance", section: "money", phase: 3 },

  { key: "moodboards", route: "/moodboards", section: "culture", phase: 3 },
  { key: "attire", route: "/attire", section: "culture", phase: 3 },
  { key: "traditions", route: "/traditions", section: "culture", phase: 4 },

  { key: "settings", route: "/settings", section: "admin", phase: 4 },
];

export const SECTIONS = [
  { key: "plan", i18n: "nav.sectionPlan" },
  { key: "people", i18n: "nav.sectionPeople" },
  { key: "money", i18n: "nav.sectionMoney" },
  { key: "culture", i18n: "nav.sectionCulture" },
  { key: "admin", i18n: "nav.sectionAdmin" },
];

export function moduleByRoute(route) {
  return MODULES.find((m) => route.startsWith(m.route));
}
