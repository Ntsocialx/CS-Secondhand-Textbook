"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminNavigation } from "@/components/AdminNavigation";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Overview = {
  users: { total: number; registered_last_30_days: number };
  listings: {
    active: number;
    pending_payment: number;
    pending_content_review: number;
    rejected: number;
    sold: number;
    expired: number;
  };
  reports: { open: number; reviewed: number; resolved: number };
  fees: {
    verified_periods: number;
    active_periods: number;
    pending_proofs: number;
    rejected_proofs: number;
    verified_listing_fees_zar: string;
  };
  visitors: { visits: number; unique_visitors: number };
  feeTerms: { amountZar: string; periodDays: number; automaticRenewal: boolean };
};

export default function AdminOverviewPage() {
  const { data: session, status } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user.accessToken;
    if (status !== "authenticated" || session?.user.role !== "ADMIN" || !token) return;
    let cancelled = false;
    fetchJson<Overview>(`${apiUrl}/api/admin/overview`, withBearer(token))
      .then((data) => { if (!cancelled) setOverview(data); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load admin overview."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user.accessToken, session?.user.role, status]);

  if (status === "loading") return <main className="p-8">Checking admin access...</main>;
  if (!session || session.user.role !== "ADMIN") return <main className="p-8"><p>Admin access is required.</p><Link href="/" className="mt-3 inline-block text-sm text-[#2864ed]">Return home</Link></main>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-[#142039] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Campus Exchange</p><h1 className="mt-2 text-3xl font-extrabold">Admin control center</h1><p className="mt-2 text-sm text-[#60728d]">Private operations overview. All administrative actions are checked by the API.</p></div>
          <Link href="/" className="rounded-lg border border-[#cbd8eb] bg-white px-4 py-2 text-xs font-bold">View marketplace</Link>
        </header>
        <AdminNavigation active="/admin" />
        {error && <p role="alert" className="mt-5 rounded-lg bg-[#fff0bf] p-3 text-sm text-[#895200]">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-[#718198]">Loading overview...</p> : overview && (
          <>
            <section className="mt-7">
              <h2 className="mb-3 text-sm font-bold">Users and activity</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Registered users" value={overview.users.total} />
                <Metric label="New users · 30 days" value={overview.users.registered_last_30_days} />
                <Metric label="Total visits" value={overview.visitors.visits} />
                <Metric label="Unique visitors" value={overview.visitors.unique_visitors} />
              </div>
            </section>
            <section className="mt-7">
              <h2 className="mb-3 text-sm font-bold">Listings and reviews</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="Active approved listings" value={overview.listings.active} />
                <Metric label="Awaiting payment review" value={overview.listings.pending_payment} href="/admin/listings" />
                <Metric label="Awaiting content review" value={overview.listings.pending_content_review} href="/admin/listings" />
                <Metric label="Rejected listings" value={overview.listings.rejected} />
                <Metric label="Sold listings" value={overview.listings.sold} />
                <Metric label="Expired periods" value={overview.listings.expired} href="/admin/fees" />
              </div>
            </section>
            <section className="mt-7">
              <h2 className="mb-3 text-sm font-bold">Reports and listing fees</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="Open reports" value={overview.reports.open} href="/admin/reports" />
                <Metric label="Reviewed reports" value={overview.reports.reviewed} href="/admin/reports" />
                <Metric label="Resolved reports" value={overview.reports.resolved} href="/admin/reports" />
                <Metric label="Verified fee periods" value={overview.fees.verified_periods} href="/admin/fees" />
                <Metric label="Currently active fee periods" value={overview.fees.active_periods} href="/admin/fees" />
                <Metric label="Proofs awaiting check" value={overview.fees.pending_proofs} href="/admin/listings" />
              </div>
              <p className="mt-3 text-xs text-[#718198]">Verified listing fees: R{overview.fees.verified_listing_fees_zar}. This is a count-based estimate, not bank reconciliation or proof of funds received. Each fee is R{overview.feeTerms.amountZar} for {overview.feeTerms.periodDays} days; automatic renewal is off.</p>
            </section>
            <section className="mt-8 rounded-xl border border-[#dce4ee] bg-white p-5">
              <h2 className="font-bold">Admin privileges and boundaries</h2>
              <ul className="mt-3 grid gap-2 text-sm text-[#43536d] sm:grid-cols-2">
                <li>• Review submitted book listings against the published policy.</li>
                <li>• View private payment proof and verify or reject R5 fee submissions.</li>
                <li>• Review marketplace reports and update their status with an audit record.</li>
                <li>• View aggregate user, listing, fee-period, report, and visitor totals.</li>
                <li>• Monitor fee periods; transfers remain manual and do not auto-renew.</li>
                <li>• No student passwords, impersonation, private messaging, delivery controls, or buyer-to-seller payment processing.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = <div className="rounded-xl border border-[#dce4ee] bg-white p-4 shadow-sm"><p className="text-xs text-[#718198]">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>;
  return href ? <Link href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed]">{content}</Link> : content;
}
