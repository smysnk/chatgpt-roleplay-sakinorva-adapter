import HomePage from "@/app/components/HomePage";

export default function RunModalPage({ params }: { params: { slug: string } }) {
  return <HomePage initialSlug={params.slug} />;
}
