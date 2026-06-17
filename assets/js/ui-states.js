export const BLOCK_STATES = ["loading", "ready", "stale", "error", "offline"];

export function setBlockState(el, state) {
  if (!el || !BLOCK_STATES.includes(state)) return;
  el.dataset.state = state;
  for (const name of BLOCK_STATES) {
    el.classList.toggle(`is-${name}`, name === state);
  }
}

export function setTextIfChanged(el, text) {
  if (!el) return false;
  const next = String(text ?? "");
  if (el.textContent === next) return false;
  el.textContent = next;
  return true;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
