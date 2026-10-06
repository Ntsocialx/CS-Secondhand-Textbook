import { redirect } from "next/navigation";

const adminAppUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:3001";
const legacyPaths: Record<string, string> = {
  listings: "/listings",
  reports: "/reports",
  fees: "/fees",
  analytics: "/analytics",
};

export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ adminPath?: string[] }>;
}) {
  const { adminPath = [] } = await params;
  const destination = adminPath.length === 0 ? "/" : legacyPaths[adminPath[0]] ?? "/";
  redirect(new URL(destination, adminAppUrl).toString());
}
