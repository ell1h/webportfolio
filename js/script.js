// ===== Плавный скролл по клику на меню (с учётом фиксированной шапки) =====
document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);

        if (!target) return;

        e.preventDefault();
        smoothScrollTo(target, 900);
    });
});

function smoothScrollTo(target, duration){
    const header = document.querySelector('.header');
    const headerHeight = header ? header.offsetHeight : 0;

    const startY = window.scrollY;
    let startTime = null;

    function step(currentTime){
        if (startTime === null) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutQuad(progress);

        // targetY пересчитывается на каждом кадре, чтобы учитывать
        // возможные изменения высоты страницы (например, загрузку картинок)
        const targetY = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        const distance = targetY - startY;

        window.scrollTo(0, startY + distance * ease);

        if (progress < 1){
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function easeInOutQuad(t){
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}


// ===== Фильтры проектов (поддержка нескольких категорий у одного проекта) =====
const filterItems = document.querySelectorAll('.filter-item');
const projectCards = document.querySelectorAll('.project-card');

filterItems.forEach(filter => {
    filter.addEventListener('click', () => {
        filterItems.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');

        const category = filter.dataset.filter;

        projectCards.forEach(card => {
            const cardCategories = card.dataset.category.split(' ');

            if (category === 'all' || cardCategories.includes(category)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});
