"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/MarketplaceChrome";
import { fetchJson } from "@/lib/api";
import { isVerifiedStudentEmail, verifiedStudentDomainHint } from "@/lib/studentEmail";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!isVerifiedStudentEmail(email)) {
      setError(`Enter a valid university-issued email (${verifiedStudentDomainHint}).`);
      return;
    }
    setBusy(true);
    try {
      const result = await fetchJson<{ message: string }>("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Password reset is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <header className="border-b border-[#e4eaf2] bg-white"><div className="mx-auto flex h-[58px] max-w-[1080px] items-center justify-between px-5"><Logo /><Link href="/login" className="text-[10px] text-[#718198]">← Back to sign in</Link></div></header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-[420px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Account recovery</p>
          <h1 className="mt-3 text-2xl font-extrabold">Forgot your password?</h1>
          <p className="mt-2 text-xs leading-5 text-[#718198]">Enter your student email. If an account exists, we’ll send a time-limited reset link.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="label">Verified student email
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@student.tut.ac.za" />
            </label>
            {error && <p role="alert" className="rounded-lg bg-[#fff0bf] p-3 text-xs font-bold text-[#895200]">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-[#e2f7ed] p-3 text-xs leading-5 text-[#137b53]">{message}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Sending..." : "Send reset link"}</button>
          </form>
        </section>
      </main>
    </div>
  );
}
