import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { MatchesSection } from "@/components/MatchesSection";
import { RosterFan } from "@/components/RosterFan";
import { TournamentSection } from "@/components/TournamentSection";

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <RosterFan />
        <MatchesSection />
        <TournamentSection />
      </main>
      <Footer />
    </>
  );
}
