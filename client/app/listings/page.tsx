"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";
import { getStockBookImage } from "@/lib/marketplace";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Listings() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!session?.user.accessToken) return;
    fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/my-listings`, withBearer(session.user.accessToken))
      .then((payload) => setListings(payload.listings))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load your listings."));
  }, [session?.user.accessToken]);

  async function markSold(id: string) {
    if (!session?.user.accessToken) return;
    try {
      await fetchJson(`${apiUrl}/api/listings/${id}/sold`, withBearer(session.user.accessToken, { method: "POST" }));
      setListings((current) => current.map((listing) => listing.id === id ? { ...listing, status: "SOLD" } : listing));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the listing.");
    }
  }

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="My Listings" /><main className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"><div className="flex items-start justify-between"><div><h1 className="text-2xl font-extrabold">My Listings</h1><p className="mt-1 text-xs text-[#718198]">Manage and track your published textbooks on campus</p></div><Link href="/sell" className="rounded-lg bg-[#2864ed] px-4 py-3 text-[11px] font-bold text-white">＋ List Another Textbook</Link></div>{message && <p className="mt-5 rounded-lg bg-[#fff0bf] p-3 text-[10px] font-bold text-[#9a5d09]">{message}</p>}<div className="mt-7 space-y-3">{listings.length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-xs text-[#718198]">You have not published any listings yet.</div> : listings.map((listing) => <div key={listing.id} className="flex items-center gap-4 rounded-xl border border-[#dce4ee] bg-white p-4"><div className="flex h-[88px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#edf4ff] text-center text-[10px] font-bold text-[#2864ed]"><img src={listing.imageUrl ?? getStockBookImage(listing.courseCode)} alt={`${listing.title} textbook`} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><div><span className="rounded bg-[#edf4ff] px-2 py-1 text-[9px] font-bold text-[#2864ed]">{listing.courseCode}</span><span className={`ml-2 rounded px-2 py-1 text-[9px] font-bold ${listing.status === "SOLD" ? "bg-slate-100 text-slate-500" : "bg-[#e2f7ed] text-[#13a66d]"}`}>{listing.status}</span></div><Link href={`/books/${listing.id}`} className="mt-2 block text-sm font-bold hover:text-[#2864ed]">{listing.title}</Link><p className="mt-1 text-[10px] text-[#718198]">Listed on: {new Date(listing.createdAt).toLocaleDateString()} · Campus: {listing.campus}</p></div><b className="hidden text-lg sm:block">R {listing.price}</b>{listing.status === "ACTIVE" && <button type="button" onClick={() => markSold(listing.id)} className="hidden rounded-md bg-[#e2f7ed] px-3 py-2 text-[10px] font-bold text-[#13a66d] sm:block">Mark as Sold</button>}</div>)}</div></main><Footer /></div>;
}
