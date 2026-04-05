import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Night Eye | Operational Intelligence for Hotels",
  description:
    "Turn incident data into actionable intelligence. Real-time dashboards, room intelligence maps, and executive briefings for hotel operations teams.",
  keywords: [
    "hotel operations",
    "incident management",
    "operational intelligence",
    "resort management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
