import type { Metadata } from "next";
import { Manrope, Poppins } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PublicClarity } from "./components/PublicClarity";

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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId =
    process.env.NEXT_PUBLIC_PRIMESTYLE_CLARITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ||
    "wwb75cfm2z";

  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${poppins.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="lazyOnload"
            />
            <Script id="ga-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
        <PublicClarity projectId={clarityId} />
        {children}
      </body>
    </html>
  );
}
