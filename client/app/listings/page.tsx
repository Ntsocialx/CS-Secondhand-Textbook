"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type PaymentInstructions = {
  fee: string;
  periodDays: number;
  accountHolder: string;
  bank: string;
  accountNumber: string;
  accountType: string;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read that file."));
    reader.onerror = () => reject(new Error("Unable to read that file."));
    reader.readAsDataURL(file);
  });
}

export default function Listings() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [instructionsError, setInstructionsError] = useState("");
  const [proofs, setProofs] = useState<Record<string, File | undefined>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const token = session?.user.accessToken;

  const loadListings = useCallback(async () => {
    if (!token) return;
    try {
      const payload = await fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/my-listings`, withBearer(token));
      setListings(payload.listings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/my-listings`, withBearer(token))
      .then((payload) => { if (!cancelled) setListings(payload.listings); })
      .catch((error: unknown) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load your listings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchJson<{ instructions: PaymentInstructions }>(`${apiUrl}/api/listing-payment-instructions`, withBearer(token))
      .then((payload) => { if (!cancelled) setInstructions(payload.instructions); })
      .catch((error: unknown) => { if (!cancelled) setInstructionsError(error instanceof Error ? error.message : "Payment instructions are unavailable."); });
    return () => { cancelled = true; };
  }, [loadListings, token]);

  async function uploadProof(id: string) {
    const file = proofs[id];
    if (!token || !file) return;
    setBusyId(id);
    setMessage("");
    try {
      const dataUrl = await fileToDataUrl(file);
      await fetchJson(`${apiUrl}/api/listings/${id}/payment-proof`, withBearer(token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, dataUrl }),
      }));
      setProofs((current) => ({ ...current, [id]: undefined }));
      setMessage("Payment proof submitted. Your listing remains private during payment and content review.");
      await loadListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit payment proof.");
    } finally {
      setBusyId(null);
    }
  }

  async function renewListing(id: string) {
    if (!token) return;
    setBusyId(id);
    setMessage("");
    try {
      await fetchJson(`${apiUrl}/api/listings/${id}/renew`, withBearer(token, { method: "POST" }));
      setMessage("Renewal started. Transfer R5 using the payment instructions and upload new proof below.");
      await loadListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to renew the listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function markSold(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await fetchJson(`${apiUrl}/api/listings/${id}/sold`, withBearer(token, { method: "POST" }));
      await loadListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the listing.");
    } finally {
      setBusyId(null);
    }
  }

  function chooseProof(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setProofs((current) => ({ ...current, [id]: undefined }));
      setMessage("Choose a JPEG, PNG, or PDF payment proof up to 5MB.");
      event.target.value = "";
      return;
    }
    setProofs((current) => ({ ...current, [id]: file }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="My Listings" />
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold">My Listings</h1><p className="mt-1 text-xs text-[#718198]">Track payment, review, and 30-day listing status.</p></div>
          <Link href="/sell" className="rounded-lg bg-[#2864ed] px-4 py-3 text-[11px] font-bold text-white">＋ List a book · R5 / 30 days</Link>
        </div>
        {message && <p role="status" className="mt-5 rounded-lg bg-[#edf4ff] p-3 text-xs font-bold text-[#244f9e]">{message}</p>}
        {instructionsError && <p role="alert" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-xs text-[#895200]">{instructionsError}</p>}
        {loading ? <p className="mt-7 text-sm text-[#718198]">Loading your listings...</p> : listings.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-sm text-[#718198]">You have not submitted a listing yet.</div>
        ) : (
          <div className="mt-7 space-y-4">
            {listings.map((listing) => {
              const canUploadProof = listing.status === "PENDING_PAYMENT" && ["DUE", "REJECTED"].includes(listing.paymentStatus ?? "");
              return (
                <article key={listing.id} className="rounded-xl border border-[#dce4ee] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex gap-4">
                    <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#edf4ff]">
                      {listing.imageUrl ? <Image src={listing.imageUrl} alt={`${listing.title} book cover`} width={72} height={96} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-1 text-center text-[9px] text-[#718198]">No photo</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#edf4ff] px-2 py-1 text-[9px] font-bold text-[#2864ed]">{listing.courseCode}</span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-[#43536d]">{statusLabel(listing)}</span>
                      </div>
                      <h2 className="mt-2 text-sm font-bold">{listing.title}</h2>
                      <p className="mt-1 text-[10px] text-[#718198]">{listing.isTrade ? "Exchange" : `R ${listing.price}`} · {listing.condition} · {listing.campus}</p>
                      {listing.expiresAt && listing.status === "ACTIVE" && <p className="mt-1 text-[10px] text-[#718198]">Expires {new Date(listing.expiresAt).toLocaleDateString()}</p>}
                      {(listing.paymentReviewReason || listing.moderationReviewReason) && <p className="mt-3 rounded-md bg-[#fff0bf] p-2 text-[11px] text-[#895200]"><strong>Review note:</strong> {listing.paymentReviewReason || listing.moderationReviewReason}</p>}
                      {listing.status === "REJECTED" && <Link href={`/sell?listing=${listing.id}`} className="mt-3 inline-flex rounded-md border border-[#cbd8eb] px-3 py-2 text-[10px] font-bold text-[#2161ee]">Edit and resubmit</Link>}
                    </div>
                    <div className="hidden text-right sm:block"><b className="text-base">{listing.isTrade ? "Exchange" : `R ${listing.price}`}</b></div>
                  </div>
                  {canUploadProof && (
                    <div className="mt-4 rounded-lg bg-[#f8fbff] p-4">
                      {instructions && <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                        <p><span className="text-[#718198]">Pay R{instructions.fee} to:</span> <strong>{instructions.accountHolder}</strong></p>
                        <p><span className="text-[#718198]">Bank:</span> <strong>{instructions.bank}</strong></p>
                        <p><span className="text-[#718198]">Account:</span> <strong>{instructions.accountNumber} · {instructions.accountType}</strong></p>
                        <p><span className="text-[#718198]">Reference:</span> <strong>CE-{listing.id}</strong></p>
                      </div>}
                      <label className="mt-3 block text-[11px] font-bold">Upload proof of payment (JPG, PNG, or PDF; max 5MB)
                        <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseProof(listing.id, event)} className="mt-2 block w-full rounded-lg border border-dashed border-[#2864ed] bg-white p-3 text-xs" />
                      </label>
                      <button type="button" disabled={!instructions || !proofs[listing.id] || busyId === listing.id} onClick={() => void uploadProof(listing.id)} className="mt-3 rounded-md bg-[#2864ed] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">{busyId === listing.id ? "Uploading..." : "Upload proof"}</button>
                    </div>
                  )}
                  {listing.status === "EXPIRED" && <button type="button" disabled={busyId === listing.id} onClick={() => void renewListing(listing.id)} className="mt-4 rounded-md bg-[#2864ed] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">{busyId === listing.id ? "Starting..." : "Renew for R5 / 30 days"}</button>}
                  {listing.status === "ACTIVE" && <button type="button" disabled={busyId === listing.id} onClick={() => void markSold(listing.id)} className="mt-4 rounded-md bg-[#e2f7ed] px-4 py-2 text-[10px] font-bold text-[#137b53] disabled:opacity-50">Mark as sold</button>}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function statusLabel(listing: Listing) {
  if (listing.status === "ACTIVE") return "Approved · Active";
  if (listing.status === "SOLD") return "Sold";
  if (listing.status === "EXPIRED") return "Expired";
  if (listing.status === "PENDING_PAYMENT_REVIEW") return "Payment under review";
  if (listing.status === "PENDING_CONTENT_REVIEW") return "Content under review";
  if (listing.status === "PENDING_PAYMENT") return listing.paymentStatus === "REJECTED" ? "Payment proof needs attention" : "Payment required";
  if (listing.status === "REJECTED") return "Changes required";
  return listing.status;
}
