const header = document.querySelector(".header");
if (header && "ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
        document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
    });
    observer.observe(header);
}

function closeOnBackdropClick(dialog) {
    dialog.addEventListener("click", event => {
        if (event.target !== dialog) return;
        const { left, right, top, bottom } = dialog.getBoundingClientRect();
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
            dialog.close();
        }
    });
}

function setupMobileMenu() {
    const nav = header?.querySelector(".nav");
    const desktopMenu = nav?.querySelector(".menu");
    if (!desktopMenu || typeof window.HTMLDialogElement?.prototype.showModal !== "function") return;

    nav.insertAdjacentHTML("afterbegin", `
        <button type="button" class="menu-toggle" aria-label="Menu" data-aria-ru="Меню"
                aria-controls="mobile-menu" aria-haspopup="dialog" aria-expanded="false">
            <span class="menu-icon" aria-hidden="true"></span>
        </button>
    `);
    document.body.insertAdjacentHTML("beforeend", `
        <dialog class="mobile-menu" id="mobile-menu" aria-labelledby="mobile-menu-title">
            <div class="mobile-menu-header">
                <h2 id="mobile-menu-title">
                    <span data-language="en" lang="en">Menu</span>
                    <span data-language="ru" lang="ru">Меню</span>
                </h2>
                <button type="button" class="menu-close" aria-label="Close menu"
                        data-aria-ru="Закрыть меню" autofocus></button>
            </div>
            <nav aria-label="Main navigation" data-aria-ru="Основная навигация"></nav>
        </dialog>
    `);

    const toggle = nav.querySelector(".menu-toggle");
    const drawer = document.getElementById("mobile-menu");
    const close = drawer.querySelector(".menu-close");
    const drawerMenu = desktopMenu.cloneNode(true);
    drawerMenu.className = "drawer-menu";
    drawer.querySelector("nav").append(drawerMenu);
    nav.dataset.mobileMenuReady = "";

    toggle.addEventListener("click", () => {
        drawer.showModal();
        toggle.setAttribute("aria-expanded", "true");
    });
    close.addEventListener("click", () => drawer.close());
    drawer.addEventListener("close", () => toggle.setAttribute("aria-expanded", "false"));
    drawerMenu.addEventListener("click", event => {
        if (event.target.closest("a") && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
            drawer.close();
        }
    });
    closeOnBackdropClick(drawer);
    window.matchMedia("(max-width: 950px)").addEventListener("change", event => {
        if (!event.matches && drawer.open) drawer.close();
    });
}

