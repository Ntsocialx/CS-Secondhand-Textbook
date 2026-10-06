import Link from "next/link";

const adminLinks = [
  { href: "/", label: "Overview" },
  { href: "/listings", label: "Listing reviews" },
  { href: "/payments", label: "Payment proofs" },
  { href: "/reports", label: "Reports" },
  { href: "/fees", label: "Fee periods" },
  { href: "/analytics", label: "Visitor analytics" },
];

export function AdminNavigation({ active }: { active: string }) {
  return (
    <nav aria-label="Admin control center" className="flex flex-wrap gap-2 border-b border-[#dce4ee] pb-4">
      {adminLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active === item.href ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-xs font-bold ${active === item.href ? "bg-[#142039] text-white" : "bg-white text-[#43536d] hover:bg-[#edf4ff]"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
