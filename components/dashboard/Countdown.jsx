"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

function diff(target) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function Countdown({ target, variant = "large", accent = "hp" }) {
  const { t } = useApp();
  const [time, setTime] = useState(null);

  useEffect(() => {
    // Compute on the client only — rendering a live time on the server would
    // cause a hydration mismatch, so the first paint shows a placeholder.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(diff(target));
    const id = setInterval(() => setTime(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!time) {
    // Pre-hydration placeholder keeps server & client markup aligned.
    return <span className="text-ink-300">—</span>;
  }

  if (variant === "compact") {
    return (
      <span className="tabular-nums font-semibold">
        {time.days}
        <span className="font-normal opacity-70">{t("common.days")}</span>{" "}
        {String(time.hours).padStart(2, "0")}:{String(time.minutes).padStart(2, "0")}:
        {String(time.seconds).padStart(2, "0")}
      </span>
    );
  }

  const accentText = accent === "kk" ? "text-kk-700" : "text-hp-700";
  const cell = (value, label) => (
    <div className="flex flex-col items-center">
      <span className={`tabular-nums text-2xl font-bold ${accentText}`}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-ink-400">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-4">
      {cell(time.days, t("common.days"))}
      {cell(time.hours, t("common.hours"))}
      {cell(time.minutes, t("common.minutes"))}
      {cell(time.seconds, t("common.seconds"))}
    </div>
  );
}
