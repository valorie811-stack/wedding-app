// Local fallback data — mirrors supabase/seed.sql so the app renders before
// Supabase keys are added (preview mode). Once connected, lib/data.js reads
// from Postgres instead and this file is unused at runtime.
//
// Synthetic ids (seed-*) let Phase 2 modules treat preview rows the same way
// they treat live rows for local edit/add/delete. They never reach the DB.

export const SEED_WEDDINGS = [
  { code: "HP", currency: "VND", city: "Hải Phòng", country: "Vietnam", event_date: "2027-10-08" },
  { code: "KK", currency: "MYR", city: "Kota Kinabalu", country: "Malaysia", event_date: "2027-10-16" },
];

export const SEED_EVENTS = [
  { id: "seed-e1", code: "HP", name: { en: "Family Introduction (Lễ Dạm Ngõ)", vi: "Lễ Dạm Ngõ", zh: "提亲" }, date: "2027-10-08", start: "17:00", end: "20:00", location: "Bride's family home", type: "gathering", halal: false },
  { id: "seed-e2", code: "HP", name: { en: "Engagement Ceremony (Lễ Ăn Hỏi)", vi: "Lễ Ăn Hỏi", zh: "订婚礼" }, date: "2027-10-09", start: "09:00", end: "13:00", location: "Bride's family home", type: "ceremony", halal: false },
  { id: "seed-e3", code: "HP", name: { en: "Wedding Reception (Lễ Cưới)", vi: "Lễ Cưới", zh: "婚礼" }, date: "2027-10-10", start: "11:00", end: "22:00", location: "Hải Phòng banquet hall", type: "reception", halal: false },
  { id: "seed-e4", code: "KK", name: { en: "Tea Ceremony & Evening Banquet", vi: "Lễ trà & Tiệc tối", zh: "敬茶礼与晚宴" }, date: "2027-10-16", start: "08:00", end: "22:00", location: "Kota Kinabalu hotel", type: "ceremony", halal: false },
  { id: "seed-e5", code: "KK", name: { en: "Halal-Friendly Lunch", vi: "Tiệc trưa Halal", zh: "清真午宴" }, date: "2027-10-17", start: "12:00", end: "15:00", location: "Kota Kinabalu (Halal venue)", type: "reception", halal: true },
];

// Planned budget — ONE overall amount per wedding + category.
export const SEED_BUDGET_CATEGORIES = [
  { id: "seed-bc1", code: "HP", currency: "VND", category: "Venue", planned: 120000000 },
  { id: "seed-bc2", code: "HP", currency: "VND", category: "Catering", planned: 200000000 },
  { id: "seed-bc3", code: "HP", currency: "VND", category: "Attire", planned: 60000000 },
  { id: "seed-bc4", code: "HP", currency: "VND", category: "Photography", planned: 40000000 },
  { id: "seed-bc5", code: "HP", currency: "VND", category: "Florals", planned: 30000000 },
  { id: "seed-bc6", code: "KK", currency: "MYR", category: "Venue", planned: 25000 },
  { id: "seed-bc7", code: "KK", currency: "MYR", category: "Catering", planned: 40000 },
  { id: "seed-bc8", code: "KK", currency: "MYR", category: "Attire", planned: 8000 },
  { id: "seed-bc9", code: "KK", currency: "MYR", category: "Photography", planned: 12000 },
  { id: "seed-bc10", code: "KK", currency: "MYR", category: "Transport", planned: 5000 },
];

