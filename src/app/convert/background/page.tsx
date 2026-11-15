import type { Metadata } from "next";
import { StepBackgroundView } from "@/components/studio/ConvertStepViews";

export const metadata: Metadata = {
  title: "Step 2: Background",
  description: "Optionally remove the background and choose a background fill color.",
};

export default function ConvertBackgroundPage() {
  return <StepBackgroundView />;
}
