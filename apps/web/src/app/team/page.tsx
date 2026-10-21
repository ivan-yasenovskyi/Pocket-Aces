import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { TeamGrid } from "@/components/TeamGrid";

export const metadata: Metadata = {
  title: "Drużyna",
  description: "Cały skład drużyny siatkarskiej Pocket Aces.",
};

export default function TeamPage() {
  return (
    <>
      <TeamGrid />
      <Footer />
    </>
  );
}
