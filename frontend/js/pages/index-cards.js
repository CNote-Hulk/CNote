// Entrance animation
const cards = document.querySelectorAll('.hub-card');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const idx = Array.from(cards).indexOf(entry.target);
            setTimeout(() => entry.target.classList.add('is-visible'), idx * 100);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
cards.forEach(c => observer.observe(c));

// Card Comunitate — date reale din API
(async function loadCommunityCard() {
    const preview = document.getElementById('community-card-preview');
    if (!preview) return;

    function timeAgo(d) {
        const diff = Date.now() - new Date(d).getTime();
        if (diff < 60000)    return 'acum';
        if (diff < 3600000)  return Math.floor(diff / 60000) + ' min';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    const consoleLabel = { ps: 'PlayStation', xbox: 'Xbox', nintendo: 'Nintendo', pc: 'PC Gaming', general: 'General' };

    try {
        const [threadsRes, listingsRes, activeRes] = await Promise.all([
            fetch('/api/forum/recent'),
            fetch('/api/marketplace/listings?sort=newest&limit=2'),
            fetch('/api/users/active-count')
        ]);
        const threadsData  = await threadsRes.json();
        const listingsData = await listingsRes.json();
        const activeData   = await activeRes.json();
        const activeCount  = activeData.count || 0;

        const threads  = (threadsData.threads  || []).slice(0, 2);
        const listings = (listingsData.listings || []).slice(0, 1);

        const items = [
            ...threads.map(t => ({
                initials: (t.username || '??').slice(0, 2).toUpperCase(),
                title: t.title,
                meta: `Forum · ${consoleLabel[t.console] || t.console}`,
                time: timeAgo(t.created_at),
            })),
            ...listings.map(l => ({
                initials: (l.seller_name || '??').slice(0, 2).toUpperCase(),
                title: l.title,
                meta: 'Marketplace',
                time: `${Number(l.price).toFixed(0)} RON`,
            })),
        ];

        if (!items.length) {
            preview.innerHTML = '<div style="color:var(--text-muted,#7a7672);font-size:.8rem;padding:8px 0">No recent activity.</div>';
            return;
        }

        preview.innerHTML = `
            <div class="thread-list">
                ${items.map(item => `
                    <div class="thread-item">
                        <div class="thread-avatar">${item.initials}</div>
                        <div class="thread-body">
                            <div class="thread-title">${item.title.length > 45 ? item.title.slice(0, 45) + '…' : item.title}</div>
                            <div class="thread-meta"><span>${item.meta}</span><span>· ${item.time}</span></div>
                        </div>
                    </div>`).join('')}
            </div>
            <div class="online-indicator">
                <div class="online-dot"></div>
                <span><strong style="color:var(--text-primary,#F0EBE3)">${activeCount}</strong> membri activi acum</span>
            </div>`;
    } catch {
        preview.innerHTML = '<div style="color:var(--text-muted,#7a7672);font-size:.8rem;padding:8px 0">Could not load data.</div>';
    }
})();