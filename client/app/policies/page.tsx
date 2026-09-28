import Link from "next/link";
import { Footer, Header } from "@/components/MarketplaceChrome";

const rules = [
  ["Genuine books only", "List a physical book that you lawfully own and may transfer. Photocopied, pirated, counterfeit, stolen, or otherwise unauthorized copies are not allowed."],
  ["Accurate descriptions", "Use a clear title and describe the edition, condition, marks, price or requested exchange, and campus honestly. Upload photos of the actual book where possible."],
  ["Books only; no abuse", "Do not list unrelated items, misleading offers, scams, harassment, discriminatory content, or another person's private information."],
  ["Student-to-student arrangements", "The R5 listing fee is paid by manual transfer outside Campus Exchange. Buyers and sellers arrange any sale or exchange directly; the platform does not collect book payments, guarantee a transaction, or provide delivery."],
  ["Review and reports", "Payment must be checked and the listing approved before it appears in Browse. Listings may be rejected or removed under these rules. Use the report flow to flag a concern."],
  ["Safe meetups", "Arrange an in-person exchange in a public on-campus place during daylight, tell someone where you are going, and inspect the book before completing the exchange."],
];

export default function MarketplacePoliciesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#142039]">
      <Header />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10">
        <Link href="/sell" className="text-xs font-bold text-[#2161ee]">← Back to listing form</Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Version 2026-09</p>
        <h1 className="mt-2 text-3xl font-extrabold">Marketplace rules and review policy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#60728d]">These product rules guide listings and moderation. They are not legal advice and do not guarantee legal compliance or prevent disputes. The final terms, fee/refund handling, privacy and retention language need review by the marketplace owner and a qualified South African legal professional before launch.</p>
        <section className="mt-8 grid gap-4">
          {rules.map(([title, copy], index) => (
            <article key={title} className="rounded-xl border border-[#dce4ee] bg-white p-5">
              <h2 className="font-bold">{index + 1}. {title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#60728d]">{copy}</p>
            </article>
          ))}
        </section>
        <section className="mt-7 rounded-xl bg-[#edf4ff] p-5">
          <h2 className="font-bold">Fee, duration, and review steps</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#43536d]">
            <li>R5 is charged per book listing for one 30-day period, whether offered for sale or exchange.</li>
            <li>Transfer the fee using the receiving account instructions shown in the signed-in listing flow. Do not send bank passwords, PINs, or card details.</li>
            <li>Upload proof of payment. Redact unrelated transactions or balances while keeping the amount, recipient, payment date, and reference readable.</li>
            <li>An admin separately verifies payment and reviews the book against these rules. The listing stays private until both decisions are approved.</li>
            <li>If payment proof or content is rejected, the owner can see a reason and take the requested action. Renewals require a new R5 transfer and proof for another 30 days.</li>
          </ol>
        </section>
        <p className="mt-6 text-xs leading-5 text-[#718198]">Meeting safety, book sales, and exchanges are arranged between students. Report suspected unlawful or unsafe listings using the report link on a listing. Campus Exchange may review reports and take action consistent with these rules.</p>
        <Link href="/sell" className="mt-7 inline-flex rounded-lg bg-[#2864ed] px-5 py-3 text-xs font-bold text-white">Continue to list a book</Link>
      </main>
      <Footer />
    </div>
  );
}
