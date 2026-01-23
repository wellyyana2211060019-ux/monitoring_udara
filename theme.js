/* =============================
   THEME LOGIC (STANDALONE)
============================= */
(function () {
    const themeBtn = document.getElementById("themeToggle");
    const icon = themeBtn?.querySelector("i");
    const html = document.documentElement;

    function applyTheme(isLight) {
        if (isLight) {
            html.setAttribute("data-theme", "light");
            icon?.classList.replace("fa-moon", "fa-sun");
            localStorage.setItem("theme", "light");
        } else {
            html.removeAttribute("data-theme");
            icon?.classList.replace("fa-sun", "fa-moon");
            localStorage.removeItem("theme");
        }

        // Dispatch event for other scripts (dashboard.js, history.js)
        window.dispatchEvent(new CustomEvent("theme-change", { detail: { isLight } }));
    }

    // Init Theme Immediately
    const savedTheme = localStorage.getItem("theme");
    applyTheme(savedTheme === "light");

    if (themeBtn) {
        themeBtn.onclick = () => {
            const isLight = !html.hasAttribute("data-theme");
            applyTheme(isLight);
        };
    }
})();
