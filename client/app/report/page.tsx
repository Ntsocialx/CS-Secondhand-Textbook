"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const reportCategories = [
  "Suspicious or misleading listing",
  "Unsafe meetup behaviour",
  "Harassment or inappropriate contact",
  "Other safety concern",
];

export default function ReportPage() {
  return <Suspense fallback={<main className="p-8 text-sm text-[#718198]">Loading report form...</main>}><ReportForm /></Suspense>;
}

function ReportForm() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const target = {
    listingId: searchParams.get("listing") ?? undefined,
    userId: searchParams.get("user") ?? undefined,
  };
  const [category, setCategory] = useState(reportCategories[0]);
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.accessToken) {
      setError("Sign in with your student account before submitting a report.");
      return;
    }
    if (!target.listingId && !target.userId) {
      setError("Open the report form from a listing or seller profile so we know what to review.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fetchJson(`${apiUrl}/api/reports`, withBearer(session.user.accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description, ...target }),
      }));
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit the report.");
    } finally {
      setBusy(false);
    }
  }

  const targetLabel = target.listingId ? `listing #${target.listingId}` : target.userId ? `user #${target.userId}` : "";

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Browse" />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-[470px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm">
          {sent ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e1fbf7] text-xl text-[#12b6aa]" aria-hidden="true">✓</span>
              <h1 className="mt-4 text-xl font-extrabold">Report received</h1>
              <p role="status" className="mt-2 text-[11px] leading-5 text-[#718198]">Thank you for helping keep Campus Exchange safe. Your report is private and will be reviewed by an administrator.</p>
              <Link href="/browse" className="mt-6 inline-block rounded-lg bg-[#2864ed] px-5 py-3 text-[10px] font-bold text-white">Back to Browse</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold">Report a listing or user</h1>
              <p className="mt-2 text-[10px] leading-4 text-[#718198]">Tell us what happened. Reports are private and visible only to the review team.</p>
              {targetLabel && <p className="mt-3 rounded-lg bg-[#edf4ff] p-3 text-xs font-bold text-[#244f9e]">Reporting {targetLabel}</p>}
              <form onSubmit={submit} className="mt-5 space-y-3">
                <label className="label">Reason
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {reportCategories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="label">Additional details
                  <textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the specific safety or policy concern." />
                </label>
                <p className="text-[10px] leading-4 text-[#718198]">Your account identifies the report privately to the review team. Do not include passwords, bank information, or unnecessary personal details.</p>
                {error && <p role="alert" className="rounded-lg bg-[#fff0bf] p-3 text-[11px] font-bold text-[#895200]">{error}</p>}
                {sessionStatus !== "authenticated" && sessionStatus !== "loading" && <p className="text-xs text-[#895200]">Sign in is required to submit a report.</p>}
                <div className="flex justify-end gap-3 border-t pt-5">
                  <Link href="/browse" className="rounded-lg border px-4 py-3 text-[10px] font-bold">Cancel</Link>
                  <button disabled={busy || sessionStatus !== "authenticated"} className="rounded-lg bg-[#e45757] px-4 py-3 text-[10px] font-bold text-white disabled:opacity-50">{busy ? "Sending..." : "Submit report"}</button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
