// =============================================
// WJEEN - Ultra Dynamic JavaScript Engine
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lenis Smooth Scroll
    initLenis();

    // Custom Cursor with spring physics
    initCustomCursor();

    // Stats Counters Animation (Robust & Always Visible)
    initCounters();

    // Hero Text Carousel
    initHeroSlides();

    // Magnetic Buttons Physics
    initMagneticButtons();

    // Header Scroll State
    initHeaderScroll();

    // Page Loader
    initPageLoader();

    // Interactive Map Tooltips
    initMapInteractivity();
});

// =============================================
// LENIS SMOOTH SCROLL
// =============================================
function initLenis() {
    if (typeof Lenis === 'undefined') return;

    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        smoothTouch: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

// =============================================
// CUSTOM CURSOR
// =============================================
function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    });

    function renderRing() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        requestAnimationFrame(renderRing);
    }
    renderRing();

    const hoverTargets = document.querySelectorAll('a, button, .b-card-3d, .project-card-lg, .stat-card-premium, .city-pin');
    hoverTargets.forEach(target => {
        target.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        target.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

// =============================================
// STATS COUNTERS (ROBUST COUNT UP)
// =============================================
function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const runCounter = (el) => {
        if (el.classList.contains('counted')) return;
        el.classList.add('counted');

        const target = parseInt(el.getAttribute('data-counter'), 10);
        const duration = 2000;
        const startTime = performance.now();

        const update = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);

            el.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = target.toLocaleString();
            }
        };
        requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                runCounter(entry.target);
            }
        });
    }, { threshold: 0.2 });

    counters.forEach(counter => observer.observe(counter));
}

// =============================================
// HERO SLIDE TEXT CAROUSEL
// =============================================
function initHeroSlides() {
    const slides = document.querySelectorAll('.hero-slide-text');
    if (!slides.length) return;

    let current = 0;
    setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 4500);
}

// =============================================
// MAGNETIC BUTTON PHYSICS
// =============================================
function initMagneticButtons() {
    const magnets = document.querySelectorAll('.btn-magnet');
    if (window.matchMedia('(pointer: coarse)').matches) return;

    magnets.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate3d(${x * 0.3}px, ${y * 0.3}px, 0) scale(1.04)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
        });
    });
}

// =============================================
// HEADER SCROLL STATE
// =============================================
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });
}

// =============================================
// PAGE LOADER
// =============================================
function initPageLoader() {
    const loader = document.getElementById('page-loader');
    const fill = document.querySelector('.loader-bar-fill');
    if (!loader || !fill) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
            progress = 100;
            fill.style.width = '100%';
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add('loaded');
            }, 250);
        } else {
            fill.style.width = `${progress}%`;
        }
    }, 80);
}

// =============================================
// INTERACTIVE MAP PINS
// =============================================
function initMapInteractivity() {
    const pins = document.querySelectorAll('.city-pin');
    pins.forEach(pin => {
        pin.addEventListener('click', () => {
            const city = pin.getAttribute('data-city') || 'Saudi Arabia';
            alert(`Wjeen & Partners - Regional Hub in ${city}`);
        });
    });
}
