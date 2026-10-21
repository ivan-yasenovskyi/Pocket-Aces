import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Panel kapitana",
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
