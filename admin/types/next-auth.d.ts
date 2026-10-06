import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN";
    } & Session["user"];
  }

  interface User {
    role: "ADMIN";
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN";
    accessToken?: string;
  }
}
