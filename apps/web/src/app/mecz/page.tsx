import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { MatchCenter } from "@/components/match/MatchCenter";

export const metadata: Metadata = {
  title: "Najbliższy mecz",
  description: "Najbliższy mecz Pocket Aces w II A lidze: rywal, godzina, sektor, wynik i skład na boisku.",
};

export default function MatchPage() {
  return (
    <>
      <MatchCenter />
      <Footer />
    </>
  );
}
