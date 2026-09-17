import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL ?? "http://localhost:5000";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
}
