/**
 * Learn Page Script (invata.html)
 * Updates course card progress bars from localStorage data.
 */
import { AuthModule } from '../modules/auth.js';
import { ProgressModule } from '../modules/progress.js';

/** Update all course cards with current progress percentages */
function initCourseCardsProgress() {
    const cards = document.querySelectorAll('[data-course-id]');
    if (!cards.length) return;

    const user = AuthModule.getCurrentUser();

    cards.forEach((card) => {
        const courseId = card.dataset.courseId;
        const fallbackTotal = Number(card.dataset.totalLessons) || 0;
        const courseDef = ProgressModule.COURSES.find((course) => course.id === courseId);
        const totalLessons = courseDef?.totalLessons || fallbackTotal;

        const fillEl = card.querySelector('[data-course-progress-fill]');
        const labelEl = card.querySelector('[data-course-progress-label]');
        const hintEl = card.querySelector('[data-course-progress-hint]');

        const progress = user
            ? ProgressModule.getCourseProgress(user.id, courseId, totalLessons)
            : { completed_lessons: [], total_lessons: totalLessons, percentage: 0 };

        if (fillEl) {
            fillEl.style.width = `${progress.percentage}%`;
        }

        if (labelEl) {
            labelEl.textContent = `${progress.completed_lessons.length} / ${progress.total_lessons} (${progress.percentage}%)`;
        }

        if (hintEl) {
            hintEl.textContent = user
                ? 'Continuă cursul pentru a crește progresul.'
                : 'Conectează-te ca să îți vezi progresul.';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCourseCardsProgress);
} else {
    initCourseCardsProgress();
}
