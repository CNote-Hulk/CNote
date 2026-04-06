/**
 * Statistics Page Script (statistici.html)
 * Computes and displays personal progress dashboard:
 * lessons, courses, achievements, quiz stats, and user level.
 */
import { AuthModule } from '../modules/auth.js';
import { ProgressModule } from '../modules/progress.js';
import { AchievementsModule } from '../modules/achievements.js';

const user = AuthModule.getCurrentUser();
if (!user) {
    window.location.href = 'login.html';
}

/** Get count of unique consoles visited from server */
async function getVisitedConsolesCount() {
    try {
        const resp = await fetch('/api/consoles/visited', { credentials: 'include' });
        if (!resp.ok) return 0;
        const data = await resp.json();
        if (data && Array.isArray(data.consoles)) {
            return data.consoles.length;
        }
        return 0;
    } catch {
        return 0;
    }
}

/** Aggregate quiz stats: total attempts, average best score, perfect lessons */
function getQuizStatsSummary(userId) {
    try {
        const all = JSON.parse(localStorage.getItem('cn_quiz_stats')) || {};
        const byCourse = all[userId] || {};
        let attempts = 0;
        let bestSum = 0;
        let bestCount = 0;
        let perfectLessons = 0;

        Object.values(byCourse).forEach((courseStats) => {
            if (!courseStats || typeof courseStats !== 'object') return;
            Object.values(courseStats).forEach((lessonStats) => {
                if (!lessonStats || typeof lessonStats !== 'object') return;
                attempts += Number(lessonStats.attempts || 0);

                const best = Number(lessonStats.best_percent || 0);
                if (!Number.isNaN(best)) {
                    bestSum += best;
                    bestCount += 1;
                }

                if (best >= 100) perfectLessons += 1;
            });
        });

        return {
            attempts,
            bestAverage: bestCount > 0 ? Math.round(bestSum / bestCount) : 0,
            perfectLessons
        };
    } catch {
        return { attempts: 0, bestAverage: 0, perfectLessons: 0 };
    }
}

/** Count unique lessons the user has visited */
function getVisitedLessonsCount(userId) {
    try {
        const all = JSON.parse(localStorage.getItem('cn_lesson_visits')) || {};
        const userVisits = all[userId] || {};
        const unique = new Set();

        Object.values(userVisits).forEach((courseVisits) => {
            if (!Array.isArray(courseVisits)) return;
            courseVisits.forEach((lessonId) => unique.add(String(lessonId)));
        });

        return unique.size;
    } catch {
        return 0;
    }
}

/** Compute user level from weighted lesson/achievement/quiz scores */
function computeLevel(lessonsPct, achievementsPct, quizAverage) {
    const score = Math.round((lessonsPct * 0.45) + (achievementsPct * 0.35) + (quizAverage * 0.20));
    if (score >= 90) return { name: 'Legend', sub: 'You have fully mastered the platform.', emoji: '👑' };
    if (score >= 75) return { name: 'Expert', sub: 'Excellent performance across all areas.', emoji: '🔥' };
    if (score >= 55) return { name: 'Advanced', sub: 'Solid progress, keep the momentum.', emoji: '⚡' };
    if (score >= 35) return { name: 'Intermediate', sub: 'Good foundation, keep building.', emoji: '🌿' };
    return { name: 'Novice', sub: 'You are just getting started. Keep going through lessons and quizzes.', emoji: '🌱' };
}

/** Render next achievement goals (up to 6 locked badges) */
function renderGoals(badges) {
    const container = document.getElementById('next-goals');
    const locked = badges.filter((b) => !b.earned).slice(0, 6);
    if (!locked.length) {
        container.innerHTML = '<div class="next-goal-item">✅ You have unlocked all available achievements.</div>';
        return;
    }

    container.innerHTML = locked.map((b) => `
        <div class="next-goal-item">
            <span class="next-goal-item__icon">${b.icon}</span>
            <div>
                <div class="next-goal-item__name">${b.name}</div>
                <div class="next-goal-item__desc">${b.description}</div>
            </div>
        </div>
    `).join('');
}

