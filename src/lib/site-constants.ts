export const DEFAULT_CONTACT_EMAIL = "contact@dottoh.app";
export const GITHUB_REPO_URL = "https://github.com/AndiAbi4925/Dittoh";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
}

export const SITE_NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/convert", label: "Convert" },
  { href: "/guide", label: "Guide" },
] as const;

export const SITE_MENU_ITEMS: readonly NavItem[] = [
  {
    href: "/convert",
    label: "Photo to ASCII",
    description: "Turn a photo into text art step by step",
  },
  {
    href: "/video",
    label: "Video & GIF",
    description: "Turn an MP4 or GIF into moving ASCII",
  },
  {
    href: "/guide",
    label: "Format Guide",
    description: "Supported file types and quick answers",
  },
  {
    href: "/convert?sample=sphere",
    label: "Try a Sample Photo",
    description: "Preview the converter without uploading",
  },
] as const;
