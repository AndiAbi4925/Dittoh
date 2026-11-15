import { getOptionalServerEnv } from "@/lib/env";
import {
  DEFAULT_CONTACT_EMAIL,
  GITHUB_REPO_URL,
  type NavItem,
  SITE_MENU_ITEMS,
  SITE_NAV_ITEMS,
} from "@/lib/site-constants";

export {
  DEFAULT_CONTACT_EMAIL,
  GITHUB_REPO_URL,
  type NavItem,
  SITE_MENU_ITEMS,
  SITE_NAV_ITEMS,
};

export function getContactEmail(): string {
  const { ADMIN_CONTACT_EMAIL } = getOptionalServerEnv();
  return ADMIN_CONTACT_EMAIL ?? DEFAULT_CONTACT_EMAIL;
}
