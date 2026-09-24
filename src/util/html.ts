/**
 * html.ts — the single HTML-escaping boundary.
 *
 * WHY this exists: every card, ability, evidence note, and error message is
 * authored text, and all of it reaches the DOM through template literals. One
 * implementation removes the drift between the four copies the card face, deck,
 * evidence form, and detail view used to carry.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}
