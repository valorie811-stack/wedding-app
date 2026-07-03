"use client";

import { useEffect, useState } from "react";
import { makeQrDataUrl } from "@/lib/qr";

export default function QrCode({ value, label = "qr", size = 140 }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    // Clear the previous QR while the new value renders. Runs only on `value`
    // change, so the cascading-render concern doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(null);
    setErr(false);
    makeQrDataUrl(value)
      .then((d) => active && setSrc(d))
      .catch(() => active && setErr(true));
    return () => {
      active = false;
    };
  }, [value]);

  if (err) return null;
  if (!src)
    return <div className="animate-pulse rounded-lg bg-ink-100" style={{ width: size, height: size }} />;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="QR code" width={size} height={size} className="rounded-lg border border-ink-200" />
      <a href={src} download={`${label}.png`} className="text-xs text-kk-700 hover:underline">
        ⬇ QR
      </a>
    </div>
  );
}
