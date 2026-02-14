import type { Metadata } from "next";
import ShareStartClient from "@/app/share/start/ShareStartClient";

export const metadata: Metadata = {
  title: "Start Shared Test",
  description: "Preparing your shared Jungian cognitive function test run.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ShareStartPage() {
  return <ShareStartClient />;
}
