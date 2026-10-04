import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import "./tokens.css";
import "./ryff.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "RYFF – Guitar Assistant & News Intelligence",
  description: "Reads the guitar world for you, knows your gear, and gives you a second opinion.",
  icons: {
    icon: "/ryff_pick.jpg",
    shortcut: "/ryff_pick.jpg",
    apple: "/ryff_pick.jpg",
  },
  openGraph: {
    title: "RYFF – Guitar Assistant & News Intelligence",
    description: "Reads the guitar world for you, knows your gear, and gives you a second opinion.",
    images: [{ url: "/ryff_main.jpg", width: 1200, height: 630, alt: "RYFF Branding Banner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RYFF – Guitar Assistant & News Intelligence",
    description: "Reads the guitar world for you, knows your gear, and gives you a second opinion.",
    images: ["/ryff_main.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="h-full bg-[#0d0d0d] text-white">
        {children}
      </body>
    </html>
  );
}
