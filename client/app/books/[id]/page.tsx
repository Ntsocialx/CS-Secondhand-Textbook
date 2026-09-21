"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";
import { books, getStockBookImage } from "@/lib/marketplace";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function BookDetails() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const preview = books.find((book) => book.id === params.id);
  const loading = Boolean(session?.user.accessToken) && !listing && !error;

  useEffect(() => {
    if (!params.id) return;
    if (!session?.user.accessToken) return;
    fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${params.id}`, withBearer(session.user.accessToken))
      .then((payload) => setListing(payload.listing))
      .catch((requestError: unknown) => {
        if (preview) {
          setListing({
            id: preview.id,
            title: preview.title,
            courseCode: preview.course,
            price: preview.price,
            condition: preview.condition as Listing["condition"],
            description: "Preview listing from the Campus Exchange catalogue. Contact the seller to confirm availability and arrange a safe campus meetup.",
            campus: preview.campus,
            imageUrl: preview.image,
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            category: "Textbook",
            isTrade: false,
          });
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load the listing.");
      })
      ;
  }, [session?.user.accessToken, params.id]);

  const displayedListing = listing ?? (preview ? {
    id: preview.id, title: preview.title, courseCode: preview.course, price: preview.price,
    condition: preview.condition as Listing["condition"], description: "Preview listing from the Campus Exchange catalogue. Contact the seller to confirm availability and arrange a safe campus meetup.",
    campus: preview.campus, imageUrl: preview.image, status: "ACTIVE" as const, createdAt: new Date().toISOString(), category: "Textbook", isTrade: false,
  } : null);
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-xs text-[#718198]">Loading listing...</div>;
  if (error || !displayedListing) return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="flex flex-1 items-center justify-center"><div className="text-center"><p className="text-sm font-bold">{error || "Listing not found."}</p><Link href="/browse" className="mt-4 inline-block text-xs text-[#2864ed]">Back to Browse</Link></div></main></div>;
  const currentListing = displayedListing;
  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Browse" /><main className="mx-auto w-full max-w-[970px] flex-1 px-5 py-7"><Link href="/browse" className="text-[11px] font-medium text-[#2161ee]">← &nbsp;Back to Browse</Link><div className="mt-4 grid gap-8 lg:grid-cols-[365px_1fr]"><div className="flex min-h-[463px] items-center justify-center overflow-hidden rounded-xl bg-[#edf4ff] text-center text-xl font-black text-[#2864ed]"><img src={currentListing.imageUrl ?? getStockBookImage(currentListing.courseCode)} alt={`${currentListing.title} textbook`} className="h-full w-full object-cover" /></div><div><div className="flex gap-2 text-[9px]"><span className="rounded bg-[#edf4ff] px-2 py-1 font-bold text-[#2864ed]">{currentListing.courseCode}</span><span className="rounded border px-2 py-1">{currentListing.condition}</span><span className={`rounded px-2 py-1 font-bold ${currentListing.status === "ACTIVE" ? "bg-[#e2f7ed] text-[#13a66d]" : "bg-slate-100 text-slate-500"}`}>● {currentListing.status}</span></div><h1 className="mt-4 text-3xl font-extrabold tracking-tight">{currentListing.title}</h1><p className="mt-3 text-2xl font-black">R {currentListing.price}</p><h2 className="mt-6 text-[10px] font-bold uppercase text-[#718198]">Description</h2><p className="mt-3 text-xs leading-6 text-[#25334a]">{currentListing.description}</p><h2 className="mt-6 text-[10px] font-bold uppercase text-[#718198]">Campus</h2><p className="mt-2 text-xs">{currentListing.campus}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href={`/seller?listing=${currentListing.id}`} className="rounded-lg bg-[#2864ed] py-3 text-center text-xs font-bold text-white">▢ &nbsp; View Seller Contact</Link><Link href="/report" className="rounded-lg bg-[#e45757] py-3 text-center text-xs font-bold text-white">⚑ &nbsp; Report a problem</Link></div><div className="mt-6 rounded-xl bg-[#fff0bf] p-4 text-[10px] leading-4 text-[#b26209]"><b>ⓘ &nbsp; Meeting Safety Guideline</b><br />Meet in a public on-campus space during daylight hours, confirm the Rand price, and inspect the textbook before payment.</div></div></div></main><Footer /></div>;
}
