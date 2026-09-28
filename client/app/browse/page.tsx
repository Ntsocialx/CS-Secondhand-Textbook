"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Browse() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [campus, setCampus] = useState("");
  const [condition, setCondition] = useState("");
  const [kind, setKind] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user.accessToken) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    if (courseCode) params.set("courseCode", courseCode);
    if (campus) params.set("campus", campus);
    if (condition) params.set("condition", condition);
    if (kind) params.set("isTrade", kind === "exchange" ? "true" : "false");
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("sort", sort);
    fetchJson<{ listings: Listing[] }>(`${apiUrl}/api/listings?${params}`, withBearer(session.user.accessToken))
      .then((payload) => {
        setError("");
        setListings(payload.listings);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load listings."))
      .finally(() => setLoading(false));
  }, [session?.user.accessToken, search, category, courseCode, campus, condition, kind, minPrice, maxPrice, sort]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setCourseCode("");
    setCampus("");
    setCondition("");
    setKind("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Browse" />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8">
        <section className="rounded-2xl bg-[#142039] px-5 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a9c4ff]">Campus book exchange</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Find your next book</h1><p className="mt-2 text-xs text-white/70">Browse approved books for sale or exchange from fellow students.</p></div>
            <Link href="/sell" className="rounded-lg bg-white px-4 py-3 text-xs font-bold text-[#142039]">＋ List a book · R5 / 30 days</Link>
          </div>
          <label className="mt-5 block">
            <span className="sr-only">Search books by title, course code, or description</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search book title, course code, or keywords" className="w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-sm text-[#142039] placeholder:text-[#718198] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89aaff]" />
          </label>
        </section>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="rounded-xl border border-[#dce4ee] bg-white p-4" aria-label="Listing filters">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Filters</h2><button type="button" onClick={clearFilters} className="text-[10px] font-bold text-[#2161ee]">Clear all</button></div>
            <Filter title="BOOK CATEGORY"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option><option>Textbook</option><option>Bible</option><option>Comic Book</option><option>Manga</option></select></Filter>
            <Filter title="COURSE CODE"><input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} placeholder="e.g. CSC202" /></Filter>
            <Filter title="LISTING TYPE"><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">Sale or exchange</option><option value="sale">For sale</option><option value="exchange">For exchange</option></select></Filter>
            <Filter title="BOOK CONDITION"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">All conditions</option><option>Like New</option><option>Good</option><option>Acceptable</option><option>Worn</option></select></Filter>
            <Filter title="CAMPUS"><select value={campus} onChange={(event) => setCampus(event.target.value)}><option value="">All campuses</option><option>Tshwane University of Technology (TUT)</option><option>University of Cape Town (UCT)</option><option>Wits University</option><option>Stellenbosch University</option><option>University of Pretoria (UP)</option></select></Filter>
            <div className="mt-5"><p className="mb-2 text-[9px] font-bold text-[#64748b]">PRICE RANGE (RAND)</p><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum price" min="0" type="number" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min" /><input aria-label="Maximum price" min="0" type="number" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max" /></div></div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dce4ee] pb-4">
              <div><h2 className="text-lg font-extrabold">Approved books</h2><p aria-live="polite" className="mt-1 text-[10px] text-[#718198]">{listings.length} result{listings.length === 1 ? "" : "s"}</p></div>
              <label className="text-[10px] font-bold text-[#60728d]">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)} className="ml-2 rounded-md border border-[#dce4ee] bg-white px-2 py-2 text-[#142039]"><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
            </div>
            {error && <p role="alert" className="mt-5 rounded-lg bg-[#fff0bf] p-3 text-xs font-bold text-[#895200]">{error}</p>}
            {loading ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading approved books">{[1, 2, 3].map((item) => <div key={item} className="h-[280px] animate-pulse rounded-xl bg-white" />)}</div> : listings.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#cbd6e4] bg-white p-10 text-center">
                <h3 className="font-bold">No approved listings match those filters yet.</h3>
                <p className="mt-2 text-xs text-[#718198]">Try clearing a filter, or submit a book for review.</p>
                <Link href="/sell" className="mt-4 inline-flex rounded-lg bg-[#2864ed] px-4 py-3 text-xs font-bold text-white">List a book</Link>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Filter({ title, children }: { title: string; children: ReactNode }) {
  return <label className="mt-5 block"><span className="mb-2 block text-[9px] font-bold text-[#64748b]">{title}</span>{children}</label>;
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/books/${listing.id}`} className="overflow-hidden rounded-xl border border-[#dce4ef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2864ed]">
      <div className="relative h-[175px] bg-[#edf4ff]">{listing.imageUrl ? <Image src={listing.imageUrl} alt={`${listing.title} book cover`} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-semibold text-[#718198]">No book photo provided</div>}</div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2"><span className="rounded bg-[#edf4ff] px-2 py-1 text-[9px] font-bold text-[#2463ed]">{listing.category}</span><span className="text-[10px] text-[#718198]">{listing.condition}</span></div>
        <h3 className="mt-3 min-h-[40px] text-sm font-bold leading-5">{listing.title}</h3>
        <p className="mt-2 text-[10px] text-[#718198]">{listing.courseCode} · {listing.campus}</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#e5eaf1] pt-3"><b className="text-sm">{listing.isTrade ? "For exchange" : `R ${listing.price}`}</b><span className="text-[9px] font-bold text-[#13835c]">Approved</span></div>
      </div>
    </Link>
  );
}