/** Compute all stats and update DOM elements */
function renderStats() {
    const courses = ProgressModule.COURSES;
    const allProgress = ProgressModule.getAllProgress(user.id);

    const totalLessons = courses.reduce((sum, c) => sum + Number(c.totalLessons || 0), 0);
    const completedLessons = courses.reduce((sum, c) => {
        const done = allProgress[c.id] || [];
        return sum + done.length;
    }, 0);

    const completedCourses = courses.reduce((sum, c) => {
        const done = allProgress[c.id] || [];
        return sum + (done.length >= Number(c.totalLessons || 0) ? 1 : 0);
    }, 0);

    const lessonsPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const allBadges = AchievementsModule.getAllBadges(user.id);
    const earnedBadges = allBadges.filter((b) => b.earned).length;
    const achievementsPct = allBadges.length > 0 ? Math.round((earnedBadges / allBadges.length) * 100) : 0;

    const quiz = getQuizStatsSummary(user.id);
    // Await the async function to get the actual number, not a Promise
    // (renderStats must be async for this)
    // eslint-disable-next-line no-inner-declarations
    async function updateAsyncStats() {
        const visitedConsoles = await getVisitedConsolesCount();
        document.getElementById('stat-consoles-visited').textContent = String(visitedConsoles);
    }
    updateAsyncStats();
    const visitedLessons = getVisitedLessonsCount(user.id);

    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysMember = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1);

    const level = computeLevel(lessonsPct, achievementsPct, quiz.bestAverage);

    document.getElementById('stat-lessons-completed').textContent = String(completedLessons);
    document.getElementById('stat-lessons-sub').textContent = `of ${totalLessons} lessons (${lessonsPct}%)`;
    document.getElementById('stat-lessons-fill').style.width = `${lessonsPct}%`;
    document.getElementById('stat-lessons-visited').textContent = String(visitedLessons);
    document.getElementById('stat-lessons-visited-sub').textContent = `of ${totalLessons} lessons`;

    document.getElementById('stat-courses-completed').textContent = String(completedCourses);
    document.getElementById('stat-courses-sub').textContent = `of ${courses.length} courses`;

    document.getElementById('stat-achievements-earned').textContent = String(earnedBadges);
    document.getElementById('stat-achievements-sub').textContent = `of ${allBadges.length} badges (${achievementsPct}%)`;

    document.getElementById('stat-quiz-attempts').textContent = String(quiz.attempts);
    document.getElementById('stat-quiz-sub').textContent = `avg best score: ${quiz.bestAverage}%`;

    document.getElementById('stat-perfect-lessons').textContent = String(quiz.perfectLessons);
    document.getElementById('stat-consoles-visited').textContent = String(visitedConsoles);
    document.getElementById('stat-days-member').textContent = String(daysMember);

    document.getElementById('stat-level').textContent = level.name;
    document.getElementById('stat-level-sub').textContent = level.sub;

    // Update level emoji
    const emojiEl = document.getElementById('stats-level-emoji');
    if (emojiEl) emojiEl.textContent = level.emoji;

    // Update username in greeting
    const usernameEl = document.getElementById('statsd-username');
    if (usernameEl) usernameEl.textContent = user.username || 'User';

    // Update ring SVG
    const ringArc = document.getElementById('stats-ring-arc');
    if (ringArc) {
        const circumference = 2 * Math.PI * 42; // r = 42
        const offset = circumference - (circumference * lessonsPct / 100);
        ringArc.style.strokeDasharray = String(circumference);
        ringArc.style.strokeDashoffset = String(offset);
    }

    // Update ring percentage text
    const ringPct = document.getElementById('stat-lessons-pct');
    if (ringPct) ringPct.textContent = `${lessonsPct}%`;

    renderGoals(allBadges);
}

renderStats();
