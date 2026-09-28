"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/public/listings`)
      .then((payload) => { if (!cancelled) { setError(""); setListings(payload.listings); } })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load approved listings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retryCount]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Home" />
      <main className="flex-1">
        <section className="overflow-hidden bg-[#f3f7ff]">
          <div className="mx-auto grid max-w-[1160px] items-center gap-10 px-5 py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
            <div className="max-w-[580px]">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2864ed]">
                <span className="h-2 w-2 rounded-full bg-[#17a873]" aria-hidden="true" />
                The TUT student book exchange
              </p>
              <h1 className="mt-5 max-w-[580px] text-pretty text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] sm:text-5xl lg:text-[58px]">
                Your next textbook is already on campus.
              </h1>
              <p className="mt-5 max-w-[470px] text-sm leading-6 text-[#60728d] sm:text-base sm:leading-7">
                Find secondhand course books from fellow students, save on your
                semester reading, and arrange a safe campus meetup.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/browse"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#2864ed] px-6 text-sm font-bold text-white shadow-[0_8px_20px_rgba(40,100,237,0.18)] transition hover:bg-[#1e50cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed] focus-visible:ring-offset-2"
                >
                  Browse textbooks
                  <span className="ml-3 text-lg" aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/sell"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#cbd8eb] bg-white px-6 text-sm font-bold text-[#142039] transition hover:border-[#2864ed] hover:text-[#2161ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed] focus-visible:ring-offset-2"
                >
                  List a book
                </Link>
              </div>
              <p className="mt-6 text-[11px] font-medium text-[#718198]">
                Student-to-student · Prices in Rand · Meet safely on campus
              </p>
            </div>

            <div className="group relative mx-auto block aspect-[1.12] w-full max-w-[500px] overflow-hidden rounded-[28px] bg-[#dce8fa] shadow-[0_28px_70px_rgba(34,61,102,0.16)]">
              <Image
                src="https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=85"
                alt=""
                fill
                priority
                unoptimized
                sizes="(max-width: 1024px) 100vw, 500px"
                className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1d37]/75 via-transparent to-[#0d1d37]/10" />
              <div className="absolute left-5 top-5 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#34445f] backdrop-blur-sm">
                TUT student exchange
              </div>
              <div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-7 sm:bottom-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Reviewed before appearing</p>
                  <h2 className="mt-1 max-w-[330px] text-xl font-extrabold leading-tight sm:text-2xl">Only approved books show up in Browse.</h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden px-5 py-12 sm:py-16">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1800&q=85')",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-10 bg-white/90" aria-hidden="true" />
          <div className="mx-auto max-w-[1080px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2864ed]">
                  Verified by review
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Recently approved books
                </h2>
                <p className="mt-2 text-sm text-[#60728d]">
                  Browse current books submitted by students and approved under the marketplace rules.
                </p>
              </div>
              <Link
                href="/browse"
                className="inline-flex min-h-10 items-center font-bold text-[#2161ee] transition hover:text-[#173fae] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed] focus-visible:ring-offset-2"
              >
                Browse all books <span className="ml-2 text-lg" aria-hidden="true">→</span>
              </Link>
            </div>

            {error && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#fff0bf] p-3 text-xs text-[#895200]"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }} className="font-bold underline">Retry</button></div>}
            {loading ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[280px] animate-pulse rounded-xl bg-white" />)}</div> : error ? null : listings.length ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <PublicListingCard key={listing.id} listing={listing} />)}</div>
            ) : (
              <div className="mt-7 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-10 text-center">
                <h3 className="font-bold">No books have been approved yet.</h3>
                <p className="mt-2 text-xs text-[#718198]">New submissions appear here after payment verification and content review.</p>
                <Link href="/browse" className="mt-4 inline-flex rounded-lg bg-[#2864ed] px-4 py-3 text-xs font-bold text-white">Browse approved books</Link>
              </div>
            )}
          </div>
        </section>

        <section className="px-5 py-12 sm:py-16">
          <div className="mx-auto flex max-w-[1080px] flex-col justify-between gap-6 rounded-2xl bg-[#142039] px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a9c4ff]">
                Pass it forward
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Finished with a textbook?
              </h2>
              <p className="mt-2 max-w-[500px] text-sm leading-6 text-white/70">
                List it for another student and arrange a safe, in-person campus exchange.
              </p>
            </div>
            <Link
              href="/sell"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-white px-5 text-sm font-bold text-[#142039] transition hover:bg-[#eaf0fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#142039]"
            >
              List your textbook <span className="ml-3 text-lg" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PublicListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/books/${listing.id}`} className="overflow-hidden rounded-xl border border-[#dce4ef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed]">
      <div className="relative h-[155px] bg-[#edf4ff]">{listing.imageUrl ? <Image src={listing.imageUrl} alt={`${listing.title} book cover`} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-semibold text-[#718198]">No book photo provided</div>}</div>
      <div className="p-3"><div className="flex justify-between gap-2"><span className="rounded bg-[#edf4ff] px-2 py-1 text-[9px] font-bold text-[#2463ed]">{listing.category}</span><span className="text-[9px] text-[#718198]">{listing.condition}</span></div><h3 className="mt-2 min-h-[36px] text-xs font-bold leading-4">{listing.title}</h3><p className="mt-2 text-[10px] text-[#718198]">{listing.courseCode} · {listing.campus}</p></div>
      <div className="flex justify-between border-t p-3"><b className="text-xs">{listing.isTrade ? "For exchange" : `R ${listing.price}`}</b><span className="text-[9px] font-bold text-[#13835c]">Approved</span></div>
    </Link>
  );
}
