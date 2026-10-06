const secureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = secureCookies ? "__Secure-" : "";

export const adminSessionCookieName = `${cookiePrefix}campus-exchange-admin.session-token`;

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: secureCookies,
};
