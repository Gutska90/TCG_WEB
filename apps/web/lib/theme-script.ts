export const THEME_INIT_SCRIPT = `(function(){
  try {
    var key = "tcg.theme";
    var stored = localStorage.getItem(key);
    var pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();`;
