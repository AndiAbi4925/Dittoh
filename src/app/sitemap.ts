import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";

const PUBLIC_PATHS: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/convert", changeFrequency: "weekly", priority: 0.9 },
  { path: "/convert/photo", changeFrequency: "weekly", priority: 0.85 },
  { path: "/video", changeFrequency: "weekly", priority: 0.85 },
  { path: "/guide", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

  return PUBLIC_PATHS.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
