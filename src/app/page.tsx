import { LandingStudioShell } from "@/components/LandingStudioShell";
import { getPublicAppConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const appConfig = await getPublicAppConfig();
  return (
    <LandingStudioShell
      maxImageSizeMb={appConfig.maxImageSizeMb}
      enabledRawFormats={appConfig.enabledRawFormats}
    />
  );
}
