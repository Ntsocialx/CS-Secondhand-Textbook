"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function BookDetails() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id || !session?.user.accessToken) return;
    fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${params.id}`, withBearer(session.user.accessToken))
      .then((payload) => setListing(payload.listing))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load the listing."));
  }, [params.id, session?.user.accessToken]);

  if (status === "loading" || (session?.user.accessToken && !listing && !error)) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-sm text-[#718198]">Loading approved listing...</main>;
  }
  if (!listing || error) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
        <Header active="Browse" />
        <main className="flex flex-1 items-center justify-center px-5">
          <div className="text-center"><h1 className="text-lg font-bold">{error || "This listing is not available."}</h1><p className="mt-2 text-xs text-[#718198]">Only approved, active listings can be opened.</p><Link href="/browse" className="mt-4 inline-block text-xs font-bold text-[#2864ed]">Back to Browse</Link></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Browse" />
      <main className="mx-auto w-full max-w-[970px] flex-1 px-5 py-7">
        <Link href="/browse" className="text-[11px] font-medium text-[#2161ee]">← &nbsp;Back to Browse</Link>
        <div className="mt-4 grid gap-8 lg:grid-cols-[365px_1fr]">
          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl bg-[#edf4ff] text-center text-xl font-black text-[#2864ed]">
            {listing.imageUrl ? <Image src={listing.imageUrl} alt={`${listing.title} book cover`} width={365} height={460} unoptimized className="h-full w-full object-cover" /> : <span className="text-xs font-semibold text-[#718198]">No book photo provided</span>}
          </div>
          <div>
            <div className="flex flex-wrap gap-2 text-[9px]"><span className="rounded bg-[#edf4ff] px-2 py-1 font-bold text-[#2864ed]">{listing.category}</span><span className="rounded border px-2 py-1">{listing.courseCode}</span><span className="rounded border px-2 py-1">{listing.condition}</span><span className="rounded bg-[#e2f7ed] px-2 py-1 font-bold text-[#13835c]">Approved · Active</span></div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{listing.title}</h1>
            <p className="mt-3 text-2xl font-black">{listing.isTrade ? "For exchange" : `R ${listing.price}`}</p>
            {listing.isTrade && <p className="mt-2 text-sm text-[#60728d]">Looking for: {listing.tradeRequest}</p>}
            <h2 className="mt-6 text-[10px] font-bold uppercase text-[#718198]">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#25334a]">{listing.description}</p>
            <h2 className="mt-6 text-[10px] font-bold uppercase text-[#718198]">Campus</h2>
            <p className="mt-2 text-xs">{listing.campus}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href={`/seller?listing=${listing.id}`} className="rounded-lg bg-[#2864ed] py-3 text-center text-xs font-bold text-white">View Seller Contact</Link>
              <Link href={`/report?listing=${listing.id}`} className="rounded-lg bg-[#e45757] py-3 text-center text-xs font-bold text-white">Report a problem</Link>
            </div>
            <div className="mt-6 rounded-xl bg-[#fff0bf] p-4 text-[10px] leading-4 text-[#895200]"><b>Meet safely</b><br />Meet in a public on-campus space during daylight hours, confirm sale or exchange details, and inspect the book before completing the exchange.</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
