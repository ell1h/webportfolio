// ===== Автоматическое определение языка по браузеру =====
function setLanguage(lang){
    document.querySelectorAll('[lang="en"]').forEach(el => {
        el.style.display = lang === 'en' ? '' : 'none';
    });
    document.querySelectorAll('[lang="ru"]').forEach(el => {
        el.style.display = lang === 'ru' ? '' : 'none';
    });
    document.documentElement.setAttribute('lang', lang);
}

// язык браузера пользователя, например 'ru-RU' -> 'ru'
const browserLang = navigator.language.slice(0, 2);
const initialLang = browserLang === 'ru' ? 'ru' : 'en';

setLanguage(initialLang);