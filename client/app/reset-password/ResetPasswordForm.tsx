"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/api";

export function ResetPasswordForm() {
  const tokenRef = useRef("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get("token") ?? "";
    tokenRef.current = resetToken;
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!tokenRef.current) {
      setError("This reset link is invalid or expired. Request a new link.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Choose a password between 8 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await fetchJson<{ message: string }>("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, password }),
      });
      setMessage(result.message);
      tokenRef.current = "";
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-[420px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Account recovery</p>
      <h1 className="mt-3 text-2xl font-extrabold">Choose a new password</h1>
      <p className="mt-2 text-xs leading-5 text-[#718198]">Reset links expire after 30 minutes and can be used once.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="label">New password
          <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        </label>
        <label className="label">Confirm new password
          <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-[#fff0bf] p-3 text-xs font-bold text-[#895200]">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-[#e2f7ed] p-3 text-xs leading-5 text-[#137b53]">{message}</p>}
        {message ? <Link href="/login" className="block text-center text-xs font-bold text-[#2864ed]">Return to sign in</Link> : <button disabled={busy} className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Updating..." : "Update password"}</button>}
      </form>
    </section>
  );
}
