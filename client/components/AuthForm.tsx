"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ConsentModal } from "@/components/ConsentModal";
import { fetchJson } from "@/lib/api";
import { isVerifiedStudentEmail, verifiedStudentDomainHint } from "@/lib/studentEmail";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [campus, setCampus] = useState("Tshwane University of Technology (TUT)");
  const [faculty, setFaculty] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("Tshwane University of Technology (TUT)");
  const [accepted, setAccepted] = useState(false);
  const [userAgreement, setUserAgreement] = useState(false);
  const [displayContactDetails, setDisplayContactDetails] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!document.cookie.split("; ").some((cookie) => cookie.startsWith("campus_exchange_cookie_consent="))) {
      setMessage("Please choose your cookie preferences before continuing.");
      return;
    }
    if (!accepted || !userAgreement) {
      setMessage("Please review and accept the privacy notice and user agreement before continuing.");
      return;
    }
    if (mode === "register" && ( !firstName || !lastName )) {
      setMessage("Please enter both your first name and surname.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setMessage("Passwords do not match. Please enter the same password twice.");
      return;
    }
    if (!isVerifiedStudentEmail(email)) {
      setMessage(`Use your verified student email (${verifiedStudentDomainHint}).`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await fetchJson(`${apiUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, phone, firstName, lastName, gender, campus, faculty, university, consent: { accepted, version: "1.0", displayContactDetails } }),
        });
      }
      const result = await signIn("credentials", {
        email,
        password,
        consent: String(accepted),
        displayContactDetails: String(displayContactDetails),
        redirect: false,
      });
      if (result?.error) {
        if (result.error.toLowerCase().includes("too many")) {
          throw new Error("Too many failed login attempts. Try again in about 5 minutes.");
        }
        throw new Error("Unable to sign in with those details.");
      }
      router.push("/browse");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {mode === "register" && (
        <>
          <label className="label">University
            <select value={university} onChange={(event) => setUniversity(event.target.value)}>
              <option>Tshwane University of Technology (TUT)</option>
              <option>University of Cape Town (UCT)</option>
              <option>Wits University</option>
              <option>University of Pretoria (UP)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="label">First Name<input required type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="e.g. Thabo" /></label>
            <label className="label">Surname<input required type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="e.g. Mokoena" /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="label">Campus<input required type="text" value={campus} onChange={(event) => setCampus(event.target.value)} placeholder="e.g. Soshanguve" /></label>
            <label className="label">Faculty<input required type="text" value={faculty} onChange={(event) => setFaculty(event.target.value)} placeholder="e.g. Engineering" /></label>
          </div>
          <label className="label">Gender
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </label>
        </>
      )}
      <label className="label">Verified student email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@student.tut.ac.za" aria-describedby="student-email-help" /><span id="student-email-help" className="text-[9px] font-normal text-[#718198]">Use a university-issued address: {verifiedStudentDomainHint}.</span></label>
      {mode === "register" && <label className="label">Phone / WhatsApp (optional)<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+27 72 000 0000" /></label>}
      <label className="label">Password<div className="relative"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#2864ed]">{showPassword ? "Hide" : "Show"}</button></div></label>
      {mode === "register" && <label className="label">Confirm password<div className="relative"><input required minLength={8} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" /><button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#2864ed]">{showConfirmPassword ? "Hide" : "Show"}</button></div></label>}
      <ConsentModal accepted={accepted} userAgreement={userAgreement} displayContactDetails={displayContactDetails} onAcceptedChange={setAccepted} onUserAgreementChange={setUserAgreement} onDisplayContactDetailsChange={setDisplayContactDetails} />
      {message && <p role="alert" className="rounded-lg bg-[#fff0bf] p-3 text-[10px] font-bold text-[#9a5d09]">{message}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#2864ed] px-4 py-3 text-xs font-bold text-white hover:bg-[#174fcf] disabled:opacity-50">{busy ? "Please wait..." : mode === "register" ? "Create student account" : "Sign in to Campus Exchange"}</button>
      <p className="text-center text-[10px] text-[#718198]">{mode === "register" ? "Already have an account?" : "New to Campus Exchange?"} <Link href={mode === "register" ? "/login" : "/register"} className="font-bold text-[#2864ed]">{mode === "register" ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}
