"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const policyVersion = "2026-09";
const initialForm = {
  title: "",
  courseCode: "",
  price: "",
  condition: "Like New",
  description: "",
  campus: "Tshwane University of Technology (TUT)",
  category: "Textbook",
  isTrade: false,
  tradeRequest: "",
};

type PaymentInstructions = {
  fee: string;
  currency: string;
  periodDays: number;
  accountHolder: string;
  bank: string;
  accountNumber: string;
  accountType: string;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read that file."));
    reader.onerror = () => reject(new Error("Unable to read that file."));
    reader.readAsDataURL(file);
  });
}

export default function Sell() {
  const { data: session } = useSession();
  const [form, setForm] = useState(initialForm);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<Listing["paymentStatus"]>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [instructionsError, setInstructionsError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = session?.user.accessToken;
    if (!token) return;
    let cancelled = false;
    const headers = withBearer(token);
    fetchJson<{ instructions: PaymentInstructions }>(`${apiUrl}/api/listing-payment-instructions`, headers)
      .then((payload) => { if (!cancelled) setInstructions(payload.instructions); })
      .catch((error: unknown) => {
        if (!cancelled) setInstructionsError(error instanceof Error ? error.message : "Payment instructions are unavailable.");
      });

    const requestedId = new URLSearchParams(window.location.search).get("listing");
    if (requestedId) {
      fetchJson<{ listing: Listing }>(
        `${apiUrl}/api/my-listings/${requestedId}`,
        headers,
      ).then(({ listing }) => {
        if (cancelled) return;
        setEditingId(requestedId);
        setListingId(requestedId);
        setPaymentStatus(listing.paymentStatus);
        setForm({
          title: listing.title,
          courseCode: listing.courseCode,
          price: listing.price ?? "",
          condition: listing.condition,
          description: listing.description,
          campus: listing.campus,
          category: listing.category,
          isTrade: listing.isTrade,
          tradeRequest: listing.tradeRequest ?? "",
        });
        setImageUrl(listing.imageUrl);
      }).catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load this listing for editing.");
      });
    }
    return () => { cancelled = true; };
  }, [session?.user.accessToken]);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP book photo up to 5MB.");
      event.target.value = "";
      return;
    }
    readFileAsDataUrl(file).then(setImageUrl).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Unable to read that image.");
    });
  }

  function chooseProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setProofFile(null);
      setMessage("Choose a JPEG, PNG, or PDF payment proof up to 5MB.");
      event.target.value = "";
      return;
    }
    setProofFile(file);
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.accessToken) return;
    setBusy(true);
    setMessage("");
    const payload = {
      ...form,
      price: form.isTrade ? null : Number(form.price),
      imageUrl,
      policyAccepted,
      policyVersion,
    };
    try {
      if (editingId) {
        const result = await fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${editingId}`, withBearer(session.user.accessToken, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }));
        setListingId(editingId);
        setPaymentStatus(result.listing.paymentStatus);
        setMessage("Your changes are saved and awaiting the required review.");
      } else {
        const result = await fetchJson<{ listing: { id: string } }>(`${apiUrl}/api/listings`, withBearer(session.user.accessToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }));
        setListingId(result.listing.id);
        setPaymentStatus("DUE");
        setMessage("Listing saved privately. Complete the payment step below; it will not be public until payment and content are approved.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this listing.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!session?.user.accessToken || !listingId || !proofFile) return;
    setBusy(true);
    setMessage("");
    try {
      const dataUrl = await readFileAsDataUrl(proofFile);
      await fetchJson(`${apiUrl}/api/listings/${listingId}/payment-proof`, withBearer(session.user.accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: proofFile.name, dataUrl }),
      }));
      setProofFile(null);
      setPaymentStatus("SUBMITTED");
      setMessage("Proof received. The listing will remain private while an admin verifies payment and reviews the book.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit payment proof.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Sell" />
      <main className="flex-1 px-5 py-9">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Seller centre</p>
            <h1 className="mt-2 text-2xl font-extrabold">{editingId ? "Update your book listing" : "List a book"}</h1>
            <p className="mt-2 text-sm leading-6 text-[#718198]">Pay R5 per book for a 30-day listing period. Your book stays private until an admin verifies payment and approves it under the marketplace rules.</p>
          </div>
          <form onSubmit={submitListing} className="rounded-xl border border-[#dce4ee] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold">Book details</h2>
            <label className="label">Book title
              <input required maxLength={200} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Introduction to Algorithms" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">Course code
                <input required maxLength={30} value={form.courseCode} onChange={(event) => update("courseCode", event.target.value.toUpperCase())} placeholder="e.g. CSC202" />
              </label>
              <label className="label">Category
                <select value={form.category} onChange={(event) => update("category", event.target.value)}>
                  <option>Textbook</option><option>Bible</option><option>Comic Book</option><option>Manga</option>
                </select>
              </label>
            </div>
            <label className="mt-5 flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={form.isTrade} onChange={(event) => update("isTrade", event.target.checked)} />
              Offer this book for exchange instead of sale
            </label>
            {form.isTrade ? (
              <label className="label">What book are you looking for?
                <input required minLength={5} maxLength={2000} value={form.tradeRequest} onChange={(event) => update("tradeRequest", event.target.value)} placeholder="Book title, course code, or exchange requirements" />
              </label>
            ) : (
              <label className="label">Asking price (Rand)
                <input required min="0" max="100000" step="0.01" type="number" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="R 0.00" />
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">Condition
                <select value={form.condition} onChange={(event) => update("condition", event.target.value)}>
                  <option>Like New</option><option>Good</option><option>Acceptable</option><option>Worn</option>
                </select>
              </label>
              <label className="label">Campus
                <select value={form.campus} onChange={(event) => update("campus", event.target.value)}>
                  <option>Tshwane University of Technology (TUT)</option><option>University of Cape Town (UCT)</option><option>Wits University</option><option>Stellenbosch University</option><option>University of Pretoria (UP)</option>
                </select>
              </label>
            </div>
            <label className="label">Description
              <textarea required maxLength={2000} rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the edition, wear, highlighting, annotations, and anything important to a student." />
            </label>
            <label className="label">Book photo (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="mt-2 w-full rounded-lg border border-dashed border-[#2864ed] bg-[#f8fbff] p-4 text-xs text-[#718198]" />
              {imageUrl && <Image src={imageUrl} alt="Selected textbook preview" width={96} height={112} unoptimized className="mt-3 h-28 w-24 rounded object-cover" />}
            </label>
            <div className="mt-6 rounded-lg border border-[#dce4ee] bg-[#f8fbff] p-4 text-xs leading-5 text-[#43536d]">
              <h2 className="font-bold text-[#142039]">Before submitting</h2>
              <p className="mt-1">Only genuine, lawfully owned physical books may be listed. Do not list copied, pirated, counterfeit, stolen, misleading, or unrelated items. Keep descriptions and photos accurate, and do not share private information.</p>
              <p className="mt-2">Your R5 fee covers one 30-day listing period. Payment is made by bank transfer outside this site; a listing becomes visible only after payment verification and content review. See the full <Link className="font-bold text-[#2161ee] underline" href="/policies">Marketplace rules and review policy</Link>.</p>
              <label className="mt-4 flex items-start gap-2 font-semibold text-[#142039]">
                <input required type="checkbox" checked={policyAccepted} onChange={(event) => setPolicyAccepted(event.target.checked)} className="mt-1" />
                <span>I have read and agree to the current marketplace rules for this listing.</span>
              </label>
            </div>
            {instructionsError && <p role="status" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-xs text-[#895200]">{instructionsError} You may save the listing, but payment proof cannot be submitted until payment instructions are configured.</p>}
            {message && <p role="status" className="mt-4 rounded-lg bg-[#edf4ff] p-3 text-xs font-medium text-[#244f9e]">{message}</p>}
            <div className="mt-5 flex justify-end gap-3 border-t pt-5">
              <Link href="/listings" className="rounded-md border px-4 py-2 text-xs font-semibold">My listings</Link>
              <button disabled={busy || !policyAccepted} className="rounded-md bg-[#2864ed] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving..." : editingId ? "Save changes for review" : "Save and continue to payment"}</button>
            </div>
          </form>

          {listingId && ["DUE", "REJECTED"].includes(paymentStatus ?? "") && (
            <section className="mt-5 rounded-xl border border-[#dce4ee] bg-white p-6 shadow-sm" aria-labelledby="payment-heading">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Next step</p>
              <h2 id="payment-heading" className="mt-2 text-lg font-extrabold">Pay the R5 listing fee</h2>
              <p className="mt-2 text-xs leading-5 text-[#60728d]">Transfer the fee using the details below, then upload your proof. Use reference <strong>CE-{listingId}</strong>. Never send cash or payment credentials through this portal.</p>
              {instructions ? (
                <dl className="mt-4 grid gap-2 rounded-lg bg-[#f8fbff] p-4 text-xs sm:grid-cols-2">
                  <div><dt className="text-[#718198]">Account holder</dt><dd className="font-bold">{instructions.accountHolder}</dd></div>
                  <div><dt className="text-[#718198]">Bank</dt><dd className="font-bold">{instructions.bank}</dd></div>
                  <div><dt className="text-[#718198]">Account number</dt><dd className="font-bold">{instructions.accountNumber}</dd></div>
                  <div><dt className="text-[#718198]">Account type</dt><dd className="font-bold">{instructions.accountType}</dd></div>
                  <div><dt className="text-[#718198]">Fee / period</dt><dd className="font-bold">R{instructions.fee} / {instructions.periodDays} days</dd></div>
                </dl>
              ) : (
                <p role="alert" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-xs text-[#895200]">Payment destination is not configured. Your draft is private; ask the administrator to configure the receiving account before transferring money.</p>
              )}
              <label className="label">Proof of payment (JPG, PNG, or PDF; up to 5MB)
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={chooseProof} className="mt-2 w-full rounded-lg border border-dashed border-[#2864ed] bg-[#f8fbff] p-4 text-xs text-[#718198]" />
              </label>
              <p className="mt-2 text-[11px] leading-5 text-[#718198]">Do not upload a full bank statement or expose unrelated transactions. Redact unrelated information, but keep the amount, recipient, date, and reference readable.</p>
              <button type="button" disabled={busy || !instructions || !proofFile} onClick={submitProof} className="mt-4 rounded-lg bg-[#142039] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Uploading..." : "Upload proof for review"}</button>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
