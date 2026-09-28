"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminNavigation } from "@/components/AdminNavigation";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type FeePeriod = {
  id: string;
  title: string;
  courseCode: string;
  status: string;
  effectiveStatus: string;
  paymentStatus: "DUE" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  moderationStatus: string;
  createdAt: string;
  expiresAt: string | null;
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  proofUploadedAt: string | null;
};

export default function AdminFeePeriodsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [periods, setPeriods] = useState<FeePeriod[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user.accessToken;
    if (sessionStatus !== "authenticated" || session?.user.role !== "ADMIN" || !token) return;
    let cancelled = false;
    fetchJson<{ periods: FeePeriod[] }>(`${apiUrl}/api/admin/fee-periods?paymentStatus=${filter}`, withBearer(token))
      .then((result) => { if (!cancelled) { setPeriods(result.periods); setError(""); } })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load listing fee periods."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, session?.user.accessToken, session?.user.role, sessionStatus]);

  if (sessionStatus === "loading") return <main className="p-8">Checking admin access...</main>;
  if (!session || session.user.role !== "ADMIN") return <main className="p-8"><p>Admin access is required.</p><Link href="/" className="mt-3 inline-block text-sm text-[#2864ed]">Return home</Link></main>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-[#142039] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6"><Link href="/admin" className="text-xs font-bold text-[#2161ee]">← Admin control center</Link><h1 className="mt-3 text-2xl font-extrabold">Listing fees &amp; periods</h1><p className="mt-2 text-sm text-[#60728d]">R5 is manually paid per listing for 30 days. This is not a recurring subscription; there is no automatic renewal or online payment.</p></header>
        <AdminNavigation active="/admin/fees" />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#718198]">{periods.length} period{periods.length === 1 ? "" : "s"} in this page</p>
          <label className="text-xs font-bold">Payment status <select value={filter} onChange={(event) => setFilter(event.target.value)} className="ml-2 rounded-md border border-[#dce4ee] bg-white px-3 py-2"><option value="ALL">All</option><option value="DUE">Due</option><option value="SUBMITTED">Proof submitted</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-sm text-[#895200]">{error}</p>}
        {loading ? <p className="mt-7 text-sm text-[#718198]">Loading fee periods...</p> : periods.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-sm text-[#718198]">No fee periods match this filter.</div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#dce4ee] bg-white">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead className="bg-[#f8fbff] text-[10px] uppercase tracking-wide text-[#718198]"><tr><th className="p-3">Listing</th><th className="p-3">Seller</th><th className="p-3">Fee proof</th><th className="p-3">Review</th><th className="p-3">Period</th></tr></thead>
              <tbody className="divide-y divide-[#e5eaf1]">
                {periods.map((period) => (
                  <tr key={period.id} className="align-top">
                    <td className="p-3"><Link href={`/admin/listings`} className="font-bold text-[#2161ee]">#{period.id} · {period.title}</Link><p className="mt-1 text-[10px] text-[#718198]">{period.courseCode}</p></td>
                    <td className="p-3">{period.sellerFirstName} {period.sellerLastName}<p className="mt-1 text-[10px] text-[#718198]">{period.sellerEmail}</p></td>
                    <td className="p-3"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{period.paymentStatus}</span>{period.proofUploadedAt && <p className="mt-2 text-[10px] text-[#718198]">Submitted {new Date(period.proofUploadedAt).toLocaleDateString()}</p>}</td>
                    <td className="p-3"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{period.moderationStatus}</span><p className="mt-2 text-[10px] text-[#718198]">Listing: {period.effectiveStatus}</p></td>
                    <td className="p-3"><p>Created {new Date(period.createdAt).toLocaleDateString()}</p><p className="mt-1 text-[10px] text-[#718198]">{period.expiresAt ? `Expires ${new Date(period.expiresAt).toLocaleDateString()}` : "Not active yet"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-[11px] text-[#718198]">Receipt contents are intentionally hidden from this table. Open the listing review queue to inspect a proof under its admin-only access controls.</p>
      </div>
    </main>
  );
}
