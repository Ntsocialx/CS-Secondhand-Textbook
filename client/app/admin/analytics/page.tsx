"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";

type Summary = {
  totals: { visits: number; visitors: number };
  popularPaths: { path: string; visits: number }[];
  daily: { date: string; visits: number }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || session.user.role !== "ADMIN" || !session.user.accessToken) return;
    fetchJson<Summary>(`${apiUrl}/api/analytics/summary`, {
      headers: { Authorization: `Bearer ${session.user.accessToken}` },
    }).then(setSummary).catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
    });
  }, [session, status]);

  if (status === "loading") return <main className="p-10">Loading...</main>;
  if (!session || session.user.role !== "ADMIN") {
    return <main className="p-10"><p>Admin access is required.</p><Link href="/" className="text-indigo-600">Return home</Link></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-indigo-600">← Campus Exchange</Link>
        <h1 className="mt-5 text-4xl font-semibold">Visitor analytics</h1>
        <p className="mt-2 text-slate-600">Private dashboard. IP addresses are stored only as salted hashes.</p>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {summary && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Metric label="Total visits" value={summary.totals.visits} />
              <Metric label="Unique visitors" value={summary.totals.visitors} />
            </div>
            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Popular pages</h2>
              <ul className="mt-4 divide-y">{summary.popularPaths.map((item) => <li key={item.path} className="flex justify-between py-3"><span>{item.path}</span><strong>{item.visits}</strong></li>)}</ul>
            </section>
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Last 30 days</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">{summary.daily.map((item) => <li key={item.date} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>{item.date}</span><strong>{item.visits}</strong></li>)}</ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-4xl font-semibold">{value}</p></div>;
}
