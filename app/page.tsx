import type { Metadata } from "next";
import IndicatorIndex from "@/app/components/IndicatorIndex";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Cognitive Function Test Adapter",
  description:
    "Run and compare Sakinorva, SMYSNK, and SMYSNK2 cognitive-function assessments, save results, and share run links with MBTI-style stack visualizations.",
  alternates: {
    canonical: `${siteUrl}/`
  },
  openGraph: {
    title: "Cognitive Function Test Adapter",
    description:
      "Run and compare Sakinorva, SMYSNK, and SMYSNK2 assessments, then save and share interpretable cognitive-function results.",
    type: "website",
    url: `${siteUrl}/`
  },
  twitter: {
    card: "summary",
    title: "Cognitive Function Test Adapter",
    description:
      "Run and compare Sakinorva, SMYSNK, and SMYSNK2 assessments with shareable cognitive-function result pages."
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
