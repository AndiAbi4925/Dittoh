import type { Metadata } from "next";
import { StepStyleView } from "@/components/studio/ConvertStepViews";

export const metadata: Metadata = {
  title: "Step 3: Style",
  description: "Adjust character style, detail, and colors with live preview.",
};

export default function ConvertStylePage() {
  return <StepStyleView />;
}
