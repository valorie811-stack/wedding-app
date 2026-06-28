// Lazy-load node-qrcode from CDN (no npm dependency) and produce a PNG data URL.
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.4/qrcode.min.js";
let loaderPromise;

function loadQR() {
  if (typeof window !== "undefined" && window.QRCode) return Promise.resolve(window.QRCode);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.onload = () => (window.QRCode ? resolve(window.QRCode) : reject(new Error("QR unavailable")));
    s.onerror = () => reject(new Error("QR failed to load"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export async function makeQrDataUrl(text, opts = {}) {
  const QR = await loadQR();
  return QR.toDataURL(text, {
    width: 220,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
    ...opts,
  });
}
