"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import { useParams } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function ReportPage() {
  const { data: session } = useSession();
  const params = useParams<{ listingId?: string; userId?: string }>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    category: "Suspicious or misleading listing",
    description: "",
    reporterEmail: "",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await fetchJson(`${apiUrl}/api/reports`, withBearer(session?.user.accessToken || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          listingId: params.listingId,
          userId: params.userId,
        }),
      }));
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit report.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex flex-1 items-center justify-center px-5 py-12"><section className="w-full max-w-[470px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm">{sent ? <div className="py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e1fbf7] text-xl text-[#12b6aa]">✓</span><h1 className="mt-4 text-xl font-extrabold">Report received</h1><p className="mt-2 text-[11px] leading-5 text-[#718198]">Thank you for helping keep Campus Exchange safe. Our team will review this report.</p><Link href="/browse" className="mt-6 inline-block rounded-lg bg-[#2864ed] px-5 py-3 text-[10px] font-bold text-white">Back to Browse</Link></div> : <><h1 className="text-xl font-extrabold">Report a listing or user</h1><p className="mt-2 text-[10px] leading-4 text-[#718198]">Tell us what happened. Reports help students buy and sell books safely.</p><form onSubmit={submit} className="mt-5"><label className="label">Reason<select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option>Suspicious or misleading listing</option><option>Unsafe meetup behaviour</option><option>Harassment or inappropriate contact</option><option>Other safety concern</option></select></label><label className="label">Additional details<textarea required rows={5} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Please share the relevant details..." /></label><label className="label">Your email (optional)<input type="email" value={formData.reporterEmail} onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })} placeholder="you@student.tut.ac.za" /></label>{error && <p className="mt-4 text-[10px] font-bold text-[#e45757]">{error}</p>}<div className="mt-6 flex justify-end gap-3 border-t pt-5"><Link href="/browse" className="rounded-lg border px-4 py-3 text-[10px] font-bold">Cancel</Link><button disabled={busy} className="rounded-lg bg-[#e45757] px-4 py-3 text-[10px] font-bold text-white disabled:opacity-50">{busy ? "Sending..." : "Submit Report"}</button></div></form></>}</section></main><Footer /></div>;
}
