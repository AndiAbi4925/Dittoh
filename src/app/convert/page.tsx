import type { Metadata } from "next";
import { StepPhotoView } from "@/components/studio/ConvertStepViews";

export const metadata: Metadata = {
  title: "Step 1: Choose Photo",
  description: "Pick an image from your device or start with a sample photo.",
};

interface ConvertPageProps {
  searchParams: Promise<{ sample?: string }>;
}

export default async function ConvertPage({ searchParams }: ConvertPageProps) {
  const params = await searchParams;
  return <StepPhotoView initialSample={params.sample} />;
}
