import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentScan AI",
  description: "AI-powered resume screening and candidate discovery"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
