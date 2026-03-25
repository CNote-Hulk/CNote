// Entrance animation — homepage cards + timeline items
const elements = document.querySelectorAll('.hp-card, .hp-timeline__item');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const idx = Array.from(elements).indexOf(entry.target);
            setTimeout(() => entry.target.classList.add('is-visible'), idx * 80);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
elements.forEach(c => observer.observe(c));