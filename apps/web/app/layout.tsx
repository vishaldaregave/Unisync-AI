import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "UniSync AI — Academic Coordination",
  description:
    "Intelligent academic coordination and personalized student support, with a human on every decision.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
