export const DEFAULT_CONTACT_EMAIL = "contact@dottoh.app";

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
    href: "/convert/photo",
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
    label: "Visual Guide",
    description: "Step-by-step GIF demos and file types",
  },
  {
    href: "/convert/photo?sample=sphere",
    label: "Try a Sample Photo",
    description: "Preview the converter without uploading",
  },
] as const;
