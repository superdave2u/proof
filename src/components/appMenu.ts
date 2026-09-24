/**
 * appMenu.ts — the header's hidden navigation popout.
 *
 * WHY this exists: page navigation used to be per-view buttons that crowded
 * every screen. One always-available header control keeps each page's
 * whitespace and gives every screen the same escape hatch. The links are plain
 * hash anchors so the hash router handles navigation without extra wiring.
 */

export interface MenuLink {
  href: string;
  label: string;
}

export const MENU_LINKS: readonly MenuLink[] = [
  { href: "#/deck", label: "Today" },
  { href: "#/gallery", label: "Gallery" },
  { href: "#/archive", label: "Archive" },
];

export function renderAppMenu(): string {
  return `<div class="app-menu">
    <button class="app-menu__toggle" type="button" data-action="toggle-menu" aria-expanded="false" aria-controls="app-menu-popout" aria-label="Open the navigation menu">Menu</button>
    <nav id="app-menu-popout" class="app-menu__popout" hidden aria-label="Explore the deck">
      ${MENU_LINKS.map((link) => `<a class="app-menu__link" href="${link.href}">${link.label}</a>`).join("")}
    </nav>
  </div>`;
}