export function initScrollTop() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scroll-top-button";
  button.setAttribute("aria-label", "Revenir en haut de page");
  button.textContent = "↑";
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.append(button);

  const update = () => {
    button.classList.toggle("is-visible", window.scrollY > 320);
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}
