/* Which navigation items go in a phone's bottom bar and which in its "More" sheet (rules only: no React; tested in
   mobileNav.test.js). The sidebar's own list (NAV / UNI_NAV, plus the Admin item) is the single source of items, so
   a page added there shows up on phones too, in More, without touching this file. */

// The bar's slots, in order. A profile that lacks one (a university profile has no Practice) simply gets a shorter
// bar; the last slot is always More.
export const MOBILE_PRIMARY_IDS = ["dashboard", "universityHub", "practice", "coach", "wardrobe"];

// Pages the phone navigation does not offer. They still exist in the desktop sidebar.
export const MOBILE_HIDDEN_IDS = ["languages"];

export function splitMobileNav(items = []) {
  const offered = items.filter((n) => !MOBILE_HIDDEN_IDS.includes(n.id));
  const primary = MOBILE_PRIMARY_IDS.map((id) => offered.find((n) => n.id === id)).filter(Boolean);
  const more = offered.filter((n) => !primary.includes(n));
  return { primary, more };
}

/* More shows as the open tab when the open page is one of the items inside it. */
export const moreIsActive = (tab, more) => more.some((n) => n.id === tab);
