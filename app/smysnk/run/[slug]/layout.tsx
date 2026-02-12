import type { Metadata } from "next";
import { buildRunMetadata } from "@/lib/runPreview";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return buildRunMetadata({
    indicator: "smysnk",
    slug: params.slug,
    path: `/smysnk/run/${params.slug}`
  });
}

export default function SmysnkRunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
