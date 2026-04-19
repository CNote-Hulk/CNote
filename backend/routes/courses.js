/* ─────────────────────────────────────────
   FILE: routes/courses.js
   DESCRIPTION: Course, module, lesson, and quiz endpoints.
   ───────────────────────────────────────── */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

// GET /api/courses — all published courses with counts
router.get('/courses', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*,
                COUNT(DISTINCT m.id)::int AS module_count,
                COUNT(DISTINCT CASE WHEN l.is_published THEN l.id END)::int AS lesson_count
            FROM courses c
            LEFT JOIN modules m ON m.course_id = c.id
            LEFT JOIN lessons l ON l.module_id = m.id
            WHERE c.is_published = true
            GROUP BY c.id
            ORDER BY c.id
        `);
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        console.error('GET /courses error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/courses/:slug — course with full module/lesson structure
router.get('/courses/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const courseResult = await pool.query(
            'SELECT * FROM courses WHERE slug = $1',
            [slug]
        );
        if (!courseResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        const course = courseResult.rows[0];

        const modulesResult = await pool.query(`
            SELECT m.id, m.title, m.order_index,
                COALESCE(
                    json_agg(
                        json_build_object('id', l.id, 'title', l.title, 'order_index', l.order_index)
                        ORDER BY l.order_index
                    ) FILTER (WHERE l.id IS NOT NULL),
                    '[]'
                ) AS lessons
            FROM modules m
            LEFT JOIN lessons l ON l.module_id = m.id AND l.is_published = true
            WHERE m.course_id = $1
            GROUP BY m.id
            ORDER BY m.order_index
        `, [course.id]);

        course.modules = modulesResult.rows;
        res.json({ success: true, course });
    } catch (err) {
        console.error('GET /courses/:slug error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/courses/:slug/progress — user progress for a course
router.get('/courses/:slug/progress', authRequired, async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        const courseResult = await pool.query(
            'SELECT id FROM courses WHERE slug = $1',
            [slug]
        );
        if (!courseResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        const courseId = courseResult.rows[0].id;

        const [completedResult, progressResult, totalResult] = await Promise.all([
            pool.query(`
                SELECT ul.lesson_id FROM user_lessons ul
                JOIN lessons l ON l.id = ul.lesson_id
                JOIN modules m ON m.id = l.module_id
                WHERE ul.user_id = $1 AND m.course_id = $2 AND ul.completed = true
            `, [userId, courseId]),
            pool.query(
                'SELECT * FROM user_course_progress WHERE user_id = $1 AND course_id = $2',
                [userId, courseId]
            ),
            pool.query(`
                SELECT COUNT(l.id)::int AS total FROM lessons l
                JOIN modules m ON m.id = l.module_id
                WHERE m.course_id = $1 AND l.is_published = true
            `, [courseId])
        ]);

        const progress = progressResult.rows[0] || {};
        const completedIds = completedResult.rows.map(r => r.lesson_id);
        const total = totalResult.rows[0].total;

        res.json({
            success: true,
            completed_lesson_ids: completedIds,
            last_lesson_id: progress.last_lesson_id || null,
            course_completed: !!progress.completed_at,
            total_lessons: total
        });
    } catch (err) {
        console.error('GET /courses/:slug/progress error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/lessons/:id — full lesson with quiz questions and course_slug (authOptional so guests can read)
router.get('/lessons/:id', authOptional, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id, 10);
        if (isNaN(lessonId)) {
            return res.status(400).json({ success: false, error: 'Invalid lesson id' });
        }

        const lessonResult = await pool.query(`
            SELECT l.*, c.slug AS course_slug
            FROM lessons l
            JOIN modules m ON m.id = l.module_id
            JOIN courses c ON c.id = m.course_id
            WHERE l.id = $1 AND l.is_published = true
        `, [lessonId]);
        if (!lessonResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Lesson not found' });
        }
        const lesson = lessonResult.rows[0];

        const quizResult = await pool.query(
            'SELECT id, question, options, correct_option, explanation FROM quiz_questions WHERE lesson_id = $1 ORDER BY id',
            [lessonId]
        );
        lesson.quiz_questions = quizResult.rows;

        res.json({ success: true, lesson });
    } catch (err) {
        console.error('GET /lessons/:id error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/lessons/:id/complete — mark lesson complete, update progress
router.post('/lessons/:id/complete', authRequired, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { quiz_score } = req.body;

        if (isNaN(lessonId)) {
            return res.status(400).json({ success: false, error: 'Invalid lesson id' });
        }

        const lessonResult = await pool.query(
            'SELECT l.id, m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = $1',
            [lessonId]
        );
        if (!lessonResult.rows.length) {
            return res.status(404).json({ success: false, error: 'Lesson not found' });
        }
        const { course_id } = lessonResult.rows[0];

        // Upsert user_lessons
        await pool.query(`
            INSERT INTO user_lessons (user_id, lesson_id, completed, quiz_score, completed_at)
            VALUES ($1, $2, true, $3, NOW())
            ON CONFLICT (user_id, lesson_id) DO UPDATE
            SET completed = true, quiz_score = $3, completed_at = NOW()
        `, [userId, lessonId, quiz_score || 0]);

        // Check if all course lessons are complete
        const [totalResult, doneResult] = await Promise.all([
            pool.query(`
                SELECT COUNT(l.id)::int AS total FROM lessons l
                JOIN modules m ON m.id = l.module_id
                WHERE m.course_id = $1 AND l.is_published = true
            `, [course_id]),
            pool.query(`
                SELECT COUNT(ul.id)::int AS done FROM user_lessons ul
                JOIN lessons l ON l.id = ul.lesson_id
                JOIN modules m ON m.id = l.module_id
                WHERE ul.user_id = $1 AND m.course_id = $2 AND ul.completed = true
            `, [userId, course_id])
        ]);

        const total = totalResult.rows[0].total;
        const done = doneResult.rows[0].done;
        const allDone = total > 0 && done >= total;

        // Upsert user_course_progress — only set completed_at when finishing
        await pool.query(`
            INSERT INTO user_course_progress (user_id, course_id, last_lesson_id, completed_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, course_id) DO UPDATE
            SET last_lesson_id = $3,
                completed_at = CASE WHEN $4 IS NOT NULL THEN $4 ELSE user_course_progress.completed_at END
        `, [userId, course_id, lessonId, allDone ? new Date() : null]);

        res.json({ ok: true });
    } catch (err) {
        console.error('POST /lessons/:id/complete error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/user/stats — learning statistics for the authenticated user
router.get('/user/stats', authRequired, async (req, res) => {
    try {
        const userId = req.user.id;

        const [totalResult, weekResult, avgResult, inProgressResult, completedResult, lastLessonResult] = await Promise.all([
            pool.query(
                'SELECT COUNT(*)::int AS total FROM user_lessons WHERE user_id = $1 AND completed = true',
                [userId]
            ),
            pool.query(
                `SELECT COUNT(*)::int AS this_week FROM user_lessons
                 WHERE user_id = $1 AND completed = true AND completed_at >= NOW() - INTERVAL '7 days'`,
                [userId]
            ),
            pool.query(
                `SELECT ROUND(AVG(quiz_score))::int AS avg_score FROM user_lessons
                 WHERE user_id = $1 AND completed = true AND quiz_score IS NOT NULL AND quiz_score > 0`,
                [userId]
            ),
            pool.query(
                'SELECT COUNT(*)::int AS in_progress FROM user_course_progress WHERE user_id = $1 AND completed_at IS NULL',
                [userId]
            ),
            pool.query(
                'SELECT COUNT(*)::int AS completed FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL',
                [userId]
            ),
            pool.query(
                'SELECT last_lesson_id FROM user_course_progress WHERE user_id = $1 AND last_lesson_id IS NOT NULL LIMIT 1',
                [userId]
            )
        ]);

        res.json({
            success: true,
            lessons_completed_total: totalResult.rows[0].total,
            lessons_completed_this_week: weekResult.rows[0].this_week,
            average_quiz_score: avgResult.rows[0].avg_score || 0,
            courses_in_progress: inProgressResult.rows[0].in_progress,
            courses_completed: completedResult.rows[0].completed,
            last_lesson_id: lastLessonResult.rows[0] ? lastLessonResult.rows[0].last_lesson_id : null
        });
    } catch (err) {
        console.error('GET /user/stats error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
