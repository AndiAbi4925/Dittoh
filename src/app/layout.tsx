import type { Metadata } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dotgothic16/400.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dottoh | Browser-First Media to ASCII Studio",
    template: "%s | Dottoh",
  },
  description:
    "Convert standard images and supported camera RAW files into customizable ASCII artwork directly in your browser. Zero file uploads.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#ffffff] text-[#000000] font-sans antialiased flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
