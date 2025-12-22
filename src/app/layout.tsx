import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Baylordle",
    template: "%s · Baylordle",
  },
  description:
    "A daily word connections puzzle for medical folks. Group words, avoid mistakes, and come back every day.",
  metadataBase: new URL("https://baylordle.com"),
  openGraph: {
    title: "Baylordle",
    description:
      "A daily word connections puzzle for medical folks",
    url: "https://baylordle.com",
    siteName: "Baylordle",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Baylordle – Daily Connections Puzzle",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baylordle",
    description:
      "A daily word connections puzzle for medical folks",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
