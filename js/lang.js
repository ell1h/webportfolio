(() => {
    const root = document.documentElement;
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)");

    function read(key) {
        try {
            return localStorage.getItem(`portfolio-${key}`);
        } catch {
            return null;
        }
    }

    function save(key, value) {
        try {
            localStorage.setItem(`portfolio-${key}`, value);
        } catch {
            // Keep the setting for this page when storage is unavailable.
        }
    }

    root.lang = read("language") === "ru" ? "ru" : "en";

    const storedTheme = read("theme");
    let explicitTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
    root.dataset.theme = explicitTheme ?? (preferredTheme.matches ? "dark" : "light");

    document.addEventListener("DOMContentLoaded", () => {
        const languageButtons = [...document.querySelectorAll("[data-set-language]")];
        const themeButton = document.querySelector("[data-theme-switch]");
        const title = document.querySelector("[data-title-ru]");
        const englishTitle = title.textContent;
        const localizedAttributes = [
            ["[data-aria-ru]", "aria-label", "ariaRu"],
            ["[data-alt-ru]", "alt", "altRu"],
        ].flatMap(([selector, attribute, key]) =>
            [...document.querySelectorAll(selector)].map(node => ({
                node, attribute, en: node.getAttribute(attribute), ru: node.dataset[key],
            }))
        );

        function updateLanguage(language) {
            root.lang = language;
            title.textContent = language === "ru" ? title.dataset.titleRu : englishTitle;
            localizedAttributes.forEach(({ node, attribute, en, ru }) =>
                node.setAttribute(attribute, language === "ru" ? ru : en)
            );
            languageButtons.forEach(button =>
                button.setAttribute("aria-pressed", String(button.dataset.setLanguage === language))
            );
        }

        function updateTheme() {
            const theme = explicitTheme ?? (preferredTheme.matches ? "dark" : "light");
            root.dataset.theme = theme;
            themeButton.setAttribute("aria-pressed", String(theme === "dark"));
        }

        languageButtons.forEach(button => {
            button.addEventListener("click", () => {
                const language = button.dataset.setLanguage;
                save("language", language);
                updateLanguage(language);
            });
        });

        themeButton.addEventListener("click", () => {
            explicitTheme = root.dataset.theme === "dark" ? "light" : "dark";
            save("theme", explicitTheme);
            updateTheme();
        });

        preferredTheme.addEventListener("change", updateTheme);
        updateLanguage(root.lang);
        updateTheme();
        document.querySelector(".site-settings").hidden = false;
    });
})();
