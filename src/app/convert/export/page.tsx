import type { Metadata } from "next";
import { StepExportView } from "@/components/studio/ConvertStepViews";

export const metadata: Metadata = {
  title: "Step 4: Save & Copy",
  description: "Copy ASCII text or download PNG, TXT, Markdown, SVG, or HTML.",
};

export default function ConvertExportPage() {
  return <StepExportView />;
}
