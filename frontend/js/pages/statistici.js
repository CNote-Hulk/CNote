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

/** Get count of unique consoles visited from localStorage */
function getVisitedConsolesCount() {
    try {
        const visited = JSON.parse(localStorage.getItem('cn_visited_consoles')) || [];
        return Array.isArray(visited) ? visited.length : 0;
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
    if (score >= 90) return { name: 'Legend', sub: 'Ai stăpânit complet platforma.' };
    if (score >= 75) return { name: 'Expert', sub: 'Performanță foarte bună pe toate zonele.' };
    if (score >= 55) return { name: 'Avansat', sub: 'Progres solid, ritm excelent.' };
    if (score >= 35) return { name: 'Intermediar', sub: 'Bază bună, continuă să consolidezi.' };
    return { name: 'Novice', sub: 'Ești la început. Continuă lecțiile și quiz-urile.' };
}

/** Render next achievement goals (up to 6 locked badges) */
function renderGoals(badges) {
    const container = document.getElementById('next-goals');
    const locked = badges.filter((b) => !b.earned).slice(0, 6);
    if (!locked.length) {
        container.innerHTML = '<div class="next-goal-item">✅ Ai deblocat toate realizările disponibile.</div>';
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
    const visitedConsoles = getVisitedConsolesCount();
    const visitedLessons = getVisitedLessonsCount(user.id);

    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysMember = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) + 1);

    const level = computeLevel(lessonsPct, achievementsPct, quiz.bestAverage);

    document.getElementById('stat-lessons-completed').textContent = String(completedLessons);
    document.getElementById('stat-lessons-sub').textContent = `din ${totalLessons} lecții (${lessonsPct}%)`;
    document.getElementById('stat-lessons-fill').style.width = `${lessonsPct}%`;
    document.getElementById('stat-lessons-visited').textContent = String(visitedLessons);
    document.getElementById('stat-lessons-visited-sub').textContent = `din ${totalLessons} lecții`;

    document.getElementById('stat-courses-completed').textContent = String(completedCourses);
    document.getElementById('stat-courses-sub').textContent = `din ${courses.length} cursuri`;

    document.getElementById('stat-achievements-earned').textContent = String(earnedBadges);
    document.getElementById('stat-achievements-sub').textContent = `din ${allBadges.length} badge-uri (${achievementsPct}%)`;

    document.getElementById('stat-quiz-attempts').textContent = String(quiz.attempts);
    document.getElementById('stat-quiz-sub').textContent = `best score mediu: ${quiz.bestAverage}%`;

    document.getElementById('stat-perfect-lessons').textContent = String(quiz.perfectLessons);
    document.getElementById('stat-consoles-visited').textContent = String(visitedConsoles);
    document.getElementById('stat-days-member').textContent = String(daysMember);

    document.getElementById('stat-level').textContent = level.name;
    document.getElementById('stat-level-sub').textContent = level.sub;

    renderGoals(allBadges);
}

renderStats();
