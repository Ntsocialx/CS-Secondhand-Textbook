import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { adminCookieOptions, adminSessionCookieName } from "@/lib/auth-cookies";

const apiUrl = process.env.API_URL;
const cookiePrefix = process.env.NODE_ENV === "production" ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  cookies: {
    // Separate ports on localhost share cookies, so admin auth uses its own cookie namespace.
    sessionToken: { name: adminSessionCookieName, options: adminCookieOptions },
    callbackUrl: { name: `${cookiePrefix}campus-exchange-admin.callback-url`, options: adminCookieOptions },
    csrfToken: { name: `${cookiePrefix}campus-exchange-admin.csrf-token`, options: adminCookieOptions },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Admin email", type: "email" },
        password: { label: "Password", type: "password" },
        consent: { label: "Consent", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        if (!apiUrl) throw new Error("The admin authentication service is not configured.");

        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            consent: {
              accepted: credentials.consent === "true",
              version: "1.0",
              displayContactDetails: false,
            },
          }),
          cache: "no-store",
        });

        if (!response.ok) return null;
        const payload = await response.json();
        if (payload.user?.role !== "ADMIN" || !payload.accessToken) {
          throw new Error("Admin access is required for this portal.");
        }
        return {
          id: String(payload.user.id),
          email: payload.user.email,
          name: [payload.user.firstName, payload.user.lastName].filter(Boolean).join(" "),
          role: "ADMIN" as const,
          accessToken: payload.accessToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.role === "ADMIN") session.user.role = "ADMIN";
      }
      return session;
    },
  },
};

export const authHandler = NextAuth(authOptions);
