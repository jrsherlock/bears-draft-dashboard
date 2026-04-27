import type { Metadata } from "next";
import { Big_Shoulders, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-shoulders",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bears Draft Archive · 1980 → Present",
  description:
    "Every Chicago Bears NFL Draft pick since 1980. Filter, compare, and surface the steals, busts, and Hall of Famers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bigShoulders.variable} ${fraunces.variable} ${mono.variable}`}
    >
      <body className="relative antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
