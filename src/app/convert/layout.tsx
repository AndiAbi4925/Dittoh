import { ConverterSessionProvider } from "@/components/studio/ConverterSessionContext";
import { StepProgressHeader } from "@/components/studio/StepProgressHeader";
import { getPublicAppConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export default async function ConvertLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appConfig = await getPublicAppConfig();

  return (
    <ConverterSessionProvider
      maxImageSizeMb={appConfig.maxImageSizeMb}
      enabledRawFormats={appConfig.enabledRawFormats}
    >
      <div className="min-h-[calc(100vh-140px)] bg-[#ffffff] text-[#000000]">
        <StepProgressHeader />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </div>
      </div>
    </ConverterSessionProvider>
  );
}
