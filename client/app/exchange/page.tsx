"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";
import type { Listing } from "@/lib/listings";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type ExchangeRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  offeredBookTitle: string;
  offeredBookCourse: string;
  conditionPreference: string | null;
  notes: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  respondedAt: string | null;
  requesterFirstName?: string;
  requesterLastName?: string;
};

export default function ExchangePage() {
  return <Suspense fallback={<main className="p-8 text-sm text-[#718198]">Loading exchange requests...</main>}><ExchangePageContent /></Suspense>;
}

function ExchangePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const listingId = searchParams.get("listing") ?? "";
  const [listing, setListing] = useState<Listing | null>(null);
  const [incoming, setIncoming] = useState<ExchangeRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ExchangeRequest[]>([]);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const token = session?.user.accessToken;

  const loadRequests = useCallback(async () => {
    if (!token) return;
    const result = await fetchJson<{ incoming: ExchangeRequest[]; outgoing: ExchangeRequest[] }>(
      `${apiUrl}/api/my-exchanges`,
      withBearer(token),
    );
    setIncoming(result.incoming);
    setOutgoing(result.outgoing);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [requests, target] = await Promise.all([
          fetchJson<{ incoming: ExchangeRequest[]; outgoing: ExchangeRequest[] }>(
            `${apiUrl}/api/my-exchanges`,
            withBearer(token),
          ),
          listingId
            ? fetchJson<{ listing: Listing }>(`${apiUrl}/api/listings/${listingId}`, withBearer(token))
            : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setIncoming(requests.incoming);
          setOutgoing(requests.outgoing);
          setListing(target?.listing ?? null);
          setError("");
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load exchange requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [listingId, sessionStatus, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !listingId) return;
    setBusyId("new");
    setError("");
    setNotice("");
    try {
      const result = await fetchJson<{ exchange: { id: string } }>(`${apiUrl}/api/exchanges`, withBearer(token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          offeredBookTitle: title,
          offeredBookCourse: course,
          conditionPreference: condition || null,
          notes,
        }),
      }));
      router.push(`/exchange/confirmation?id=${encodeURIComponent(result.exchange.id)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send this exchange request.");
    } finally {
      setBusyId(null);
    }
  }

  async function decide(requestId: string, nextStatus: "ACCEPTED" | "DECLINED") {
    if (!token) return;
    setBusyId(requestId);
    setError("");
    setNotice("");
    try {
      await fetchJson(`${apiUrl}/api/exchanges/${requestId}`, withBearer(token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }));
      await loadRequests();
      setNotice(`Exchange request ${nextStatus.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update this exchange request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Browse" />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-5 py-10">
        <header className="mb-7">
          <h1 className="text-2xl font-extrabold">Book exchanges</h1>
          <p className="mt-2 text-sm leading-6 text-[#60728d]">Send and manage exchange requests for books offered for trade. Arrange details in person; this portal has no chat or payment service.</p>
        </header>
        {error && <p role="alert" className="mb-4 rounded-lg bg-[#fff0bf] p-3 text-sm text-[#895200]">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-[#e2f7ed] p-3 text-sm text-[#137b53]">{notice}</p>}
        {(sessionStatus === "loading" || (Boolean(token) && loading)) ? <p className="text-sm text-[#718198]">Loading exchange requests...</p> : (
          <div className="space-y-8">
            {listingId && (
              <section className="rounded-xl border border-[#dce4ee] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Request an exchange</h2>
                {!listing ? <p className="mt-3 text-sm text-[#718198]">This listing is not available.</p>
                  : !listing.isTrade ? <p className="mt-3 text-sm text-[#718198]">This listing is not currently accepting exchange requests.</p>
                    : (
                      <>
                        <p className="mt-2 text-sm text-[#60728d]"><b>{listing.title}</b> · offered in exchange for: {listing.tradeRequest}</p>
                        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="label">Your book title
                            <input required minLength={2} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
                          </label>
                          <label className="label">Course code
                            <input required minLength={2} maxLength={30} value={course} onChange={(event) => setCourse(event.target.value)} />
                          </label>
                          <label className="label">Condition (optional)
                            <select value={condition} onChange={(event) => setCondition(event.target.value)}>
                              <option value="">No preference</option>
                              <option>Like New</option>
                              <option>Good</option>
                              <option>Acceptable</option>
                              <option>Worn</option>
                            </select>
                          </label>
                          <label className="label">Note (optional)
                            <textarea maxLength={1000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Share a brief note about the exchange." />
                          </label>
                          <p className="text-xs leading-5 text-[#718198] sm:col-span-2">Your request is visible only to you and this listing’s owner. Do not include contact or payment details.</p>
                          <button disabled={busyId === "new"} className="rounded-lg bg-[#2864ed] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">
                            {busyId === "new" ? "Sending..." : "Send exchange request"}
                          </button>
                        </form>
                      </>
                    )}
              </section>
            )}
            <section>
              <h2 className="mb-3 text-lg font-bold">Requests for your listings</h2>
              <RequestList requests={incoming} empty="You have no incoming exchange requests." onDecision={decide} busyId={busyId} />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-bold">Your requests</h2>
              <RequestList requests={outgoing} empty="You have not requested an exchange yet." />
            </section>
            <p className="rounded-lg bg-[#fff0bf] p-4 text-xs leading-5 text-[#895200]"><b>Meet safely:</b> meet in a public campus area during daylight, bring someone you trust if appropriate, inspect both books, and agree the exchange details before handing items over.</p>
          </div>
        )}
        <Link href="/browse" className="mt-8 inline-block text-sm font-bold text-[#2864ed]">Back to Browse</Link>
      </main>
      <Footer />
    </div>
  );
}

function RequestList({
  requests,
  empty,
  onDecision,
  busyId,
}: {
  requests: ExchangeRequest[];
  empty: string;
  onDecision?: (id: string, status: "ACCEPTED" | "DECLINED") => void;
  busyId?: string | null;
}) {
  if (!requests.length) {
    return <div className="rounded-xl border border-dashed border-[#cbd6e4] bg-white p-8 text-sm text-[#718198]">{empty}</div>;
  }
  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <article key={request.id} className="rounded-xl border border-[#dce4ee] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/books/${request.listingId}`} className="font-bold text-[#2161ee]">{request.listingTitle}</Link>
              <p className="mt-1 text-sm">Offered: {request.offeredBookTitle} · {request.offeredBookCourse}</p>
              {request.requesterFirstName && <p className="mt-1 text-xs text-[#718198]">From {request.requesterFirstName} {request.requesterLastName ?? ""}</p>}
              {request.conditionPreference && <p className="mt-1 text-xs text-[#718198]">Condition preference: {request.conditionPreference}</p>}
              {request.notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#43536d]">{request.notes}</p>}
              <p className="mt-2 text-[11px] text-[#718198]">Submitted {new Date(request.createdAt).toLocaleString()}{request.listingStatus === "SOLD" ? " · Listing sold" : ""}</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{request.status}</span>
          </div>
          {onDecision && request.status === "PENDING" && request.listingStatus === "ACTIVE" && (
            <div className="mt-3 flex gap-2 border-t border-[#e5eaf1] pt-3">
              <button type="button" disabled={busyId === request.id} onClick={() => onDecision(request.id, "ACCEPTED")} className="rounded-md bg-[#13835c] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Accept</button>
              <button type="button" disabled={busyId === request.id} onClick={() => onDecision(request.id, "DECLINED")} className="rounded-md border border-[#cbd8eb] px-3 py-2 text-xs font-bold text-[#43536d] disabled:opacity-50">Decline</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
