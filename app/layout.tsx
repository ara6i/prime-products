import type { Metadata } from "next";
import { Manrope, Poppins } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/app/shared/components/Providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrimeStyle AI",
  description: "Virtual Try-On powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Apple Sign In JS SDK */}
        <script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          defer
        />
      </head>
      <body
        className={`${manrope.variable} ${poppins.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PEJTT3E11V"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PEJTT3E11V');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
