import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GATE FORCE — DA 2027",
  description: "Gamified GATE Data Science & AI exam prep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
