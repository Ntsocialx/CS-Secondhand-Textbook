"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/MarketplaceChrome";
import { fetchJson, withBearer } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    phone: "",
    campus: "",
    faculty: "",
  });

  useEffect(() => {
    if (!session?.user.accessToken) return;
    fetchJson<{ user: any }>(`${apiUrl}/api/users/me`, withBearer(session.user.accessToken))
      .then((payload) => {
        const u = payload.user;
        setForm({
          firstName: u.first_name || "",
          lastName: u.last_name || "",
          gender: u.gender || "",
          phone: u.phone || "",
          campus: u.campus || "",
          faculty: u.faculty || "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load profile."))
      .finally(() => setLoading(false));
  }, [session?.user.accessToken]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.user.accessToken) return;
    setBusy(true);
    setError("");
    try {
      await fetchJson(`${apiUrl}/api/users/me`, withBearer(session.user.accessToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          phone: form.phone,
          campus: form.campus,
          faculty: form.faculty,
        }),
      }));
      alert("Profile updated successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update profile.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-xs text-[#718198]">Loading profile...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header active="Profile" />
      <main className="flex-1 px-5 py-14">
        <form onSubmit={submit} className="mx-auto max-w-[540px] rounded-xl border border-[#dce4ee] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold">Your Profile</h1>
          <p className="mt-1 text-[10px] text-[#718198]">Keep your campus and contact details up to date for better exchanges.</p>
          <hr className="my-5 border-[#e1e7ef]" />

          <div className="grid grid-cols-2 gap-4">
            <label className="label">First Name<input required type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
            <label className="label">Surname<input required type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          </div>

          <label className="label">Gender
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="label">Campus<input required type="text" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} /></label>
            <label className="label">Faculty<input required type="text" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} /></label>
          </div>

          <label className="label">Phone / WhatsApp<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>

          {error && <p className="mt-4 text-[10px] font-bold text-[#e45757]">{error}</p>}

          <div className="mt-5 flex justify-end gap-3 border-t pt-5">
            <button type="button" onClick={() => router.back()} className="rounded-md border px-4 py-2 text-[10px]">Cancel</button>
            <button disabled={busy} className="rounded-md bg-[#2864ed] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
