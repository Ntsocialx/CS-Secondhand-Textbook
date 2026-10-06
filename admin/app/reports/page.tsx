"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminNavigation } from "@/components/AdminNavigation";
import { fetchJson } from "@/lib/api";
type ReportStatus = "OPEN" | "REVIEWED" | "RESOLVED";
type Report = {
  id: string;
  reporterEmail: string | null;
  reporterFirstName: string | null;
  reporterLastName: string | null;
  listingId: string | null;
  reportedUserId: string | null;
  reportedUserEmail: string | null;
  reportedFirstName: string | null;
  reportedLastName: string | null;
  listingTitle: string | null;
  category: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
};

export default function AdminReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || session?.user.role !== "ADMIN") return;
    let cancelled = false;
    fetchJson<{ reports: Report[] }>(`/api/backend/admin/reports?status=${filter}`)
      .then((result) => { if (!cancelled) { setReports(result.reports); setError(""); } })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load reports."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, session?.user.role, sessionStatus]);

  async function updateReport(report: Report, nextStatus: Exclude<ReportStatus, "OPEN">) {
    setBusyId(report.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/backend/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: notes[report.id] ?? "" }),
      });
      setNotice(`Report #${report.id} marked ${nextStatus.toLowerCase()}.`);
      const result = await fetchJson<{ reports: Report[] }>(`/api/backend/admin/reports?status=${filter}`);
      setReports(result.reports);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update report.");
    } finally {
      setBusyId(null);
    }
  }

  if (sessionStatus === "loading") return <main className="p-8">Checking admin access...</main>;
  if (!session || session.user.role !== "ADMIN") return <main className="p-8"><p>Admin access is required.</p><Link href="/" className="mt-3 inline-block text-sm text-[#2864ed]">Return home</Link></main>;

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-[#142039] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6"><Link href="/" className="text-xs font-bold text-[#2161ee]">← Admin control center</Link><h1 className="mt-3 text-2xl font-extrabold">Reports</h1><p className="mt-2 text-sm text-[#60728d]">Investigate reports and record status changes. Internal notes are admin-only.</p></header>
        <AdminNavigation active="/reports" />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#718198]">{reports.length} report{reports.length === 1 ? "" : "s"}</p>
          <label className="text-xs font-bold">Filter <select value={filter} onChange={(event) => setFilter(event.target.value)} className="ml-2 rounded-md border border-[#dce4ee] bg-white px-3 py-2"><option value="ALL">All reports</option><option value="OPEN">Open</option><option value="REVIEWED">Reviewed</option><option value="RESOLVED">Resolved</option></select></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-sm text-[#895200]">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg bg-[#e2f7ed] p-3 text-sm text-[#137b53]">{notice}</p>}
        {loading ? <p className="mt-7 text-sm text-[#718198]">Loading reports...</p> : reports.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-sm text-[#718198]">No reports in this view.</div>
        ) : (
          <div className="mt-5 space-y-4">
            {reports.map((report) => (
              <article key={report.id} className="rounded-xl border border-[#dce4ee] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase text-[#2864ed]">Report #{report.id} · {report.category}</p><h2 className="mt-2 text-sm font-bold">{report.listingTitle ? `Listing: ${report.listingTitle}` : report.reportedUserId ? `User report #${report.reportedUserId}` : "Marketplace report"}</h2></div>
                  <span className="h-fit rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{report.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#43536d]">{report.description}</p>
                <div className="mt-3 grid gap-1 text-[11px] text-[#718198] sm:grid-cols-2">
                  <p>Submitted: {new Date(report.createdAt).toLocaleString()}</p>
                  <p>Reporter: {report.reporterFirstName || report.reporterLastName ? `${report.reporterFirstName ?? ""} ${report.reporterLastName ?? ""}`.trim() : report.reporterEmail || "Anonymous"}</p>
                  {report.listingId && <p>Listing ID: {report.listingId}</p>}
                  {report.reportedUserId && <p>Reported user: {report.reportedFirstName || report.reportedLastName ? `${report.reportedFirstName ?? ""} ${report.reportedLastName ?? ""}`.trim() : report.reportedUserEmail || report.reportedUserId}</p>}
                </div>
                {report.status !== "RESOLVED" && (
                  <div className="mt-4 border-t border-[#e5eaf1] pt-4">
                    <label className="block text-[11px] font-bold">Internal note (optional)
                      <textarea maxLength={1000} rows={2} value={notes[report.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} className="mt-2 w-full rounded-lg border border-[#dce4ee] p-3 text-xs font-normal" placeholder="Record concise internal handling context; never include passwords or payment credentials." />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.status === "OPEN" && <button type="button" disabled={busyId === report.id} onClick={() => void updateReport(report, "REVIEWED")} className="rounded-md border border-[#cbd8eb] px-4 py-2 text-xs font-bold text-[#2161ee] disabled:opacity-50">Mark reviewed</button>}
                      <button type="button" disabled={busyId === report.id} onClick={() => void updateReport(report, "RESOLVED")} className="rounded-md bg-[#13835c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Resolve report</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
