import type { Metadata } from "next";
import { buildRunMetadata } from "@/lib/runPreview";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return buildRunMetadata({
    indicator: "smysnk2",
    slug: params.slug,
    path: `/smysnk2/run/${params.slug}`
  });
}

export default function Smysnk2RunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