// Actual expense items — a category may have several.
//
// Vendor deposits are NOT listed here. They are derived from SEED_VENDORS by
// vendorPaymentItems() so the Budget page shows them without a second copy to
// keep in sync — the venue, photography and catering deposits below used to be
// duplicated here and in the vendor rows, double-counting the same payments.
export const SEED_BUDGET_ITEMS = [
  { id: "seed-bi2", code: "HP", currency: "VND", category: "Venue", label: "Banquet hall balance", actual: 40000000 },
  { id: "seed-bi3", code: "HP", currency: "VND", category: "Catering", label: "Catering deposit", actual: 80000000 },
  { id: "seed-bi4", code: "HP", currency: "VND", category: "Catering", label: "Menu tasting & add-ons", actual: 20000000 },
  { id: "seed-bi5", code: "HP", currency: "VND", category: "Catering", label: "Banquet balance", actual: 80000000 },
  { id: "seed-bi6", code: "HP", currency: "VND", category: "Attire", label: "Áo dài (bride)", actual: 35000000 },
  { id: "seed-bi7", code: "HP", currency: "VND", category: "Attire", label: "Groom suits", actual: 20000000 },
  { id: "seed-bi9", code: "HP", currency: "VND", category: "Florals", label: "Ceremony flowers deposit", actual: 12000000 },
  { id: "seed-bi11", code: "KK", currency: "MYR", category: "Venue", label: "Ballroom balance", actual: 12000 },
  { id: "seed-bi12", code: "KK", currency: "MYR", category: "Catering", label: "Banquet catering", actual: 23000 },
  { id: "seed-bi14", code: "KK", currency: "MYR", category: "Attire", label: "Qipao", actual: 4000 },
  { id: "seed-bi15", code: "KK", currency: "MYR", category: "Attire", label: "Changshan", actual: 2500 },
  { id: "seed-bi17", code: "KK", currency: "MYR", category: "Transport", label: "Car deposit", actual: 2000 },
];

export const SEED_TASKS = [
  { id: "seed-t1", code: "HP", title: "Confirm banquet hall deposit", due: "2026-07-15", status: "in_progress", assignee: "Couple" },
  { id: "seed-t2", code: "HP", title: "Order mâm quả trays for Lễ Ăn Hỏi", due: "2027-08-01", status: "todo", assignee: "Groom's family" },
  { id: "seed-t3", code: "HP", title: "Book áo dài fittings", due: "2026-09-01", status: "todo", assignee: "Bride" },
  { id: "seed-t4", code: "HP", title: "Finalise Lễ Cưới run sheet", due: "2027-09-20", status: "todo", assignee: "Planner" },
  { id: "seed-t5", code: "KK", title: "Verify Halal certification for Day 2 venue", due: "2026-08-01", status: "todo", assignee: "Planner" },
  { id: "seed-t6", code: "KK", title: "Confirm tea ceremony set & red packets", due: "2027-09-01", status: "todo", assignee: "Couple" },
  { id: "seed-t7", code: "KK", title: "Book hotel room block", due: "2026-07-30", status: "in_progress", assignee: "Planner" },
  { id: "seed-t8", code: "KK", title: "Arrange transport for Halal lunch guests", due: "2027-09-15", status: "todo", assignee: "Planner" },
  { id: "seed-t9", code: null, title: "Finalise guest list across both weddings", due: "2026-08-15", status: "in_progress", assignee: "Couple" },
  { id: "seed-t10", code: null, title: "Confirm trilingual invitation wording", due: "2026-10-01", status: "done", assignee: "Couple" },
];

