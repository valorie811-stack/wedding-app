// The 13 app modules — single source of truth for navigation, routing,
// build-phase tagging, and section grouping. i18nKey resolves a label from
// the nav.* dictionary; phase drives the "Phase N" badge on placeholders.

export const MODULES = [
  { key: "dashboard", route: "/dashboard", icon: "🏠", section: "plan", phase: 1 },
  { key: "scheduler", route: "/scheduler", icon: "🗓️", section: "plan", phase: 2 },
  { key: "planning", route: "/planning", icon: "📅", section: "plan", phase: 2 },

  { key: "guests", route: "/guests", icon: "👥", section: "people", phase: 2 },
  { key: "rsvp", route: "/rsvp", icon: "📬", section: "people", phase: 2 },
  { key: "tables", route: "/tables", icon: "🪑", section: "people", phase: 3 },
  { key: "vendors", route: "/vendors", icon: "🏢", section: "people", phase: 2 },

  { key: "budget", route: "/budget", icon: "💰", section: "money", phase: 2 },
  { key: "finance", route: "/finance", icon: "📊", section: "money", phase: 3 },

  { key: "moodboards", route: "/moodboards", icon: "🎨", section: "culture", phase: 3 },
  { key: "attire", route: "/attire", icon: "👗", section: "culture", phase: 3 },
  { key: "traditions", route: "/traditions", icon: "📖", section: "culture", phase: 4 },

  { key: "settings", route: "/settings", icon: "⚙️", section: "admin", phase: 4 },
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
