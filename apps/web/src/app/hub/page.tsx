import type { Metadata } from "next";
import { HubView } from "@/components/hub/HubView";

export const metadata: Metadata = {
  title: "Kabinet zawodnika · Pocket Aces",
};

export default function HubPage() {
  return <HubView />;
}
