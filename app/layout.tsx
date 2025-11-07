import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LATINA - AI Powered Image Enhancer",
  description: "AI Powered Image Enhancer for Interior Design",
  icons: {
    icon: "/LATINABLUE.png",
    shortcut: "/LATINABLUE.png",
    apple: "/LATINABLUE.png",
  },
  openGraph: {
    title: "LATINA - AI Powered Image Enhancer",
    description: "AI Powered Image Enhancer for Interior Design",
    images: [
      {
        url: "/LATINABLUE.png",
        width: 1200,
        height: 630,
        alt: "LATINA AI Image Enhancer",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
