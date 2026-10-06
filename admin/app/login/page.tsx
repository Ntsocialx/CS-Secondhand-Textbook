import { AdminLoginForm } from "@/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-[420px] rounded-2xl border border-[#dce4ee] bg-white p-7 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2864ed]">Campus Exchange · Private portal</p>
        <h1 className="mt-3 text-2xl font-extrabold">Admin login</h1>
        <p className="mt-2 text-sm leading-6 text-[#718198]">Sign in with an existing account that has been granted the ADMIN role. Student marketplace accounts cannot access this portal.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
