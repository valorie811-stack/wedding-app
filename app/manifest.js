// File-based PWA manifest (Next App Router serves it at /manifest.webmanifest
// and auto-links it in <head>).
export default function manifest() {
  return {
    name: "Two Weddings — Planner",
    short_name: "Two Weddings",
    description:
      "Cross-cultural wedding planner for Hải Phòng, Vietnam & Kota Kinabalu, Malaysia (October 2027).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfbfa",
    theme_color: "#263D30",
    lang: "en",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