export const SEED_VENDORS = [
  { id: "seed-v1", code: "HP", currency: "VND", name: "Hải Phòng Grand Palace", category: "Venue", contact_name: "Mr. Tuấn", email: "events@hpgrand.vn", phone: "+84 225 123 456", contract_status: "booked", total_cost: 120000000, deposit_paid: 40000000, is_halal_certified: false, notes: "Banquet hall for Lễ Cưới, capacity 300." },
  { id: "seed-v2", code: "HP", currency: "VND", name: "Saigon Lens Studio", category: "Photography", contact_name: "Linh Phạm", email: "hello@saigonlens.vn", phone: "+84 90 234 5678", contract_status: "paid", total_cost: 40000000, deposit_paid: 40000000, is_halal_certified: false, notes: "Photo + cinematic video, both VN events." },
  { id: "seed-v3", code: "HP", currency: "VND", name: "Áo Dài Hạnh Couture", category: "Attire", contact_name: "Cô Hạnh", email: "hanh@aodaicouture.vn", phone: "+84 91 555 1212", contract_status: "quoted", total_cost: 60000000, deposit_paid: 0, is_halal_certified: false, notes: "Bridal áo dài + groom suits. Awaiting fitting." },
  { id: "seed-v4", code: "HP", currency: "VND", name: "Bloom & Petal Décor", category: "Florals", contact_name: "Mai Nguyễn", email: "studio@bloompetal.vn", phone: "+84 93 777 8899", contract_status: "enquiry", total_cost: 30000000, deposit_paid: 0, is_halal_certified: false, notes: "Ceremony arch + table florals." },
  { id: "seed-v5", code: "KK", currency: "MYR", name: "Sutera Harbour Resort", category: "Venue", contact_name: "Ms. Farah", email: "weddings@suteraharbour.my", phone: "+60 88 318 888", contract_status: "booked", total_cost: 25000, deposit_paid: 8000, is_halal_certified: true, notes: "Ballroom for tea ceremony & banquet." },
  { id: "seed-v6", code: "KK", currency: "MYR", name: "Borneo Halal Catering", category: "Catering", contact_name: "Encik Razak", email: "book@borneohalal.my", phone: "+60 16 820 4455", contract_status: "booked", total_cost: 40000, deposit_paid: 12000, is_halal_certified: true, notes: "Halal-certified — Day 2 lunch + banquet." },
  { id: "seed-v7", code: "KK", currency: "MYR", name: "KK Frame & Motion", category: "Photography", contact_name: "Daniel Wong", email: "daniel@kkframe.my", phone: "+60 12 345 6677", contract_status: "paid", total_cost: 12000, deposit_paid: 12000, is_halal_certified: false, notes: "Photo + video for both KK events." },
  { id: "seed-v8", code: "KK", currency: "MYR", name: "Sabah Premier Transfers", category: "Transport", contact_name: "Mr. Lim", email: "fleet@sabahtransfers.my", phone: "+60 17 998 2211", contract_status: "quoted", total_cost: 5000, deposit_paid: 0, is_halal_certified: false, notes: "Guest shuttles, airport + venue." },
];

// Guests (mirrors supabase/seed.sql). Wedding membership is derived from which
// events a guest is invited to (see SEED_GUEST_EVENTS), not stored on the guest.
// Shape mirrors the `guests` table exactly. `email`/`phone` used to live here
// too and were left behind when e4a5668 dropped those columns — carrying fields
// the database has no column for is what made that bug hard to see, since
// preview mode kept working while the live write 400'd.
export const SEED_GUESTS = [
  { id: "seed-g1", full_name: "Nguyễn Văn An", side: "bride", plus_one: true, plus_one_name: "Nguyễn Thị Mai", dietary: [], notes: "" },
  { id: "seed-g2", full_name: "Trần Thị Bình", side: "bride", plus_one: false, plus_one_name: "", dietary: ["vegetarian"], notes: "" },
  { id: "seed-g3", full_name: "Lê Hoàng Cường", side: "groom", plus_one: true, plus_one_name: "Phạm Thị Hương", dietary: [], notes: "" },
  { id: "seed-g4", full_name: "Phạm Thu Dung", side: "bride", plus_one: false, plus_one_name: "", dietary: [], notes: "" },
  { id: "seed-g5", full_name: "Đỗ Minh Đức", side: "groom", plus_one: true, plus_one_name: "Trần Thị Ngọc", dietary: [], notes: "" },
  { id: "seed-g6", full_name: "Vũ Thị Hà", side: "bride", plus_one: false, plus_one_name: "", dietary: [], notes: "" },
  { id: "seed-g7", full_name: "Hoàng Văn Hải", side: "groom", plus_one: false, plus_one_name: "", dietary: [], notes: "Awaiting reply" },
  { id: "seed-g8", full_name: "Bùi Thị Lan", side: "bride", plus_one: true, plus_one_name: "Bùi Văn Tú", dietary: [], notes: "" },
  { id: "seed-g9", full_name: "Tan Wei Ming", side: "groom", plus_one: true, plus_one_name: "Tan Siew Lan", dietary: [], notes: "" },
  { id: "seed-g10", full_name: "Lim Mei Ling", side: "bride", plus_one: false, plus_one_name: "", dietary: [], notes: "" },
  { id: "seed-g11", full_name: "Wong Kah Wai", side: "groom", plus_one: true, plus_one_name: "Wong Pui Yee", dietary: [], notes: "" },
  { id: "seed-g12", full_name: "Siti Nurhaliza", side: "bride", plus_one: false, plus_one_name: "", dietary: ["halal"], notes: "" },
  { id: "seed-g13", full_name: "Ahmad Faizal", side: "groom", plus_one: true, plus_one_name: "Nurul Ain", dietary: ["halal"], notes: "" },
  { id: "seed-g14", full_name: "Chong Li Hua", side: "bride", plus_one: false, plus_one_name: "", dietary: [], notes: "Attending both KK events" },
  { id: "seed-g15", full_name: "Goh Boon Hai", side: "groom", plus_one: false, plus_one_name: "", dietary: [], notes: "" },
  { id: "seed-g16", full_name: "Aishah Binti Omar", side: "bride", plus_one: true, plus_one_name: "Omar Bin Yusof", dietary: ["halal"], notes: "" },
  { id: "seed-g17", full_name: "James Carter", side: "groom", plus_one: true, plus_one_name: "Sarah Carter", dietary: [], notes: "" },
  { id: "seed-g18", full_name: "Emily Watson", side: "bride", plus_one: false, plus_one_name: "", dietary: ["vegan"], notes: "" },
];

