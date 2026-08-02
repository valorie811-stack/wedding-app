import "./globals.css";
import { IBM_Plex_Mono, Noto_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppProvider } from "@/context/AppContext";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

// Chrome face. IBM Plex Mono is the parent design of the template's iA Writer
// Mono and is the only close match on Google Fonts that ships a Vietnamese
// subset — essential for Hai Phong guest names in nav, labels and tables.
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Content face. Carries guest names, notes and free text.
// Chinese is deliberately left to the system CJK stack declared in
// lib/tokens.js rather than pulling a multi-megabyte Noto Sans SC webfont.
const sans = Noto_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Two Weddings — Planner",
  description:
    "Cross-cultural wedding planner for two destination weddings: Hải Phòng, Vietnam and Kota Kinabalu, Malaysia (October 2027).",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Two Weddings" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#263D30",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="font-sans antialiased text-stone-900">
        <AppProvider>{children}</AppProvider>
        <ServiceWorkerRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
