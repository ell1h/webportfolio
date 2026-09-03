function setLanguage(lang) {
    // Находим все элементы для выбранного языка и показываем их
    document.querySelectorAll(`[lang="${lang}"]`).forEach(el => {
        el.style.display = 'initial'; // или 'block' / 'inline', в зависимости от верстки
    });

    // Находим элементы другого языка и скрываем их
    const invertLang = lang === 'ru' ? 'en' : 'ru';
    document.querySelectorAll(`[lang="${invertLang}"]`).forEach(el => {
        el.style.display = 'none';
    });
}