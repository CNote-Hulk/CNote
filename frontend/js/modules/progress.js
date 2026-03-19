/**
 * Course Progress Module
 * Tracks lesson completion per course using localStorage
 */

export const ProgressModule = {
    STORAGE_KEY: 'cn_progress',

    /** Get all progress entries for a user */
    _getAll(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            return data[userId] || {};
        } catch { return {}; }
    },

    /** Save progress for a user */
    _saveAll(userId, progress) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            data[userId] = progress;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch { /* noop */ }
    },

    /**
     * Get progress for a specific course
     * @returns {{ completed_lessons: number[], total_lessons: number, percentage: number }}
     */
    getCourseProgress(userId, courseId, totalLessons) {
        const all = this._getAll(userId);
        const completed = all[courseId] || [];
        return {
            completed_lessons: completed,
            total_lessons: totalLessons,
            percentage: totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0
        };
    },

    /** Mark a lesson as completed */
    markLessonComplete(userId, courseId, lessonId, totalLessons) {
        const all = this._getAll(userId);
        if (!all[courseId]) all[courseId] = [];
        if (!all[courseId].includes(lessonId)) {
            all[courseId].push(lessonId);
        }
        this._saveAll(userId, all);
        return this.getCourseProgress(userId, courseId, totalLessons);
    },

    /** Unmark a lesson */
    unmarkLesson(userId, courseId, lessonId, totalLessons) {
        const all = this._getAll(userId);
        if (all[courseId]) {
            all[courseId] = all[courseId].filter(l => l !== lessonId);
        }
        this._saveAll(userId, all);
        return this.getCourseProgress(userId, courseId, totalLessons);
    },

    /** Get all courses with progress for a user */
    getAllProgress(userId) {
        return this._getAll(userId);
    },

    /** Reset all progress for a user */
    resetUserProgress(userId) {
        this._saveAll(userId, {});
    },

    /** Course definitions */
    COURSES: [
        { id: 'inginerie', name: 'Console Engineering', icon: '⚡', totalLessons: 42, prefix: 'lectia-' }
    ]
};
