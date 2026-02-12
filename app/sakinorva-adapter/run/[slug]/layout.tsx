import type { Metadata } from "next";
import { buildRunMetadata } from "@/lib/runPreview";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return buildRunMetadata({
    indicator: "sakinorva",
    slug: params.slug,
    path: `/sakinorva-adapter/run/${params.slug}`
  });
}

export default function SakinorvaRunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
