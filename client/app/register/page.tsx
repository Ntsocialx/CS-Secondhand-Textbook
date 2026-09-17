import Link from "next/link";
import { Logo } from "@/components/MarketplaceChrome";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]"><header className="border-b border-[#e4eaf2] bg-white"><div className="mx-auto flex h-[58px] max-w-[1080px] items-center justify-between px-5"><Logo /><Link href="/" className="text-[10px] text-[#718198]">← Back to marketplace</Link></div></header><main className="flex flex-1 items-center justify-center px-5 py-10"><section className="w-full max-w-[430px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm"><div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1fbf7] text-xl text-[#12b6aa]">C</span><h1 className="mt-4 text-2xl font-extrabold">Create your account</h1>  <p className="mt-2 text-[11px] text-[#718198]">Join TUT students meeting up safely to sell and buy books for South African Rand.</p></div><AuthForm mode="register" /><p className="mt-5 text-center text-[9px] leading-4 text-[#91a0b3]">Your contact details are private by default. You choose if verified buyers can see them.</p></section></main></div>;
}
