/**
 * Statistics Page Script (statistici.html)
 * Displays personal progress dashboard:
 * achievements, console visits, friends, favorites, owned consoles.
 * Quiz / lesson / course stats are in working — shown as 🚧.
 */
import { AuthModule } from '../modules/auth.js';
import { AchievementsModule } from '../modules/achievements.js';


let user = AuthModule.getCurrentUser();
if (!user) {
    AuthModule.autoLogin().then(u => {
        if (u && u.id) {
            user = u;
            renderStats();
        } else {
            window.location.href = 'login.html';
        }
    });
} else {
    renderStats();
}

/** Build auth headers with JWT token */
function authHeaders() {
    const token = localStorage.getItem('cn_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/** GET /api/consoles/visited — unique console pages visited */
async function getVisitedConsolesCount() {
    try {
        const resp = await fetch('/api/consoles/visited', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return 0;
        const data = await resp.json();
        return Array.isArray(data.consoles) ? data.consoles.length : 0;
    } catch {
        return 0;
    }
}

/** GET /api/friends — number of accepted friends */
async function getFriendsCount() {
    try {
        const resp = await fetch('/api/friends', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return 0;
        const data = await resp.json();
        return Array.isArray(data.friends) ? data.friends.length : 0;
    } catch {
        return 0;
    }
}

/** GET /api/favorites — number of favorited consoles */
async function getFavoritesCount() {
    try {
        const resp = await fetch('/api/favorites', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return 0;
        const data = await resp.json();
        return Array.isArray(data.favorites) ? data.favorites.length : 0;
    } catch {
        return 0;
    }
}

/** GET /api/owned-consoles — number of owned consoles */
async function getOwnedCount() {
    try {
        const resp = await fetch('/api/owned-consoles', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return 0;
        const data = await resp.json();
        return Array.isArray(data.consoles) ? data.consoles.length : 0;
    } catch {
        return 0;
    }
}

/** GET /api/user/stats — lesson/course learning statistics */
async function getLearningStats() {
    try {
        const resp = await fetch('/api/user/stats', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return null;
        return resp.json();
    } catch {
        return null;
    }
}

/** GET /api/courses/starter-guide/progress — real lesson totals + last lesson */
async function getCourseProgress() {
    try {
        const resp = await fetch('/api/courses/starter-guide/progress', { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) return null;
        return resp.json();
    } catch {
        return null;
    }
}

/** Render next achievement goals (up to 6 locked badges) */
function renderGoals(badges) {
    const container = document.getElementById('next-goals');
    if (!container) return;
    const locked = badges.filter((b) => !b.earned).slice(0, 6);
    if (!locked.length) {
        container.innerHTML = '<div class="next-goal-all-done"><span>✅</span><strong>All achievements unlocked!</strong></div>';
        return;
    }
    container.innerHTML = locked.map((b) => `
        <div class="next-goal-item">
            <div class="next-goal-item__icon-wrap">
                <span class="next-goal-item__icon">${b.icon || '🏅'}</span>
            </div>
            <div class="next-goal-item__body">
                <div class="next-goal-item__name">${b.label || b.name}</div>
                <div class="next-goal-item__desc">${b.description || ''}</div>
            </div>
            <span class="next-goal-item__lock" aria-hidden="true">🔒</span>
        </div>
    `).join('');
}

/** Compute all stats and update DOM */
async function renderStats() {
    // Update username in greeting
    const usernameEl = document.getElementById('statsd-username');
    if (usernameEl) usernameEl.textContent = user.username || 'User';

    // Days on platform
    const createdAt = new Date(user.created_at);
    const daysMember = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)) + 1);
    document.getElementById('stat-days-member').textContent = String(daysMember);

    // Fetch all server data in parallel
    const [visitedConsoles, friendsCount, favoritesCount, ownedCount, learningStats, courseProgress] = await Promise.all([
        getVisitedConsolesCount(),
        getFriendsCount(),
        getFavoritesCount(),
        getOwnedCount(),
        getLearningStats(),
        getCourseProgress(),
    ]);

    // Consoles visited
    document.getElementById('stat-consoles-visited').textContent = String(visitedConsoles);

    // Friends
    document.getElementById('stat-friends').textContent = String(friendsCount);

    // Favorite consoles
    document.getElementById('stat-favorites').textContent = String(favoritesCount);

    // Owned consoles
    document.getElementById('stat-owned').textContent = String(ownedCount);

    // Learning stats (lessons, quiz, courses)
    if (learningStats && learningStats.success) {
        const total = learningStats.lessons_completed_total || 0;
        const thisWeek = learningStats.lessons_completed_this_week || 0;
        const avgScore = learningStats.average_quiz_score || 0;
        const inProgress = learningStats.courses_in_progress || 0;
        const coursesCompleted = learningStats.courses_completed || 0;

        // Real total from course progress API (fallback to learningStats if unavailable)
        const totalLessons = courseProgress && courseProgress.total_lessons > 0
            ? courseProgress.total_lessons
            : (learningStats.total_lessons || 0);
        const pct = totalLessons > 0 ? Math.min(100, Math.round((total / totalLessons) * 100)) : 0;

        const completedEl = document.getElementById('stat-lessons-completed');
        const subEl = document.getElementById('stat-lessons-sub');
        const fillEl = document.getElementById('stat-lessons-fill');
        if (completedEl) completedEl.textContent = String(total);
        if (subEl) subEl.textContent = `of ${totalLessons} lessons`;
        if (fillEl) setTimeout(() => { fillEl.style.width = pct + '%'; }, 80);

        // Quiz average score
        const quizEl = document.getElementById('stat-quiz-attempts');
        const quizSubEl = document.getElementById('stat-quiz-sub');
        if (quizEl) quizEl.textContent = avgScore > 0 ? avgScore + '%' : '—';
        if (quizSubEl) quizSubEl.textContent = 'average quiz score';

        // Courses in progress
        const coursesEl = document.getElementById('stat-courses-completed');
        if (coursesEl) coursesEl.textContent = String(inProgress);

        // This week
        const weekEl = document.getElementById('stat-perfect-lessons');
        if (weekEl) weekEl.textContent = String(thisWeek);

        // Courses completed
        const completedCoursesEl = document.getElementById('stat-lessons-visited');
        if (completedCoursesEl) completedCoursesEl.textContent = String(coursesCompleted);

        // Continue learning link — prefer last_lesson_id from course progress (has slug context)
        const lastLessonId = (courseProgress && courseProgress.last_lesson_id)
            || learningStats.last_lesson_id;
        const courseSlug = courseProgress ? 'starter-guide' : 'starter-guide';
        const ctaBtn = document.getElementById('statsd-continue-btn');
        if (ctaBtn && lastLessonId) {
            ctaBtn.href = `lesson.html?id=${lastLessonId}&slug=${courseSlug}`;
        } else if (ctaBtn && totalLessons > 0) {
            ctaBtn.href = 'course.html?slug=starter-guide';
        }
    }

    // Achievements — fetch from backend and display
    let allBadges = [];
    let earnedBadges = 0;
    let achievementsPct = 0;
    try {
        const resp = await fetch('/api/achievements', { headers: authHeaders(), credentials: 'include' });
        if (resp.ok) {
            const data = await resp.json();
            allBadges = AchievementsModule.getAllBadges(data.achievements);
            earnedBadges = allBadges.filter((b) => b.earned).length;
            achievementsPct = allBadges.length > 0 ? Math.round((earnedBadges / allBadges.length) * 100) : 0;
        }
    } catch (err) {
        // fallback: empty badges
    }

    document.getElementById('stat-achievements-earned').textContent = String(earnedBadges);
    document.getElementById('stat-achievements-sub').textContent = `of ${allBadges.length} badges (${achievementsPct}%)`;

    // Notificări pentru badge-uri noi (dacă backend-ul trimite awardedIds separat, adaptează aici)
    // AchievementsModule.showUnlockNotifications(awardedIds, allBadges); // dacă ai awardedIds

    renderGoals(allBadges);

    // Level — fetch from API (XP-based: Newcomer → Legend)
    let level = AchievementsModule.computeLevel(null);
    try {
        const lvlResp = await fetch('/api/me/level', { headers: authHeaders(), credentials: 'include' });
        if (lvlResp.ok) {
            const lvlData = await lvlResp.json();
            if (lvlData.success) level = AchievementsModule.computeLevel(lvlData);
        }
    } catch { /* keep default */ }

    document.getElementById('stat-level').textContent = `${level.emoji} ${level.name}`;
    document.getElementById('stat-level-sub').textContent = level.sub;
    const emojiEl = document.getElementById('stats-level-emoji');
    if (emojiEl) emojiEl.textContent = level.emoji;

    // Progress bar to next level
    const levelBarWrap = document.getElementById('stat-level-bar-wrap');
    const levelBarFill = document.getElementById('stat-level-bar-fill');
    const levelBarLabel = document.getElementById('stat-level-bar-label');
    if (levelBarWrap) {
        levelBarWrap.style.display = 'block';
        if (!level.isMaxLevel && level.nextLevel) {
            setTimeout(() => { if (levelBarFill) levelBarFill.style.width = level.progressPercent + '%'; }, 80);
            if (levelBarLabel) levelBarLabel.textContent = `${level.xp} / ${level.xpForNext} XP — ${level.progressPercent}% to ${level.nextLevel.emoji} ${level.nextLevel.name}`;
        } else {
            if (levelBarFill) levelBarFill.style.width = '100%';
            if (levelBarLabel) levelBarLabel.textContent = '👑 Maximum level reached!';
        }
    }

    // Save level to localStorage so it's available in other pages without refetching
    localStorage.setItem('cn_user_level', JSON.stringify({ name: level.name, emoji: level.emoji }));

    // Populate the expandable levels panel
    renderLevelsPanel(level);

    // Make level card toggle the panel on click / keyboard
    const levelCard = document.getElementById('level-card');
    const levelsPanel = document.getElementById('levels-panel');
    const expandHint = document.getElementById('level-expand-hint');
    if (levelCard && levelsPanel) {
        const toggle = () => {
            const open = levelsPanel.hidden;
            levelsPanel.hidden = !open;
            levelCard.setAttribute('aria-expanded', String(open));
            if (expandHint) expandHint.textContent = open ? '▲ Hide levels' : '▼ See all levels';
            if (open) levelsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        levelCard.addEventListener('click', toggle);
        levelCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
}

/** Render the all-levels expandable panel */
function renderLevelsPanel(currentLevel) {
    const list = document.getElementById('levels-list');
    if (!list) return;

    if (!AchievementsModule.LEVELS || !AchievementsModule.LEVELS.length) {
        list.innerHTML = '<div class="level-row level-row--error">Levels data unavailable.</div>';
        return;
    }

    const currentIdx = AchievementsModule.LEVELS.findIndex(l => l.name === currentLevel.name);

    list.innerHTML = AchievementsModule.LEVELS.map((lvl, idx) => {
        const isCurrent = idx === currentIdx;
        const isPast    = idx < currentIdx;

        let statusIcon, statusClass;
        if (isPast)         { statusIcon = '✓';       statusClass = 'level-row--done'; }
        else if (isCurrent) { statusIcon = lvl.emoji; statusClass = 'level-row--current'; }
        else                { statusIcon = '🔒';      statusClass = 'level-row--locked'; }

        const desc = lvl.xpRequired === 0 ? 'Starting level' : `Requires ${lvl.xpRequired.toLocaleString()} XP`;

        let barHtml = '';
        if (isCurrent && currentLevel.nextLevel) {
            barHtml = `
                <div class="level-row__bar"><div class="level-row__bar-fill" style="width:${currentLevel.progressPercent}%"></div></div>
                <span class="level-row__bar-label">${currentLevel.xp} / ${currentLevel.xpForNext} XP — ${currentLevel.progressPercent}% towards ${currentLevel.nextLevel.name}</span>`;
        } else if (isPast) {
            barHtml = `<div class="level-row__bar"><div class="level-row__bar-fill" style="width:100%"></div></div>`;
        }

        return `
            <div class="level-row ${statusClass}">
                <div class="level-row__status">${statusIcon}</div>
                <div class="level-row__info">
                    <div class="level-row__header">
                        <strong class="level-row__name">${lvl.emoji} ${lvl.name}</strong>
                    </div>
                    ${desc ? `<div class="level-row__desc">${desc}</div>` : ''}
                    ${barHtml}
                </div>
            </div>`;
    }).join('');
}

// Re-fetch consoles visited when another tab triggers a visit event
window.addEventListener('storage', (e) => {
    if (e.key === 'cn_console_visited_event') {
        getVisitedConsolesCount().then((count) => {
            const el = document.getElementById('stat-consoles-visited');
            if (el) el.textContent = String(count);
        });
    }
});

// ── Populate header date ─────────────────────────────────────
function initHeaderDate() {
    const d = new Date();
    const dayEl = document.getElementById('statsd-day');
    const wdEl  = document.getElementById('statsd-weekday');
    const moEl  = document.getElementById('statsd-month');
    if (dayEl) dayEl.textContent = d.getDate();
    if (wdEl)  wdEl.textContent  = d.toLocaleDateString('en', { weekday: 'long' });
    if (moEl)  moEl.textContent  = d.toLocaleDateString('en', { month: 'long' });
}
initHeaderDate();

// ── Best-effort username from localStorage ───────────────────
function initHeaderUsername() {
    try {
        for (const key of ['cn_user', 'cnote_user', 'user']) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const u = JSON.parse(raw);
            const name = u.username || u.displayName || u.name || '';
            if (name) {
                const el = document.getElementById('statsd-username');
                if (el) el.textContent = name;
                break;
            }
        }
    } catch { /* ignore */ }
}
initHeaderUsername();

// ── Progress ring — observe fill width and update SVG arc ────
function initProgressRing() {
    const fill = document.getElementById('stat-lessons-fill');
    const arc  = document.getElementById('stats-ring-arc');
    const pct  = document.getElementById('stat-lessons-pct');
    if (!fill || !arc) return;
    const CIRC = 263.9; // 2π × 42
    function update() {
        const w = parseFloat(fill.style.width) || 0;
        arc.style.strokeDashoffset = CIRC * (1 - w / 100);
        if (pct) pct.textContent = Math.round(w) + '%';
    }
    new MutationObserver(update).observe(fill, { attributes: true, attributeFilter: ['style'] });
    update();
}
initProgressRing();

// Level emoji is set directly in renderStats from the API response; no observer needed.
