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
    // Raster, not SVG: the icon is a photograph. The maskable variant insets
    // the photo into a themed field, since maskable icons are cropped to a
    // circle/squircle and only the middle ~80% is guaranteed to survive.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
