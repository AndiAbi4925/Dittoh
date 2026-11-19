import type { Metadata } from "next";
import Script from "next/script";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dotgothic16/400.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import { MotionProvider } from "@/components/MotionProvider";
import { PageScrollChrome } from "@/components/PageScrollChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getPublicEnv } from "@/lib/env";
import { getContactEmail } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicEnv().NEXT_PUBLIC_APP_URL),
  title: {
    default: "Dottoh | Photo to ASCII Art",
    template: "%s | Dottoh",
  },
  description:
    "Turn photos and short clips into ASCII art right in your browser, step by step.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contactEmail = getContactEmail();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#ffffff] text-[#000000] font-sans antialiased flex flex-col">
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <MotionProvider>
          <PageScrollChrome />
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter contactEmail={contactEmail} />
        </MotionProvider>
      </body>
    </html>
  );
}