setupMobileMenu();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setupProjectGallery() {
    const gallery = document.querySelector(".project");
    if (!gallery || typeof window.HTMLDialogElement?.prototype.showModal !== "function") return;
    const slides = [...gallery.querySelectorAll(".media-link")];
    if (!slides.length) return;

    document.body.insertAdjacentHTML("beforeend", `
        <dialog class="media-viewer" aria-label="Project image" data-aria-ru="Изображение проекта">
            <div class="media-viewer-toolbar">
                <a class="media-original" target="_blank" rel="noopener">
                    <span data-language="en" lang="en">Open original</span>
                    <span data-language="ru" lang="ru">Открыть оригинал</span>
                    <span aria-hidden="true">↗</span>
                </a>
                <div class="media-viewer-actions">
                    <button type="button" class="media-zoom" aria-label="Zoom image"
                            data-aria-ru="Увеличение изображения" aria-pressed="false">
                        <span aria-hidden="true" class="media-zoom-icon"></span>
                    </button>
                    <button type="button" class="menu-close" aria-label="Close image"
                            data-aria-ru="Закрыть изображение" autofocus></button>
                </div>
            </div>
            <div class="media-viewer-stage">
                <div class="media-viewer-track">
                    <div class="media-viewer-frame" aria-hidden="true"${slides.length === 1 ? " hidden" : ""}>
                        <img class="media-viewer-image" alt="" draggable="false" decoding="async">
                    </div>
                    <div class="media-viewer-frame">
                        <img class="media-viewer-image" alt="" draggable="false" decoding="async">
                    </div>
                    <div class="media-viewer-frame" aria-hidden="true"${slides.length === 1 ? " hidden" : ""}>
                        <img class="media-viewer-image" alt="" draggable="false" decoding="async">
                    </div>
                </div>
            </div>
            <div class="media-viewer-footer">
                <div class="media-caption"><p class="media-caption-text"></p></div>
                <div class="media-viewer-pagination"${slides.length === 1 ? " hidden" : ""}>
                    <button type="button" class="media-step" data-step="-1" aria-label="Previous image"
                            data-aria-ru="Предыдущее изображение">
                        <span aria-hidden="true">←</span>
                    </button>
                    <span class="media-position" role="status"></span>
                    <button type="button" class="media-step" data-step="1" aria-label="Next image"
                            data-aria-ru="Следующее изображение">
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </dialog>
    `);

    const viewer = document.querySelector(".media-viewer");
    const stage = viewer.querySelector(".media-viewer-stage");
    const track = stage.querySelector(".media-viewer-track");
    const original = viewer.querySelector(".media-original");
    const caption = viewer.querySelector(".media-caption-text");
    const position = viewer.querySelector(".media-position");
    const zoomButton = viewer.querySelector(".media-zoom");
    const pointers = new Map();
    let currentSlide = 0;
    let gesture = null;
    let motion = null;
    let zoom = { scale: 1, x: 0, y: 0 };
    let detailRequest = null;
    let wheelTarget = null;
    let wheelFrame = 0;

    function activeImage() {
        return track.children[1].firstElementChild;
    }

    function limit(value, low, high) {
        return Math.min(high, Math.max(low, value));
    }

    function wrap(index) {
        return (index + slides.length) % slides.length;
    }

    function syncSlides() {
        [...track.children].forEach((frame, slot) => {
            if (frame.hidden) return;
            const active = slot === 1;
            const preview = slides[wrap(currentSlide + slot - 1)].querySelector("img");
            const image = frame.firstElementChild;
            frame.setAttribute("aria-hidden", String(!active));
            image.alt = active ? preview.alt : "";
            if (image.getAttribute("src") !== preview.src) image.src = preview.src;
        });
        const slide = slides[currentSlide];
        const label = slide.closest("figure")?.querySelector("figcaption");
        const language = document.documentElement.lang;
        const labelText = label?.querySelector(`[data-language="${language}"]`)?.textContent ?? label?.textContent;
        caption.textContent = labelText?.trim() || activeImage().alt;
        original.href = slide.href;
        position.textContent = `${currentSlide + 1} / ${slides.length}`;
    }

    function stopWheelZoom() {
        if (wheelFrame) cancelAnimationFrame(wheelFrame);
        wheelFrame = 0;
        wheelTarget = null;
    }

    function resetMotion() {
        stopWheelZoom();
        motion?.cancel();
        motion = null;
        gesture = null;
        pointers.clear();
        delete stage.dataset.panning;
        track.style.transform = "";
    }

    function loadOriginalForZoom(image) {
        const source = slides[currentSlide].href;
        if (image.src === source || detailRequest) return;
        const detail = new Image();
        detailRequest = detail;
        detail.onload = () => {
            if (detailRequest === detail && viewer.open && activeImage() === image) image.src = source;
        };
        detail.src = source;
    }

    function applyZoom({ scale, x, y }) {
        const image = activeImage();
        // Keep the fitted image area reachable on both axes, including beside a portrait.
        const expansion = (scale - 1) / 2;
        const maxX = image.offsetWidth * expansion;
        const maxY = image.offsetHeight * expansion;
        zoom = { scale, x: limit(x, -maxX, maxX), y: limit(y, -maxY, maxY) };
        image.style.transform = scale > 1 ? `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${scale})` : "";
        stage.toggleAttribute("data-zoomed", scale > 1);
        zoomButton.setAttribute("aria-pressed", String(scale > 1));
        if (scale >= 1.25) loadOriginalForZoom(image);
    }

    function resetZoom() {
        detailRequest = null;
        applyZoom({ scale: 1, x: 0, y: 0 });
    }

    function relativePoint(clientX, clientY) {
        const rect = stage.getBoundingClientRect();
        return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    }

    function zoomAt(scale, point, initialZoom = zoom, initialPoint = point) {
        const ratio = scale / initialZoom.scale;
        applyZoom({
            scale,
            x: point.x - (initialPoint.x - initialZoom.x) * ratio,
            y: point.y - (initialPoint.y - initialZoom.y) * ratio,
        });
    }

    function toggleZoom(point = { x: 0, y: 0 }) {
        if (motion || gesture) return;
        stopWheelZoom();
        if (zoom.scale > 1) {
            resetZoom();
            return;
        }
        zoomAt(2.5, point);
    }

    function animateWheelZoom() {
        const { scale, point } = wheelTarget;
        const difference = scale - zoom.scale;
        if (Math.abs(difference) < 0.005 || reducedMotion.matches) {
            zoomAt(scale, point);
            stopWheelZoom();
            return;
        }
        zoomAt(zoom.scale + difference * 0.25, point);
        wheelFrame = requestAnimationFrame(animateWheelZoom);
    }

    stage.addEventListener("wheel", event => {
        if (motion || gesture || event.ctrlKey || event.metaKey || event.altKey || !event.deltaY) return;
        if (zoom.scale === 1 && !wheelTarget && event.target !== activeImage()) return;

        event.preventDefault();
        let unit = 1;
        if (event.deltaMode === 1) unit = 16;
        if (event.deltaMode === 2) unit = stage.clientHeight;
        const delta = limit(event.deltaY * unit, -240, 240);
        let startScale = wheelTarget?.scale ?? zoom.scale;
        if ((startScale - zoom.scale) * delta > 0) startScale = zoom.scale;
        wheelTarget = {
            scale: limit(startScale * Math.exp(-delta * 0.0028), 1, 4),
            point: relativePoint(event.clientX, event.clientY),
        };
        if (!wheelFrame) wheelFrame = requestAnimationFrame(animateWheelZoom);
    }, { passive: false });

    function finishSlide(step) {
        resetMotion();
        if (!step) return;
        resetZoom();
        // Keep the frame that just moved into view, including its loaded image.
        if (step > 0) track.append(track.firstElementChild);
        else track.prepend(track.lastElementChild);
        currentSlide = wrap(currentSlide + step);
        syncSlides();
    }

    function settleSlide(step) {
        if (motion || gesture || (!step && !track.style.transform)) return;
        stopWheelZoom();
        if (reducedMotion.matches || typeof track.animate !== "function") {
            finishSlide(step);
            return;
        }

        const start = track.style.transform || "translateX(0px)";
        motion = track.animate([
            { transform: start },
            { transform: `translateX(${-step * 100}%)` },
        ], {
            duration: step ? 270 : 190,
            easing: "cubic-bezier(.2,.75,.25,1)",
            fill: "forwards",
        });
        motion.onfinish = () => finishSlide(step);
    }

    viewer.querySelector(".menu-close").addEventListener("click", () => viewer.close());
    viewer.addEventListener("close", () => {
        if (viewer.open) return;
        resetMotion();
        resetZoom();
    });
    zoomButton.addEventListener("click", () => toggleZoom());
    closeOnBackdropClick(viewer);

    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(() => {
            if (viewer.open && zoom.scale > 1) applyZoom(zoom);
        });
        observer.observe(stage);
    }

    if (slides.length > 1) {
        viewer.querySelectorAll("[data-step]").forEach(button => {
            button.addEventListener("click", () => settleSlide(Number(button.dataset.step)));
        });
        viewer.addEventListener("keydown", event => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            settleSlide(event.key === "ArrowLeft" ? -1 : 1);
        });
    }

    function pinchPosition() {
        const [first, second] = pointers.values();
        const point = relativePoint((first.x + second.x) / 2, (first.y + second.y) / 2);
        return { point, distance: Math.hypot(first.x - second.x, first.y - second.y) };
    }

    function startSingle(pointer, timeStamp, clickImage, panOnly = false) {
        gesture = {
            kind: zoom.scale > 1 || panOnly ? "pan" : "swipe",
            start: pointer, startedAt: timeStamp, clickImage,
            width: stage.clientWidth, zoom, axis: null, moved: false,
        };
    }

    stage.addEventListener("pointerdown", event => {
        if (motion || event.button !== 0 || pointers.size >= 2) return;
        const first = pointers.values().next().value;
        if (first && (first.type !== "touch" || event.pointerType !== "touch")) return;

        stopWheelZoom();
        const pointer = { x: event.clientX, y: event.clientY, type: event.pointerType };
        pointers.set(event.pointerId, pointer);
        stage.setPointerCapture(event.pointerId);
        if (pointers.size === 1) {
            startSingle(pointer, event.timeStamp, pointer.type === "mouse" && event.target === activeImage());
            return;
        }

        track.style.transform = "";
        delete stage.dataset.panning;
        gesture = { kind: "pinch", ...pinchPosition(), zoom };
    });

    stage.addEventListener("pointermove", event => {
        const pointer = pointers.get(event.pointerId);
        if (!pointer || !gesture) return;
        pointers.set(event.pointerId, { ...pointer, x: event.clientX, y: event.clientY });

        if (gesture.kind === "pinch") {
            const { point, distance } = pinchPosition();
            const initial = gesture.zoom;
            const scale = limit(initial.scale * distance / Math.max(gesture.distance, 1), 1, 4);
            zoomAt(scale, point, initial, gesture.point);
            return;
        }

        const dx = event.clientX - gesture.start.x;
        const dy = event.clientY - gesture.start.y;
        if (Math.hypot(dx, dy) >= 7) gesture.moved = true;
        if (!gesture.moved) return;

        if (gesture.kind === "pan") {
            stage.dataset.panning = "";
            applyZoom({ scale: zoom.scale, x: gesture.zoom.x + dx, y: gesture.zoom.y + dy });
            return;
        }

        gesture.axis ??= Math.abs(dx) > 1.2 * Math.abs(dy) ? "horizontal" : "vertical";
        if (slides.length > 1 && gesture.axis === "horizontal") {
            const offset = limit(dx, -gesture.width, gesture.width);
            track.style.transform = `translateX(${offset}px)`;
        }
    });

    function endPointer(event, cancelled = false) {
        if (!pointers.delete(event.pointerId) || !gesture) return;
        const finished = gesture;
        gesture = null;
        delete stage.dataset.panning;
        if (pointers.size) {
            startSingle(pointers.values().next().value, event.timeStamp, false, true);
            return;
        }

        if (zoom.scale > 1 && zoom.scale < 1.04) applyZoom({ scale: 1, x: 0, y: 0 });
        if (cancelled) {
            settleSlide(0);
            return;
        }

        const dx = event.clientX - finished.start.x;
        const dy = event.clientY - finished.start.y;
        if (finished.clickImage && !finished.moved && Math.hypot(dx, dy) < 7) {
            toggleZoom(relativePoint(event.clientX, event.clientY));
            return;
        }
        if (finished.kind !== "swipe" || slides.length < 2) return;

        const travel = Math.abs(dx);
        const flick = travel >= 32 && event.timeStamp - finished.startedAt < 240;
        const advance = finished.axis === "horizontal" && (travel >= Math.min(96, finished.width * 0.2) || flick);
        settleSlide(advance ? Math.sign(-dx) : 0);
    }

    stage.addEventListener("pointerup", event => endPointer(event));
    stage.addEventListener("pointercancel", event => endPointer(event, true));
    stage.addEventListener("lostpointercapture", event => endPointer(event, true));

    gallery.addEventListener("click", event => {
        const link = event.target.closest(".media-link");
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        resetMotion();
        resetZoom();
        currentSlide = slides.indexOf(link);
        syncSlides();
        viewer.showModal();
    });
}

