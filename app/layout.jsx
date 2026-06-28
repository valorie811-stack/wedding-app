import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

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
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-ink-900">
        <AppProvider>{children}</AppProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
