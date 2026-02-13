import type { Metadata } from "next";
import { buildRunMetadata } from "@/lib/runPreview";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return buildRunMetadata({
    indicator: "smysnk3",
    slug: params.slug,
    path: `/smysnk3/run/${params.slug}`
  });
}

export default function Smysnk3RunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
