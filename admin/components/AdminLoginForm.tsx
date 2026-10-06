"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:3000";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!accepted) {
      setError("Please confirm the privacy notice before signing in.");
      return;
    }
    setBusy(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        consent: "true",
        redirect: false,
      });
      if (result?.error) {
        setError("Sign-in failed. Check your credentials and confirm this account has admin access.");
        return;
      }
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") ?? "/";
      router.replace(callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/");
    } catch {
      setError("The admin sign-in service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="label">Admin email
        <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@student.tut.ac.za" />
      </label>
      <label className="label">Password
        <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-[#43536d]">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1" />
        <span>I have read the privacy notice and agree that my sign-in records the required consent.</span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-[#fff0bf] p-3 text-xs font-bold text-[#895200]">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Signing in..." : "Sign in to admin"}
      </button>
      <Link href={new URL("/login", marketplaceUrl).toString()} className="block text-center text-xs font-bold text-[#2864ed]">
        Student/client login
      </Link>
      <Link href={new URL("/forgot-password", marketplaceUrl).toString()} className="block text-center text-xs text-[#718198] hover:underline">
        Forgot your password?
      </Link>
    </form>
  );
}
