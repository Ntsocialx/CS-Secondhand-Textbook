"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Sell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", courseCode: "", price: "", condition: "Like New", description: "", campus: "Tshwane University of Technology (TUT)" });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image up to 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setMessage("Unable to read that image.");
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.accessToken) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = await fetchJson<{ listing: { id: string } }>(`${apiUrl}/api/listings`, withBearer(session.user.accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), imageUrl }),
      }));
      router.push(`/books/${payload.listing.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish the listing.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><Header active="Sell" /><main className="flex-1 px-5 py-9"><form onSubmit={submit} className="mx-auto max-w-[540px] rounded-xl border border-[#dce4ee] bg-white p-6 shadow-sm"><h1 className="text-xl font-extrabold">List Your Textbook</h1><p className="mt-1 text-[10px] text-[#718198]">Fill in the details below to publish your secondhand book on the campus marketplace.</p><hr className="my-5 border-[#e1e7ef]" /><label className="label">Textbook Photos<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="mt-2 w-full rounded-lg border border-dashed border-[#2864ed] bg-[#f8fbff] p-5 text-[9px] text-[#718198]" />{imageUrl && <img src={imageUrl} alt="Selected textbook preview" className="mt-2 h-24 w-20 rounded object-cover" />}</label><label className="label">Book Title<input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Introduction to Algorithms" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="label">Course Code<input required value={form.courseCode} onChange={(event) => update("courseCode", event.target.value)} placeholder="e.g. CSC202" /></label><label className="label">Price (Rand)<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="R 0.00" /></label></div><label className="label">Campus<select value={form.campus} onChange={(event) => update("campus", event.target.value)}><option>Tshwane University of Technology (TUT)</option><option>University of Cape Town (UCT)</option><option>Wits University</option><option>Stellenbosch University</option><option>University of Pretoria (UP)</option></select></label><label className="label">Description<textarea required rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Mention textbook state, highlighting, annotations, edition details or campus meeting preferences..." /></label><label className="label">Condition<select value={form.condition} onChange={(event) => update("condition", event.target.value)}><option>Like New</option><option>Good</option><option>Acceptable</option><option>Worn</option></select></label>{message && <p role="alert" className="mt-4 rounded-lg bg-[#fff0bf] p-3 text-[10px] font-bold text-[#9a5d09]">{message}</p>}<div className="mt-5 flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => router.back()} className="rounded-md border px-4 py-2 text-[10px]">Cancel</button><button disabled={busy} className="rounded-md bg-[#2864ed] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">{busy ? "Publishing..." : "Publish Listing"}</button></div></form></main><Footer /></div>;
}
