import { withAuth } from "next-auth/middleware";
import { adminSessionCookieName } from "@/lib/auth-cookies";

export default withAuth({
  pages: { signIn: "/login" },
  cookies: { sessionToken: { name: adminSessionCookieName } },
  callbacks: {
    authorized({ token }) {
      return token?.role === "ADMIN";
    },
  },
});

export const config = {
  matcher: ["/", "/analytics/:path*", "/fees/:path*", "/listings/:path*", "/payments/:path*", "/reports/:path*"],
};
