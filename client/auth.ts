import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const authProxyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/login`;

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
        const response = await fetch(authProxyUrl, {
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
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Too many failed login attempts. Try again in about 5 minutes.");
          }
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
