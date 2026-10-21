import type { Metadata } from "next";
import { Big_Shoulders, Onest } from "next/font/google";
import { HtmlLang } from "@/i18n/locale";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin", "latin-ext"],
  weight: ["800", "900"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext"],
});

const description =
  "Pocket Aces — drużyna siatkarska. Skład, mecze, turniej Pocket Aces Cup i kabinet zawodnika.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "Pocket Aces — drużyna siatkarska", template: "%s · Pocket Aces" },
  description,
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Pocket Aces",
    title: "Pocket Aces",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${bigShoulders.variable} ${onest.variable} antialiased`}
    >
      <body className="bg-ice text-ink font-sans">
        <HtmlLang />
        {children}
      </body>
    </html>
  );
}