// Guest ↔ event invitations with RSVP status. event_id references SEED_EVENTS:
// seed-e3 = HP Wedding Reception, seed-e4 = KK Tea Ceremony & Banquet,
// seed-e5 = KK Halal-Friendly Lunch. Mirrors supabase/seed.sql exactly.
export const SEED_GUEST_EVENTS = [
  { guest_id: "seed-g1", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g2", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g3", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g4", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g5", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g6", event_id: "seed-e3", status: "confirmed" },
  { guest_id: "seed-g7", event_id: "seed-e3", status: "pending" },
  { guest_id: "seed-g8", event_id: "seed-e3", status: "declined" },
  { guest_id: "seed-g9", event_id: "seed-e4", status: "confirmed" },
  { guest_id: "seed-g10", event_id: "seed-e4", status: "confirmed" },
  { guest_id: "seed-g11", event_id: "seed-e4", status: "confirmed" },
  { guest_id: "seed-g14", event_id: "seed-e4", status: "confirmed" },
  { guest_id: "seed-g15", event_id: "seed-e4", status: "confirmed" },
  { guest_id: "seed-g17", event_id: "seed-e4", status: "pending" },
  { guest_id: "seed-g18", event_id: "seed-e4", status: "pending" },
  { guest_id: "seed-g12", event_id: "seed-e5", status: "confirmed" },
  { guest_id: "seed-g13", event_id: "seed-e5", status: "confirmed" },
  { guest_id: "seed-g16", event_id: "seed-e5", status: "confirmed" },
  { guest_id: "seed-g14", event_id: "seed-e5", status: "pending" },
];

// One entry per guest_event (status + which wedding) for RSVP aggregation.
// Mirrors supabase/seed.sql: HP reception 6/1/1; KK banquet 5 confirmed +
// 2 pending; KK Halal lunch 3 confirmed + 1 pending.
export const SEED_RSVP = [
  ...Array(6).fill({ code: "HP", status: "confirmed" }),
  { code: "HP", status: "pending" },
  { code: "HP", status: "declined" },
  ...Array(5).fill({ code: "KK", status: "confirmed" }), // banquet
  ...Array(2).fill({ code: "KK", status: "pending" }),
  ...Array(3).fill({ code: "KK", status: "confirmed" }), // Halal lunch
  { code: "KK", status: "pending" },
];

// Seating tables (Phase 3 Table Planner) + sample assignments.
export const SEED_TABLES = [
  { id: "seed-tb1", code: "HP", name: "Family Table 1", capacity: 10, sort_order: 1 },
  { id: "seed-tb2", code: "HP", name: "Family Table 2", capacity: 10, sort_order: 2 },
  { id: "seed-tb3", code: "HP", name: "Friends Table", capacity: 10, sort_order: 3 },
  { id: "seed-tb4", code: "KK", name: "Head Table", capacity: 8, sort_order: 1 },
  { id: "seed-tb5", code: "KK", name: "Table A", capacity: 8, sort_order: 2 },
];

export const SEED_SEATING_ASSIGNMENTS = [
  { id: "seed-sa1", table_id: "seed-tb1", guest_id: "seed-g1" },
  { id: "seed-sa2", table_id: "seed-tb1", guest_id: "seed-g2" },
  { id: "seed-sa3", table_id: "seed-tb1", guest_id: "seed-g3" },
  { id: "seed-sa4", table_id: "seed-tb4", guest_id: "seed-g9" },
  { id: "seed-sa5", table_id: "seed-tb4", guest_id: "seed-g10" },
];

// Mood board items (Phase 3) — image URLs + colour swatches.
export const SEED_MOODBOARD = [
  { id: "seed-mb1", code: "HP", board: "Colour palette", title: "Red & gold", image_url: "https://picsum.photos/seed/hp-palette/600/400", swatches: ["#B0503D", "#B4924C", "#F5E7E3"], notes: "Auspicious reds with gold accents" },
  { id: "seed-mb2", code: "HP", board: "Florals", title: "Ceremony arch", image_url: "https://picsum.photos/seed/hp-florals/600/400", swatches: ["#BC6753", "#DCAC9F", "#E6D8B4"], notes: "Roses + orchids" },
  { id: "seed-mb3", code: "HP", board: "Décor", title: "Banquet tablescape", image_url: "https://picsum.photos/seed/hp-decor/600/400", swatches: ["#6B2E22", "#B4924C"], notes: "Round tables, gold chargers" },
  { id: "seed-mb4", code: "KK", board: "Colour palette", title: "Teal & gold", image_url: "https://picsum.photos/seed/kk-palette/600/400", swatches: ["#2F6E7A", "#B4924C", "#E3EEF1"], notes: "Coastal teal with warm gold" },
  { id: "seed-mb5", code: "KK", board: "Florals", title: "Tropical blooms", image_url: "https://picsum.photos/seed/kk-florals/600/400", swatches: ["#418494", "#C4A566", "#DCAC9F"], notes: "Hibiscus + frangipani" },
];

// Attire items (Phase 3) — per role + wedding, confirmed/inspiration.
export const SEED_ATTIRE = [
  { id: "seed-at1", code: "HP", role: "bride", title: "Áo dài (red & gold)", image_url: "https://picsum.photos/seed/hp-bride/500/700", status: "confirmed", notes: "Tailored, embroidered" },
  { id: "seed-at2", code: "HP", role: "groom", title: "Navy suit", image_url: "https://picsum.photos/seed/hp-groom/500/700", status: "inspiration", notes: "With gold tie" },
  { id: "seed-at3", code: "HP", role: "family", title: "Mothers' áo dài", image_url: "https://picsum.photos/seed/hp-family/500/700", status: "inspiration", notes: "Coordinated colours" },
  { id: "seed-at4", code: "KK", role: "bride", title: "Qipao (teal)", image_url: "https://picsum.photos/seed/kk-bride/500/700", status: "confirmed", notes: "Silk, fitted" },
  { id: "seed-at5", code: "KK", role: "groom", title: "Changshan", image_url: "https://picsum.photos/seed/kk-groom/500/700", status: "inspiration", notes: "Matching teal" },
];

// Members + pending invites (Phase 4 Settings & Access) for preview mode.
export const SEED_MEMBERS = [
  { id: "seed-m1", full_name: "Valorie (you)", role: "owner", locale: "en" },
  { id: "seed-m2", full_name: "Wedding Planner", role: "planner", locale: "vi" },
  { id: "seed-m3", full_name: "Mother of the Bride", role: "family", locale: "vi" },
];

export const SEED_INVITES = [
  { id: "seed-inv1", email: "bestman@example.com", role: "party", created_at: "2026-06-01" },
  { id: "seed-inv2", email: "auntie@example.com", role: "guest", created_at: "2026-06-10" },
];
