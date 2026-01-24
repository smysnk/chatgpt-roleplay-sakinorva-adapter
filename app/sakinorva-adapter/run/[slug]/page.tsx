import HomePage from "@/app/components/HomePage";

export default function SakinorvaRunPage({ params }: { params: { slug: string } }) {
  return <HomePage initialSlug={params.slug} />;
}
