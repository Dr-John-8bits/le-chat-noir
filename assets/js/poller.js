export function createPoller(fn, intervalMs, { runImmediately = true, pauseWhenHidden = true, maxBackoffFactor = 5 } = {}) {
  let timer = 0;
  let running = false;
  let failures = 0;
  let visibilityHandler = null;

  function currentDelay() {
    if (!failures) return intervalMs;
    return Math.min(intervalMs * 2 ** failures, intervalMs * maxBackoffFactor);
  }

  async function tick() {
    timer = 0;
    if (!running) return;
    if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) {
      // Onglet caché : pas de fetch, mais on reste programmé pour la reprise.
      schedule(intervalMs);
      return;
    }

    let ok = true;
    try {
      const result = await fn();
      ok = result !== false;
    } catch {
      ok = false;
    }

    failures = ok ? 0 : failures + 1;
    if (running) schedule(currentDelay());
  }

  function schedule(delay) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, delay);
  }

  function start() {
    if (running) return;
    running = true;

    if (pauseWhenHidden && typeof document !== "undefined") {
      visibilityHandler = () => {
        if (!document.hidden && running) kick();
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    if (runImmediately) {
      schedule(0);
    } else {
      schedule(intervalMs);
    }
  }

  function stop() {
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  function kick() {
    if (!running) return;
    schedule(0);
  }

  return { start, stop, kick };
}
