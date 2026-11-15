export const DEFAULT_CONTACT_EMAIL = "contact@dottoh.app";
export const GITHUB_REPO_URL = "https://github.com/AndiAbi4925/Dittoh";

export interface NavItem {
  href: string;
  label: string;
}

export const SITE_NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "STUDIO" },
  { href: "/privacy", label: "PRIVACY" },
  { href: "/terms", label: "TERMS" },
] as const;
