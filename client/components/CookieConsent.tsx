"use client";

import { useEffect, useState } from "react";

const COOKIE_NAME = "campus_exchange_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(!document.cookie.split("; ").some((cookie) => cookie.startsWith(`${COOKIE_NAME}=`)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(value: "accepted" | "essential") {
    document.cookie = `${COOKIE_NAME}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[760px] flex-col gap-4 rounded-xl border border-[#dce4ee] bg-white p-4 shadow-xl sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="text-xs font-bold text-[#142039]">We use cookies responsibly</p>
        <p className="mt-1 text-[10px] leading-4 text-[#718198]">
          Essential cookies keep you signed in and remember your preferences. Optional analytics cookies help us improve the campus book marketplace. We never sell personal information.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => choose("essential")} className="rounded-lg border border-[#dce4ee] px-3 py-2 text-[10px] font-bold text-[#64748b]">Essential only</button>
        <button type="button" onClick={() => choose("accepted")} className="rounded-lg bg-[#2864ed] px-3 py-2 text-[10px] font-bold text-white">Accept cookies</button>
      </div>
    </div>
  );
}
