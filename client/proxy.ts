import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token }) {
      return Boolean(token);
    },
  },
});

export const config = {
  matcher: [
    "/browse/:path*",
    "/sell/:path*",
    "/listings/:path*",
    "/books/:path*",
    "/seller/:path*",
    "/report/:path*",
  ],
};
