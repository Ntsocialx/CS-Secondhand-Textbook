import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/SessionProvider";
import { CookieConsent } from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campus Exchange | TUT Books",
  description: "A verified TUT marketplace for buying and selling secondhand textbooks in South African Rand",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
            <a id="skip-main" href="#main" className="skip-link">Skip to main content</a>
            <AuthSessionProvider>{children}<CookieConsent /></AuthSessionProvider>
            <script dangerouslySetInnerHTML={{__html: `document.addEventListener('click', function (e) { if (e.target && (e.target.id === 'skip-main' || e.target.closest && e.target.closest('#skip-main'))) { e.preventDefault(); var m = document.querySelector('main'); if (m) { m.setAttribute('tabindex', '-1'); m.focus(); } } }, {capture: true});`}} />
          </body>
    </html>
  );
}
