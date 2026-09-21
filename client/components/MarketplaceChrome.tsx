"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-[18px] font-extrabold tracking-tight text-[#142039]" aria-label="Campus Exchange home">
      <Image
        src="/campus-exchange-logo.jpg"
        alt="Campus Exchange"
        width={120}
        height={60}
        className="h-12 w-auto object-contain"
        priority
      />
      <span className="hidden md:block font-black text-2xl">Campus Exchange</span>
    </Link>
  );
}

export function Header({ active = "Home" }: { active?: string }) {
  const { data: session } = useSession();

  return (
    <header className="border-b border-[#e4eaf2] bg-white sticky top-0 z-50">
      <div className="mx-auto flex h-[64px] max-w-[1080px] items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-[11px] font-medium text-[#64748b] lg:flex">
          {["Home", "Browse", "Sell", "My Listings"].map((item) => (
            <Link
              key={item}
              href={item === "Home" ? "/" : item === "Browse" ? "/browse" : item === "Sell" ? "/sell" : "/listings"}
              className={`relative py-4 transition-colors hover:text-[#2161ee] ${active === item ? "font-bold text-[#2161ee] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#2161ee]" : ""}`}
            >
              {item}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-[#64748b]">
          {session?.user?.firstName ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[10px] font-bold text-[#142039]">Welcome back, {session.user.firstName}!</span>
              <Link href="/profile" className="text-[10px] font-bold text-[#2864ed] hover:underline">Edit Profile</Link>
            </div>
          ) : (
            <Link href="/login" className="hidden text-[10px] font-bold text-[#2864ed] sm:block">Sign in</Link>
          )}
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e5eaf2] text-xs">♧</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b88956] text-[10px] font-bold text-white">
            {session?.user?.firstName ? session.user.firstName[0].toUpperCase() : "T"}
          </span>
          <span className="text-[10px]">⌄</span>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="mt-auto border-t border-[#e5eaf2] bg-white"><div className="mx-auto flex max-w-[1080px] flex-wrap justify-between gap-10 px-5 py-10 text-[10px] text-[#64748b]"><div><Logo /><p className="mt-3 max-w-[290px] leading-4">Copyright © 2026. All rights reserved. Buy and sell secondhand textbooks directly on your campus.</p></div><div className="grid grid-cols-3 gap-10"><div><b className="text-[#142039]">Company</b><p className="mt-3 space-y-2">Blog<br />Community</p></div><div><b className="text-[#142039]">Product</b><p className="mt-3 space-y-2">Browse<br />Sell</p></div><div><b className="text-[#142039]">Resources</b><p className="mt-3 space-y-2">Safety Guidelines<br />Support</p></div></div></div></footer>;
}

export function BookCover({ book, large = false }: { book: { shortTitle: string; color: string; accent: string; image?: string }; large?: boolean }) {
  return (
    <div className={`relative flex ${large ? "h-full min-h-[460px]" : "h-full min-h-[155px]"} items-center justify-center overflow-hidden bg-gradient-to-br ${book.color} p-4 text-center text-white`}>
      {book.image ? (
        <Image src={book.image} alt={`${book.shortTitle} textbook cover`} fill sizes={large ? "(max-width: 1024px) 100vw, 365px" : "231px"} className="object-cover" />
      ) : (
        <>
          <Image
            src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=400&auto=format&fit=crop"
            alt="Textbook placeholder"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `linear-gradient(135deg, transparent 45%, ${book.accent} 46%, transparent 48%), linear-gradient(25deg, transparent 65%, ${book.accent} 66%, transparent 68%)` }} />
          <div className="relative">
            <p className={`${large ? "text-5xl" : "text-2xl"} font-black leading-none tracking-tight`}>{book.shortTitle}</p>
            <p className="mt-2 text-[8px] uppercase tracking-[0.2em] opacity-80">Principles and practice</p>
          </div>
        </>
      )}
    </div>
  );
}

export function BookCard({ book }: { book: import("@/lib/marketplace").Book }) {
  return <Link href={`/books/${book.id}`} className="overflow-hidden rounded-xl border border-[#dce4ef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative h-[155px]"><BookCover book={book} /><span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-[#73839b]">♡</span></div><div className="border-t border-[#e5eaf1] p-3"><div className="flex items-center justify-between"><span className="rounded bg-[#edf4ff] px-1.5 py-1 text-[9px] font-bold text-[#2463ed]">{book.course}</span><span className="rounded border border-[#e2e8f0] px-1.5 py-1 text-[9px] text-[#65758b]">{book.condition}</span></div><h3 className="mt-2 min-h-[30px] text-[12px] font-bold leading-4 text-[#172139]">{book.title}</h3><p className="mt-2 text-[10px] text-[#718198]">⌖ {book.campus}</p></div><div className="flex items-center justify-between border-t border-[#e5eaf1] px-3 py-3"><b className="text-sm">R {book.price}</b><span className="rounded bg-[#e2f7ed] px-2 py-1 text-[9px] font-bold text-[#13a66d]">● Available</span></div></Link>;
}
