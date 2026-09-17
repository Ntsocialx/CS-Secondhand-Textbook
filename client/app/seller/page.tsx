"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Seller() {
  const { listingId } = useParams<{ listingId: string }>();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [contact, setContact] = useState<{ email: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.user.accessToken || !listingId) return;
    fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${listingId}`, withBearer(session.user.accessToken))
      .then((payload) => setListing(payload.listing))
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load seller details."))
      .finally(() => setLoading(false));
  }, [session?.user.accessToken, listingId]);

  async function revealContact() {
    if (!session?.user.accessToken || !listingId) return;
    setBusy(true);
    try {
      const payload = await fetchJson<{ contact: { email: string; phone: string } }>(`${apiUrl}/api/listings/${listingId}/contact`, withBearer(session.user.accessToken));
      setContact(payload.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reveal contact details.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-xs text-[#718198]">Loading...</div>;
  if (error || !listing) return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex flex-1 items-center justify-center"><div className="text-center"><p className="text-sm font-bold">{error || "Seller not found."}</p><Link href="/browse" className="mt-4 inline-block text-xs text-[#2864ed]">Back to Browse</Link></div></main><Footer /></div>;

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex-1 px-5 py-14"><Link href={`/books/${listing.id}`} className="mx-auto block max-w-[570px] text-[11px] text-[#2161ee]">← &nbsp;Back to Listing Details</Link><section className="mx-auto mt-6 max-w-[360px] rounded-2xl border border-[#dce4ee] bg-white p-7 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#b88956] text-xl font-bold text-white">{listing.sellerEmail?.[0].toUpperCase() || "U"}</div><h1 className="mt-3 text-lg font-extrabold">Seller</h1><p className="text-[10px] text-[#718198]">Verified Campus Student</p><hr className="my-4 border-[#e2e8f0]" /><div className="space-y-3 text-left text-[10px]"><p>📍 <b className="ml-2 block text-[9px] uppercase text-[#718198]">Campus</b><span className="ml-7">{listing.campus}</span></p><p>▣ <b className="ml-2 block text-[9px] uppercase text-[#718198]">Course Code</b><span className="ml-7">{listing.courseCode}</span></p></div><hr className="my-4 border-[#e2e8f0]" /><h2 className="text-left text-[11px] font-bold">Direct Contact Details</h2><div className="mt-3 space-y-2 text-left text-xs font-bold">
    {contact ? (
      <>
        <div className="rounded-lg border bg-[#f8fafc] px-3 py-3">✉ &nbsp; {contact.email}</div>
        <div className="rounded-lg border bg-[#f8fafc] px-3 py-3">♧ &nbsp; {contact.phone}</div>
      </>
    ) : (
      <button onClick={revealContact} disabled={busy} className="w-full rounded-lg bg-[#2864ed] py-3 text-[10px] font-bold text-white disabled:opacity-50">{busy ? "Loading..." : "Reveal Seller Contact"}</button>
    )}
  </div>{error && <p className="mt-4 text-[10px] font-bold text-[#e45757]">{error}</p>}<div className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-left text-[10px] leading-4 text-[#b26209]"><b>ⓘ &nbsp; Safety Reminder</b><br /><span className="ml-5">Always meet in a public campus area. Inspect the condition of the textbook before payment.</span></div>  </section><Link href="/report" className="mx-auto mt-4 block max-w-[360px] text-center text-[10px] font-bold text-[#e45757]">⚑ Report this user</Link></main><Footer /></div>;
}
