import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "STUDENT" | "ADMIN";
      accessToken?: string;
    } & Session["user"];
  }

  interface User {
    role: "STUDENT" | "ADMIN";
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "STUDENT" | "ADMIN";
    accessToken?: string;
  }
}
