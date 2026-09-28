import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/MarketplaceChrome";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <header className="border-b border-[#e4eaf2] bg-white"><div className="mx-auto flex h-[58px] max-w-[1080px] items-center justify-between px-5"><Logo /><Link href="/login" className="text-[10px] text-[#718198]">← Back to sign in</Link></div></header>
      <main className="flex flex-1 items-center justify-center px-5 py-12"><ResetPasswordForm /></main>
    </div>
  );
}