setupProjectGallery();

const menuLinks = [...document.querySelectorAll(".menu-link")];
function updateCurrentSection() {
    const casePage = document.querySelector(".case-main");
    const activeHref = window.location.hash || (casePage ? "index.html#projects" : "#about");
    menuLinks.forEach(link => {
        if (link.getAttribute("href") === activeHref) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}
window.addEventListener("hashchange", updateCurrentSection);
updateCurrentSection();

const filters = [...document.querySelectorAll(".filter-item")];
const projectCards = [...document.querySelectorAll(".project-card")];
const filterAnimations = new Map();

const autoplayVideo = document.querySelector("[data-autoplay]");
if (autoplayVideo && "IntersectionObserver" in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (!reducedMotion.matches) autoplayVideo.play().catch(() => {});
    }, { threshold: 0.25 });
    observer.observe(autoplayVideo);
}

filters.forEach(filter => {
    filter.addEventListener("click", () => {
        if (filter.getAttribute("aria-pressed") === "true") return;

        const animate = !reducedMotion.matches && typeof Element.prototype.animate === "function";
        const previousPositions = new Map();

        if (animate) {
            projectCards.filter(card => !card.hidden).forEach(card =>
                previousPositions.set(card, card.getBoundingClientRect())
            );
        }

        filterAnimations.forEach(animation => animation.cancel());
        filterAnimations.clear();

        filters.forEach(button => button.setAttribute("aria-pressed", String(button === filter)));
        const category = filter.dataset.filter;
        projectCards.forEach(card => {
            card.hidden = category !== "all" && !card.dataset.category.split(/\s+/).includes(category);
        });

        if (!animate) return;

        const visibleCards = projectCards.filter(card => !card.hidden);
        const nextPositions = visibleCards.map(card => card.getBoundingClientRect());
        visibleCards.forEach((card, index) => {
            const before = previousPositions.get(card);
            const after = nextPositions[index];
            const x = before ? before.left - after.left : 0;
            // A shorter grid can clamp the scroll position while filtering.
            const y = before ? Math.max(-260, Math.min(260, before.top - after.top)) : 10;
            const frames = [
                { transform: `translate(${x}px, ${y}px)`, opacity: before ? 1 : 0 },
                { transform: "translate(0, 0)", opacity: 1 },
            ];
            const animation = card.animate(frames, {
                duration: 260,
                delay: before ? 0 : Math.min(index * 22, 130),
                fill: "backwards",
                easing: "cubic-bezier(.2,.7,.25,1)",
            });
            filterAnimations.set(card, animation);
            animation.onfinish = () => filterAnimations.delete(card);
        });
    });
});
