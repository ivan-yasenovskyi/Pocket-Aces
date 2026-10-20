import type { Metadata } from "next";
import { Big_Shoulders, Onest } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin", "latin-ext"],
  weight: ["800", "900"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Pocket Aces",
  description: "Volleyball team Pocket Aces",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${bigShoulders.variable} ${onest.variable} antialiased`}
    >
      <body className="bg-ice text-ink font-sans">
        <Header />
        {children}
      </body>
    </html>
  );
}
