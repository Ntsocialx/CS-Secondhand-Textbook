import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookieName } from "@/lib/auth-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethods = new Set(["GET", "POST", "PATCH"]);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!allowedMethods.has(request.method)) {
    return NextResponse.json({ error: "This admin API operation is not supported." }, { status: 405 });
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: adminSessionCookieName,
  });
  if (token?.role !== "ADMIN" || typeof token.accessToken !== "string") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const { path } = await context.params;
  if (!path.length || path.some((part) => !part || part === "." || part === ".." || part.includes("/"))) {
    return NextResponse.json({ error: "Invalid admin API path." }, { status: 400 });
  }
  const apiPath = path.join("/");
  if (!(apiPath.startsWith("admin/") || apiPath === "analytics/summary")) {
    return NextResponse.json({ error: "This admin API operation is not allowed." }, { status: 403 });
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: "The admin API is not configured." }, { status: 503 });
  }

  try {
    const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, apiUrl);
    const headers = new Headers({ Authorization: `Bearer ${token.accessToken}` });
    const contentType = request.headers.get("content-type");
    if (contentType && request.method !== "GET") headers.set("Content-Type", contentType);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("Content-Type", upstreamType);
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) responseHeaders.set("Retry-After", retryAfter);
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    console.error("Admin API proxy request failed.");
    return NextResponse.json({ error: "The admin API is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
