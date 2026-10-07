import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const serviceUnavailableError = "SERVICE_UNAVAILABLE";
const configuredAuthBaseUrl = process.env.NEXTAUTH_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
// Production never falls back to localhost; local development keeps its default.
const authBaseUrl = configuredAuthBaseUrl
  ?? (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
const authProxyUrl = authBaseUrl ? new URL("/api/auth/login", authBaseUrl).toString() : null;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Student email", type: "email" },
        password: { label: "Password", type: "password" },
        consent: { label: "Consent", type: "text" },
        displayContactDetails: { label: "Display contact details", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        if (!authProxyUrl) throw new Error(serviceUnavailableError);
        let response: Response;
        try {
          response = await fetch(authProxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              consent: {
                accepted: credentials.consent === "true",
                version: "1.0",
                displayContactDetails: credentials.displayContactDetails === "true",
              },
            }),
          });
        } catch {
          throw new Error(serviceUnavailableError);
        }
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Too many failed login attempts. Try again in about 5 minutes.");
          }
          if (response.status >= 500) throw new Error(serviceUnavailableError);
          return null;
        }
        const payload = await response.json();
        return { ...payload.user, accessToken: payload.accessToken };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
};

export const authHandler = NextAuth(authOptions);
