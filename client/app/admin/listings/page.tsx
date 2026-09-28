"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminNavigation } from "@/components/AdminNavigation";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const reviewChecks = [
  "Appears to be a genuine physical book, not a copy or counterfeit.",
  "No obvious stolen, unauthorized, or otherwise prohibited material is offered.",
  "Title, condition, photo, campus, and price or exchange request are accurate and clear.",
  "Listing is for a book and contains no unrelated item or misleading claim.",
  "Listing does not expose private information or contain abusive/scam content.",
];

type ReviewListing = {
  id: string;
  title: string;
  courseCode: string;
  price: string | null;
  condition: string;
  description: string;
  campus: string;
  imageUrl: string | null;
  category: string;
  isTrade: boolean;
  tradeRequest: string | null;
  status: string;
  paymentStatus: string;
  moderationStatus: string;
  createdAt: string;
  sellerEmail: string;
  sellerFirstName: string | null;
  sellerLastName: string | null;
  proofUploadedAt: string | null;
  proofFileName: string | null;
};

type ProofPreview = { id: string; url: string; mimeType: string };

export default function AdminListingReviewPage() {
  const { data: session, status } = useSession();
  const [listings, setListings] = useState<ReviewListing[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean[]>>({});
  const [proof, setProof] = useState<ProofPreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadQueue() {
    const token = session?.user.accessToken;
    if (!token) return;
    try {
      const result = await fetchJson<{ listings: ReviewListing[] }>(
        `${apiUrl}/api/admin/listings/review-queue`,
        withBearer(token),
      );
      setListings(result.listings);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load listing reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = session?.user.accessToken;
    if (status !== "authenticated" || session?.user.role !== "ADMIN" || !token) return;
    let cancelled = false;
    fetchJson<{ listings: ReviewListing[] }>(`${apiUrl}/api/admin/listings/review-queue`, withBearer(token))
      .then((result) => { if (!cancelled) setListings(result.listings); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load listing reviews."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user.accessToken, session?.user.role, status]);

  useEffect(() => () => {
    if (proof) URL.revokeObjectURL(proof.url);
  }, [proof]);

  async function showProof(id: string) {
    if (!session?.user.accessToken) return;
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/admin/listings/${id}/payment-proof`, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Unable to load proof (${response.status}).`);
      }
      const blob = await response.blob();
      setProof({ id, url: URL.createObjectURL(blob), mimeType: blob.type });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load payment proof.");
    }
  }

  async function decide(id: string, type: "payment" | "moderation", decision: "VERIFIED" | "APPROVED" | "REJECTED") {
    if (!session?.user.accessToken) return;
    const reason = reasons[id]?.trim() ?? "";
    if (decision === "REJECTED" && !reason) {
      setError("Add a clear reason before rejecting a payment proof or listing.");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const isPayment = type === "payment";
      const body = isPayment
        ? { decision, reason }
        : { decision, reason, checklist: checks[id] ?? [] };
      await fetchJson(`${apiUrl}/api/admin/listings/${id}/${isPayment ? "payment-review" : "moderation-review"}`, withBearer(session.user.accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      setProof((current) => {
        if (current?.id === id) URL.revokeObjectURL(current.url);
        return current?.id === id ? null : current;
      });
      await loadQueue();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to record this review.");
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading") return <main className="p-10">Loading review access...</main>;
  if (!session || session.user.role !== "ADMIN") {
    return <main className="p-10"><p>Admin access is required.</p><Link href="/" className="text-indigo-600">Return home</Link></main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-[#142039] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/admin/analytics" className="text-xs font-bold text-[#2161ee]">← Admin dashboard</Link><h1 className="mt-3 text-2xl font-extrabold">Listing review queue</h1></div>
          <button type="button" onClick={() => void loadQueue()} className="rounded-lg border border-[#cbd8eb] bg-white px-4 py-2 text-xs font-bold">Refresh queue</button>
        </div>
        <div className="mt-5"><AdminNavigation active="/admin/listings" /></div>
        <p className="mt-2 text-sm text-[#60728d]">Verify transfer receipts and review book listings as separate decisions. Only approved, unexpired listings are visible in Browse.</p>
        {error && <p role="alert" className="mt-5 rounded-lg bg-[#fff0bf] p-3 text-sm text-[#895200]">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-[#718198]">Loading submissions...</p> : listings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-sm text-[#718198]">No listings are waiting for review.</div>
        ) : (
          <div className="mt-7 space-y-5">
            {listings.map((listing) => {
              const paymentPending = listing.paymentStatus === "SUBMITTED";
              const selectedChecks = checks[listing.id] ?? reviewChecks.map(() => false);
              return (
                <article key={listing.id} className="rounded-xl border border-[#dce4ee] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                        <span className="rounded bg-[#edf4ff] px-2 py-1 text-[#2864ed]">#{listing.id} · {listing.category}</span>
                        <span className="rounded bg-slate-100 px-2 py-1">{paymentPending ? "Payment proof review" : "Content review"}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-extrabold">{listing.title}</h2>
                      <p className="mt-1 text-xs text-[#718198]">{listing.courseCode} · {listing.condition} · {listing.campus}</p>
                      <p className="mt-2 text-xs">{listing.isTrade ? `Exchange requested: ${listing.tradeRequest}` : `Asking R${listing.price}`}</p>
                      <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#43536d]">{listing.description}</p>
                      <p className="mt-3 text-[11px] text-[#718198]">Seller: {listing.sellerFirstName ?? ""} {listing.sellerLastName ?? ""} · {listing.sellerEmail}</p>
                    </div>
                    {listing.imageUrl && <Image src={listing.imageUrl} alt={`${listing.title} listing`} width={96} height={128} unoptimized className="h-32 w-24 rounded-lg object-cover" />}
                  </div>

                  {paymentPending ? (
                    <div className="mt-5 border-t border-[#e5eaf1] pt-4">
                      <p className="text-xs text-[#60728d]">Proof uploaded {listing.proofUploadedAt ? new Date(listing.proofUploadedAt).toLocaleString() : ""} · {listing.proofFileName}</p>
                      <button type="button" onClick={() => void showProof(listing.id)} className="mt-3 rounded-md border border-[#cbd8eb] px-3 py-2 text-xs font-bold text-[#2161ee]">View private proof</button>
                      {proof?.id === listing.id && (
                        <div className="mt-4 rounded-lg border border-[#dce4ee] bg-slate-50 p-2">
                          {proof.mimeType === "application/pdf" ? <iframe title={`Payment proof for listing ${listing.id}`} src={proof.url} className="h-[420px] w-full" /> : <Image src={proof.url} alt={`Payment proof for listing ${listing.id}`} width={900} height={600} unoptimized className="max-h-[420px] max-w-full object-contain" />}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={busyId === listing.id} onClick={() => void decide(listing.id, "payment", "VERIFIED")} className="rounded-md bg-[#13835c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Verify R5 payment</button>
                        <button type="button" disabled={busyId === listing.id} onClick={() => void decide(listing.id, "payment", "REJECTED")} className="rounded-md bg-[#fff0bf] px-4 py-2 text-xs font-bold text-[#895200] disabled:opacity-50">Reject payment</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 border-t border-[#e5eaf1] pt-4">
                      <h3 className="text-sm font-bold">Policy review checklist</h3>
                      <div className="mt-3 grid gap-2">
                        {reviewChecks.map((label, index) => (
                          <label key={label} className="flex items-start gap-2 text-xs leading-5 text-[#43536d]">
                            <input type="checkbox" checked={selectedChecks[index]} onChange={(event) => {
                              const next = [...selectedChecks];
                              next[index] = event.target.checked;
                              setChecks((current) => ({ ...current, [listing.id]: next }));
                            }} className="mt-1" />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={busyId === listing.id || !selectedChecks.every(Boolean)} onClick={() => void decide(listing.id, "moderation", "APPROVED")} className="rounded-md bg-[#13835c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Approve and publish</button>
                        <button type="button" disabled={busyId === listing.id} onClick={() => void decide(listing.id, "moderation", "REJECTED")} className="rounded-md bg-[#fff0bf] px-4 py-2 text-xs font-bold text-[#895200] disabled:opacity-50">Reject listing</button>
                      </div>
                    </div>
                  )}
                  <label className="mt-4 block text-xs font-bold">Decision note {paymentPending ? "(required for rejection)" : "(required for rejection)"}
                    <textarea rows={2} value={reasons[listing.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} placeholder="Explain what needs attention so the seller can act." className="mt-2 w-full rounded-lg border border-[#dce4ee] p-3 text-xs font-normal" />
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
