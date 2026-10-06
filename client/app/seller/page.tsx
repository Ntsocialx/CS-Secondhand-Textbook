"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Seller() {
  return <Suspense fallback={<main className="p-8 text-sm text-[#718198]">Loading seller details...</main>}><SellerContact /></Suspense>;
}

function SellerContact() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const listingId = searchParams.get("listing") ?? "";
  const [listing, setListing] = useState<Listing | null>(null);
  const [contact, setContact] = useState<{ email: string; phone: string | null; firstName?: string | null; lastName?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [contactNotice, setContactNotice] = useState("");

  const sellerName = contact?.firstName || contact?.lastName
    ? [contact?.firstName, contact?.lastName].filter(Boolean).join(" ")
    : "Seller";

  const formattedPhone = contact?.phone ? contact.phone.replace(/\D/g, "") : "";
  const normalizedWhatsAppPhone = formattedPhone
    ? formattedPhone.startsWith("27")
      ? formattedPhone
      : formattedPhone.startsWith("0")
        ? `27${formattedPhone.slice(1)}`
        : formattedPhone
    : "";
  const whatsAppUrl = normalizedWhatsAppPhone
    ? `https://wa.me/${normalizedWhatsAppPhone}?text=${encodeURIComponent(`Hi ${sellerName}, I am interested in getting your listed book ${listing?.title ?? "book"}`)}`
    : "";

  useEffect(() => {
    if (!session?.user.accessToken || !listingId) return;
    fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${listingId}`, withBearer(session.user.accessToken))
      .then((payload) => setListing(payload.listing))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load seller details."))
      .finally(() => setLoading(false));
  }, [session?.user.accessToken, listingId]);

  async function revealContact() {
    const currentListing = listing;
    if (!session?.user.accessToken || !listingId || !contactConsent || !currentListing) return;
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    setBusy(true);
    setError("");
    setContactNotice("");
    try {
      const payload = await fetchJson<{ contact: { email: string; phone: string | null; firstName?: string | null; lastName?: string | null } }>(`${apiUrl}/api/listings/${listingId}/contact`, withBearer(session.user.accessToken));
      setContact(payload.contact);
      const phone = payload.contact.phone?.replace(/\D/g, "") ?? "";
      const normalizedPhone = phone.startsWith("27")
        ? phone
        : phone.startsWith("0")
          ? `27${phone.slice(1)}`
          : phone;
      if (!whatsappWindow) {
        setContactNotice("Your browser blocked the WhatsApp window. Use the link below to continue.");
      } else if (!/^\d{8,15}$/.test(normalizedPhone)) {
        whatsappWindow.close();
        setContactNotice("The seller has no valid WhatsApp number. Their email is shown below.");
      } else {
        const name = [payload.contact.firstName, payload.contact.lastName].filter(Boolean).join(" ") || "Seller";
        const message = `Hi ${name}, I am interested in getting your listed book ${currentListing.title}`;
        whatsappWindow.location.href = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
      }
    } catch (e) {
      whatsappWindow?.close();
      setError(e instanceof Error ? e.message : "Unable to reveal contact details.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionStatus === "loading" || (listingId && loading)) return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-xs text-[#718198]">Loading...</div>;
  if (!listingId) return <main className="p-10 text-center"><p>Listing not found.</p><Link href="/browse" className="mt-4 inline-block text-[#2864ed]">Back to Browse</Link></main>;
  if (!session) {
    return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex flex-1 items-center justify-center px-5"><div className="max-w-md rounded-2xl border border-[#dce4ee] bg-white p-8 text-center shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2864ed]">Student access required</p><h1 className="mt-3 text-2xl font-extrabold">Log in to contact this seller</h1><p className="mt-3 text-sm text-[#60728d]">Only verified TUT students can reveal seller contact details and start a WhatsApp conversation.</p><Link href={`/login?callbackUrl=${encodeURIComponent(`/seller?listing=${listingId}`)}`} className="mt-6 inline-flex rounded-lg bg-[#2864ed] px-6 py-3 text-xs font-bold text-white">Sign in to continue</Link></div></main><Footer /></div>;
  }
  if (error || !listing) return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex flex-1 items-center justify-center"><div className="text-center"><p className="text-sm font-bold">{error || "Seller not found."}</p><Link href="/browse" className="mt-4 inline-block text-xs text-[#2864ed]">Back to Browse</Link></div></main><Footer /></div>;

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex-1 px-5 py-14"><Link href={`/books/${listing.id}`} className="mx-auto block max-w-[570px] text-[11px] text-[#2161ee]">← &nbsp;Back to Listing Details</Link><section className="mx-auto mt-6 max-w-[360px] rounded-2xl border border-[#dce4ee] bg-white p-7 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#b88956] text-xl font-bold text-white" aria-hidden="true">S</div><h1 className="mt-3 text-lg font-extrabold">Seller</h1><p className="text-[10px] text-[#718198]">Verified Campus Student</p><hr className="my-4 border-[#e2e8f0]" /><div className="space-y-3 text-left text-[10px]"><p>📍 <b className="ml-2 block text-[9px] uppercase text-[#718198]">Campus</b><span className="ml-7">{listing.campus}</span></p><p>▣ <b className="ml-2 block text-[9px] uppercase text-[#718198]">Course Code</b><span className="ml-7">{listing.courseCode}</span></p></div><hr className="my-4 border-[#e2e8f0]" /><h2 className="text-left text-[11px] font-bold">Direct Contact Details</h2><div className="mt-3 space-y-2 text-left text-xs font-bold">
    {contact ? (
      <>
        <div className="rounded-lg border bg-[#f8fafc] px-3 py-3">✉ &nbsp; {contact.email}</div>
        {contact.phone && <div className="rounded-lg border bg-[#f8fafc] px-3 py-3">♧ &nbsp; {contact.phone}</div>}
      </>
    ) : (
      <>
        <label className="flex items-start gap-2 rounded-lg bg-[#f8fafc] p-3 text-left text-[10px] font-normal leading-4 text-[#43536d]">
          <input type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-0.5" />
          <span>I agree to reveal this seller’s contact details for this listing and continue to WhatsApp.</span>
        </label>
        <button onClick={revealContact} disabled={busy || !contactConsent} className="w-full rounded-lg bg-[#2864ed] py-3 text-[10px] font-bold text-white disabled:opacity-50">{busy ? "Opening WhatsApp..." : "Contact Seller on WhatsApp"}</button>
      </>
    )}
  </div>{error && <p role="alert" className="mt-4 text-[10px] font-bold text-[#e45757]">{error}</p>}{contactNotice && <p role="status" className="mt-4 text-[10px] font-bold text-[#895200]">{contactNotice}</p>}{contactNotice && contact && <a href={whatsAppUrl || `mailto:${contact.email}`} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#25d366] px-4 py-3 text-[10px] font-bold text-white">{whatsAppUrl ? "Continue to WhatsApp" : "Email Seller"}</a>}<div className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-left text-[10px] leading-4 text-[#b26209]"><b>ⓘ &nbsp; Safety Reminder</b><br /><span className="ml-5">Meet in a public campus area during daylight and inspect the book before agreeing to a sale or exchange.</span></div>  </section><Link href={`/report?listing=${listing.id}`} className="mx-auto mt-4 block max-w-[360px] text-center text-[10px] font-bold text-[#e45757]">⚑ Report this listing or user</Link></main><Footer /></div>;
}
