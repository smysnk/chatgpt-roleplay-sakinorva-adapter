"use client";

import { useParams } from "next/navigation";
import HomeView from "@/app/components/HomeView";

export default function RunModalPage() {
  const params = useParams<{ slug: string }>();
  return <HomeView modalSlug={params?.slug} />;
}
