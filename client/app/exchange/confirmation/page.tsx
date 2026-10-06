"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type ExchangeRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  offeredBookTitle: string;
  offeredBookCourse: string;
  status: string;
  createdAt: string;
};

export default function ExchangeConfirmationPage() {
  return <Suspense fallback={<main className="p-8 text-sm text-[#718198]">Checking your request...</main>}><ExchangeConfirmationContent /></Suspense>;
}

function ExchangeConfirmationContent() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const id = searchParams.get("id");
  const [exchange, setExchange] = useState<ExchangeRequest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user.accessToken;
    if (status === "loading") return;
    if (!id || !token) {
      return;
    }
    let cancelled = false;
    fetchJson<{ outgoing: ExchangeRequest[] }>(`${apiUrl}/api/my-exchanges`, withBearer(token))
      .then(({ outgoing }) => {
        if (cancelled) return;
        const ownRequest = outgoing.find((item) => item.id === id);
        if (!ownRequest) setError("Exchange request not found in your account.");
        else setExchange(ownRequest);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to confirm your exchange request.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, session?.user.accessToken, status]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Browse" />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-[560px] rounded-2xl border border-[#dce4ee] bg-white p-7 text-center shadow-sm">
          {(status === "loading" || (Boolean(session?.user.accessToken) && loading)) ? <p className="text-sm text-[#718198]">Checking your request...</p>
            : !id || !session?.user.accessToken ? <><h1 className="text-xl font-extrabold">Exchange request not found</h1><p className="mt-3 text-sm text-[#718198]">Open a request from your exchange history or return to Browse.</p></>
            : error ? <><h1 className="text-xl font-extrabold">Could not load confirmation</h1><p role="alert" className="mt-3 text-sm text-[#895200]">{error}</p></>
              : exchange && <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e2f7ed] text-xl text-[#13835c]" aria-hidden="true">✓</span>
                <h1 className="mt-4 text-2xl font-extrabold">Exchange request sent</h1>
                <p role="status" className="mt-2 text-sm leading-6 text-[#60728d]">
                  Your offer of <b>{exchange.offeredBookTitle}</b> ({exchange.offeredBookCourse}) was sent for <b>{exchange.listingTitle}</b>.
                </p>
                <p className="mt-3 rounded-lg bg-[#edf4ff] p-3 text-xs font-bold text-[#244f9e]">Status: {exchange.status}</p>
                <p className="mt-4 text-xs leading-5 text-[#718198]">The listing owner can accept or decline. Check your exchange requests for status updates. Arrange any meetup in a public campus area during daylight; the portal does not provide chat or payments.</p>
              </>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/exchange" className="rounded-lg bg-[#2864ed] px-5 py-3 text-xs font-bold text-white">View exchange requests</Link>
            <Link href={exchange ? `/books/${exchange.listingId}` : "/browse"} className="rounded-lg border border-[#cbd8eb] px-5 py-3 text-xs font-bold">Back to listing</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
