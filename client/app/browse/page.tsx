"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import Image from "next/image";
import { Header, Footer, BookCard } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";
import { books, getStockBookImage } from "@/lib/marketplace";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Browse() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [courseCode, setCourseCode] = useState("");
  const [campus, setCampus] = useState("");
  const [condition, setCondition] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user.accessToken) return;
    const params = new URLSearchParams();
    if (courseCode) params.set("courseCode", courseCode);
    if (campus) params.set("campus", campus);
    if (condition) params.set("condition", condition);
    fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/listings?${params}`, withBearer(session.user.accessToken))
      .then((payload) => setListings(payload.listings))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load listings."))
      .finally(() => setLoading(false));
  }, [session?.user.accessToken, courseCode, campus, condition]);

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="mx-auto flex w-full max-w-[1080px] flex-1 gap-6 px-5 py-9"><aside className="hidden w-[200px] shrink-0 rounded-xl border border-[#dce4ee] bg-white p-4 text-[10px] lg:block"><div className="flex justify-between text-sm font-bold">Filters <button type="button" onClick={() => { setCourseCode(""); setCampus(""); setCondition(""); }} className="text-[9px] font-normal text-[#2161ee]">Clear All</button></div><div className="mt-7 h-[72px] border border-[#dce4ee]" /><Filter title="COURSE CODE"><input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} placeholder="⌕  CSC202" className="w-full rounded-lg border border-[#dce4ee] px-2 py-2 text-[10px]" /></Filter><Filter title="BOOK CONDITION"><select value={condition} onChange={(event) => setCondition(event.target.value)} className="w-full rounded-lg border border-[#dce4ee] px-2 py-2 text-[10px]"><option value="">All conditions</option><option>Like New</option><option>Good</option><option>Acceptable</option><option>Worn</option></select></Filter><Filter title="CAMPUS"><select value={campus} onChange={(event) => setCampus(event.target.value)} className="w-full rounded-lg border border-[#dce4ee] px-2 py-2 text-[10px]"><option value="">All campuses</option><option>Tshwane University of Technology (TUT)</option><option>University of Cape Town (UCT)</option><option>Wits University</option><option>Stellenbosch University</option><option>University of Pretoria (UP)</option></select></Filter></aside><section className="min-w-0 flex-1"><div className="flex items-center justify-between"><div><h1 className="text-lg font-extrabold">Available textbooks</h1><p className="text-[10px] text-[#718198]">{listings.length} listing{listings.length === 1 ? "" : "s"} found</p></div></div>{error && <p className="mt-5 rounded-lg bg-[#fff0bf] p-3 text-[10px] font-bold text-[#9a5d09]">{error}</p>}{loading ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[285px] animate-pulse rounded-xl bg-white" />)}</div> : listings.length > 0 ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-12 text-center text-xs text-[#718198]">No database listings match these filters yet. Publish the first textbook from the Sell page.</div>}<div className="mt-10 border-t pt-7"><p className="text-[10px] font-bold uppercase text-[#718198]">Figma preview catalog</p>  <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{books.map((book) => <BookCard key={book.id} book={book} />)}</div></div></section></main><Footer /></div>;
}

function Filter({ title, children }: { title: string; children: ReactNode }) { return <div className="mt-6"><p className="mb-2 text-[9px] font-bold text-[#64748b]">{title}</p>{children}</div>; }

function ListingCard({ listing }: { listing: Listing }) { return <a href={`/books/${listing.id}`} className="overflow-hidden rounded-xl border border-[#dce4ef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative h-[155px] bg-[#edf4ff]"><Image src={listing.imageUrl ?? getStockBookImage(listing.courseCode)} alt={`${listing.title} textbook`} fill unoptimized className="object-cover" /></div><div className="p-3"><span className="rounded bg-[#edf4ff] px-1.5 py-1 text-[9px] font-bold text-[#2463ed]">{listing.courseCode}</span><h3 className="mt-2 min-h-[30px] text-[12px] font-bold leading-4">{listing.title}</h3><p className="mt-2 text-[10px] text-[#718198]">⌖ {listing.campus}</p></div><div className="flex justify-between border-t p-3"><b>R {listing.price}</b><span className="text-[9px] font-bold text-[#13a66d]">● Available</span></div></a>; }
