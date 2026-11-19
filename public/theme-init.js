(function () {
  try {
    var stored = window.localStorage.getItem("dittoh-theme");
    var theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    // Fallback cleanly to default light theme if storage is blocked
  }
})();
