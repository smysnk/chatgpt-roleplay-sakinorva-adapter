import type { Metadata } from "next";
import IndicatorIndex from "@/app/components/IndicatorIndex";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Jungian Cognitive Function Tests",
  description:
    "Take and compare Sakinorva, SMYSNK, SMYSNK2, and SMYSNK3 Jungian cognitive function assessments, then review and share stack-based results.",
  alternates: {
    canonical: `${siteUrl}/`
  },
  openGraph: {
    title: "Jungian Cognitive Function Tests",
    description:
      "Take and compare Jungian cognitive function assessments and share stack-based results pages.",
    type: "website",
    url: `${siteUrl}/`
  },
  twitter: {
    card: "summary",
    title: "Jungian Cognitive Function Tests",
    description:
      "Compare Jungian cognitive function tests and share interpretable stack-based results."
  }
};

export default function LandingPage() {
  return (
    <IndicatorIndex
      title="Indicators"
      description="Combined view of all indicator runs."
      mode="combined"
    />
  );
}
