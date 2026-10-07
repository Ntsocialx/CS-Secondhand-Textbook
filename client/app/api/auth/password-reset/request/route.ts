import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/serverApiUrl";

export async function POST(request: Request) {
  const apiUrl = getServerApiUrl();
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const body: unknown = await request.json();
    const response = await fetch(`${apiUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: "Password reset is temporarily unavailable. Please try again later." };
    return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
