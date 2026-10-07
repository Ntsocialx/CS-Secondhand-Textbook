import { NextResponse } from "next/server";
import { getServerApiUrl } from "@/lib/serverApiUrl";

const unavailableMessage = "The authentication service is unavailable. Please try again shortly.";

export async function POST(request: Request) {
  const apiUrl = getServerApiUrl();
  if (!apiUrl) {
    return NextResponse.json({ error: "The authentication service is not configured." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: "The authentication service returned an invalid response." };
    return NextResponse.json(payload, {
      status: response.status,
      headers: response.status === 429 && response.headers.get("retry-after")
        ? { "Retry-After": response.headers.get("retry-after") as string }
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }
}
