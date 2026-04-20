import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('id');
let courseSlug = params.get('slug') || sessionStorage.getItem('lsn_course_slug') || '';

if (!lessonId) window.location.href = 'invata.html';

let lessonData = null;
let quizAnswers = {};

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────
   EXISTING DATA FETCHERS
───────────────────────────────────── */
async function fetchLesson() {
    const token = localStorage.getItem('cn_token');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
        const res = await fetch(`${API_BASE_URL}/lessons/${encodeURIComponent(lessonId)}`, { headers });
        if (!res.ok) return null;
        const data = await res.json();
        return data.lesson;
    } catch { return null; }
}

async function fetchCourseStructure() {
    if (!courseSlug) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(courseSlug)}`);
        if (!res.ok) return null;
        return (await res.json()).course;
    } catch { return null; }
}

/* ─────────────────────────────────────
   EXISTING RENDERERS (unchanged)
───────────────────────────────────── */
function renderTopbar(lesson, course) {
    const crsCurrent = document.querySelector('.lsn-breadcrumb-current');
    const crsLink = document.querySelector('.lsn-breadcrumb-course');

    if (course) {
        crsLink.textContent = course.title;
        crsLink.href = `course.html?slug=${encodeURIComponent(courseSlug)}`;
    } else {
        crsLink.textContent = 'Course';
        crsLink.href = courseSlug ? `course.html?slug=${encodeURIComponent(courseSlug)}` : 'invata.html';
    }

    if (crsCurrent) crsCurrent.textContent = lesson.title;

    const metaItem = document.querySelector('.lsn-header-meta-item');
    if (metaItem && course) {
        metaItem.lastChild.textContent = course.title;
    }

    if (course) {
        const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
        const idx = allLessons.findIndex(l => l.id === lesson.id);
        if (idx !== -1) {
            const indicator = document.querySelector('.lsn-progress-indicator');
            if (indicator) indicator.textContent = `${idx + 1} / ${allLessons.length}`;

            const next = allLessons[idx + 1];
            if (next) window._lsnNextId = next.id;
        }
    }
}

function renderLesson(lesson) {
    document.title = `${lesson.title} — Console Notebook`;
    document.querySelector('.lsn-title').textContent = lesson.title;

    const content = document.querySelector('.lsn-content');
    if (lesson.content_html && lesson.content_html.trim()) {
        content.innerHTML = lesson.content_html;
    } else {
        content.innerHTML = '<p class="lsn-empty-content">Lesson content coming soon.</p>';
    }
}

function renderQuiz(questions) {
    const container = document.querySelector('.lsn-quiz');
    container.innerHTML = '';

    if (!questions || !questions.length) {
        const noQuiz = document.createElement('div');
        noQuiz.className = 'lsn-no-quiz';
        const btn = document.createElement('button');
        btn.className = 'lsn-btn-next';
        btn.textContent = 'Complete Lesson →';
        btn.addEventListener('click', () => completeAndNavigate(0));
        noQuiz.appendChild(btn);
        container.appendChild(noQuiz);
        return;
    }

    const header = document.createElement('div');
    header.className = 'lsn-quiz-header';
    const title = document.createElement('h2');
    title.className = 'lsn-quiz-title';
    title.textContent = 'Quiz';
    const badge = document.createElement('span');
    badge.className = 'lsn-quiz-badge';
    badge.textContent = `${questions.length} question${questions.length !== 1 ? 's' : ''}`;
    header.appendChild(title);
    header.appendChild(badge);
    container.appendChild(header);

    questions.forEach((q, qIdx) => {
        const card = document.createElement('div');
        card.className = 'lsn-quiz-card';
        card.dataset.qid = q.id;
        card.dataset.correct = q.correct_option;
        card.dataset.total = questions.length;

        const options = Array.isArray(q.options) ? q.options : Object.values(q.options);

        const label = document.createElement('div');
        label.className = 'lsn-quiz-q-label';
        label.textContent = `Question ${qIdx + 1} of ${questions.length}`;

        const question = document.createElement('p');
        question.className = 'lsn-quiz-question';
        question.textContent = q.question;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'lsn-quiz-options';

        options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'lsn-quiz-option';
            btn.dataset.idx = i;
            btn.textContent = String(opt);
            btn.addEventListener('click', () => handleAnswer(btn, card, q, questions.length));
            optionsDiv.appendChild(btn);
        });

        card.appendChild(label);
        card.appendChild(question);
        card.appendChild(optionsDiv);

        if (q.explanation) {
            const explanation = document.createElement('div');
            explanation.className = 'lsn-quiz-explanation';
            explanation.textContent = q.explanation;
            explanation.style.display = 'none';
            card.appendChild(explanation);
        }

        container.appendChild(card);
    });
}

function handleAnswer(btn, card, question, totalQuestions) {
    if (card.dataset.answered) return;
    card.dataset.answered = '1';

    const chosen = parseInt(btn.dataset.idx, 10);
    const correct = parseInt(card.dataset.correct, 10);
    const isCorrect = chosen === correct;
    quizAnswers[question.id] = { chosen, correct, isCorrect };

    card.querySelectorAll('.lsn-quiz-option').forEach((b, i) => {
        b.disabled = true;
        if (i === correct) b.classList.add('correct');
        if (i === chosen && !isCorrect) b.classList.add('selected-wrong');
    });

    const explanation = card.querySelector('.lsn-quiz-explanation');
    if (explanation) explanation.style.display = 'block';

    const answeredCount = Object.keys(quizAnswers).length;
    if (answeredCount >= totalQuestions) {
        showResult(totalQuestions);
    }
}

function showResult(totalQuestions) {
    const correctCount = Object.values(quizAnswers).filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const container = document.querySelector('.lsn-quiz');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'lsn-quiz-result';

    const scoreEl = document.createElement('div');
    scoreEl.className = 'lsn-quiz-score';
    scoreEl.textContent = `${score}%`;

    const labelEl = document.createElement('p');
    labelEl.className = 'lsn-quiz-score-label';
    labelEl.textContent = `${correctCount} out of ${totalQuestions} correct`;

    const isLastLesson = !window._lsnNextId;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'lsn-btn-next';
    nextBtn.textContent = isLastLesson ? 'Complete Course →' : 'Next Lesson →';
    nextBtn.addEventListener('click', () => completeAndNavigate(score));

    resultDiv.appendChild(scoreEl);
    resultDiv.appendChild(labelEl);
    resultDiv.appendChild(nextBtn);
    container.appendChild(resultDiv);
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function completeAndNavigate(score) {
    const token = localStorage.getItem('cn_token');
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/lessons/${encodeURIComponent(lessonId)}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ quiz_score: score })
            });
        } catch { /* network error — ignore */ }
    }

    const nextId = window._lsnNextId;
    if (nextId) {
        window.location.href = `lesson.html?id=${nextId}&slug=${encodeURIComponent(courseSlug)}`;
    } else {
        showCourseComplete();
    }
}

function showCourseComplete() {
    const container = document.querySelector('.lsn-quiz');
    container.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'lsn-course-complete';
    screen.innerHTML = `
        <div class="lsn-course-complete__trophy">🏆</div>
        <h2 class="lsn-course-complete__title">Course Complete!</h2>
        <p class="lsn-course-complete__sub">You've finished the <strong>Console Starter Guide</strong>. Great work!</p>
        <div class="lsn-course-complete__actions">
            <a href="course.html?slug=${encodeURIComponent(courseSlug)}" class="lsn-btn-next">View Course →</a>
            <a href="invata.html" class="lsn-btn-secondary">Explore More Courses</a>
        </div>
    `;
    container.appendChild(screen);
    screen.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ─────────────────────────────────────
   NEW: TWO-COLUMN LAYOUT
   Wraps existing .lsn-container children
   into .lsn-main and adds .lsn-sidebar
───────────────────────────────────── */
function buildTwoColumnLayout() {
    const container = document.querySelector('.lsn-container');
    if (!container || container.querySelector('.lsn-main')) return; // guard

    // Wrap all existing children into .lsn-main
    const main = document.createElement('div');
    main.className = 'lsn-main';
    while (container.firstChild) main.appendChild(container.firstChild);
    container.appendChild(main);

    // Build sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'lsn-sidebar';
    sidebar.innerHTML = `
        <div class="lsn-sb-progress">
            <div class="lsn-sb-progress__label">
                Reading progress
                <span class="lsn-sb-progress__pct" id="lsn-scroll-pct">0%</span>
            </div>
            <div class="lsn-sb-progress__track">
                <div class="lsn-sb-progress__fill" id="lsn-scroll-fill"></div>
            </div>
        </div>
        <div class="lsn-sb-toc" id="lsn-sb-toc">
            <div class="lsn-sb-section-label">In this course</div>
            <div class="lsn-sb-toc__list" id="lsn-toc-list"></div>
        </div>
        <div class="lsn-sb-author">
            <div class="lsn-sb-section-label">Created by</div>
            <div class="lsn-sb-author__card">
                <div class="lsn-sb-author__avatar">CN</div>
                <div class="lsn-sb-author__info">
                    <span class="lsn-sb-author__name">Console Notebook Team</span>
                    <span class="lsn-sb-author__desc">The official Console Notebook course team.</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(sidebar);
}

/* ─────────────────────────────────────
   NEW: SIDEBAR TOC
───────────────────────────────────── */
function renderSidebarTOC(course, completedIds) {
    const tocList = document.getElementById('lsn-toc-list');
    if (!tocList || !course) return;

    const currentId = parseInt(lessonId, 10);
    tocList.innerHTML = '';

    (course.modules || []).forEach(mod => {
        const modDiv = document.createElement('div');
        modDiv.className = 'lsn-toc-module';

        const modLabel = document.createElement('div');
        modLabel.className = 'lsn-toc-module__title';
        modLabel.textContent = mod.title;
        modDiv.appendChild(modLabel);

        (mod.lessons || []).forEach(l => {
            const isDone = completedIds.has(l.id);
            const isCurrent = l.id === currentId;

            const a = document.createElement('a');
            a.href = `lesson.html?id=${l.id}&slug=${encodeURIComponent(courseSlug)}`;
            a.className = 'lsn-toc-lesson'
                + (isCurrent ? ' lsn-toc-lesson--active' : '')
                + (isDone ? ' lsn-toc-lesson--done' : '');

            const iconSpan = document.createElement('span');
            iconSpan.className = 'lsn-toc-lesson__icon';

            if (isDone) {
                iconSpan.className += ' lsn-toc-lesson__icon--done';
                iconSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            } else if (isCurrent) {
                iconSpan.className += ' lsn-toc-lesson__icon--active';
                iconSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            } else {
                iconSpan.className += ' lsn-toc-lesson__icon--open';
                iconSpan.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'lsn-toc-lesson__title';
            titleSpan.textContent = l.title;

            a.appendChild(iconSpan);
            a.appendChild(titleSpan);
            modDiv.appendChild(a);
        });

        tocList.appendChild(modDiv);
    });
}

/* ─────────────────────────────────────
   NEW: SCROLL PROGRESS
───────────────────────────────────── */
function initScrollProgress() {
    const fill = document.getElementById('lsn-scroll-fill');
    const pct = document.getElementById('lsn-scroll-pct');
    if (!fill) return;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
        fill.style.width = progress + '%';
        if (pct) pct.textContent = progress + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* ─────────────────────────────────────
   NEW: COURSE PROGRESS (for TOC)
───────────────────────────────────── */
async function fetchCourseProgress() {
    if (!courseSlug) return null;
    const token = localStorage.getItem('cn_token');
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(courseSlug)}/progress`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

/* ─────────────────────────────────────
   NEW: REACTIONS
───────────────────────────────────── */
async function fetchReactionsData() {
    try {
        const token = localStorage.getItem('cn_token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch(`${API_BASE_URL}/lessons/${lessonId}/reactions`, { headers });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

function renderReactions(data) {
    const main = document.querySelector('.lsn-main');
    if (!main) return;

    const token = localStorage.getItem('cn_token');
    const userReactions = new Set(data ? (data.user_reactions || []) : []);
    const counts = {
        like:    data ? (data.like    || 0) : 0,
        save:    data ? (data.save    || 0) : 0,
        helpful: data ? (data.helpful || 0) : 0
    };

    const bar = document.createElement('div');
    bar.className = 'lsn-reactions';
    bar.id = 'lsn-reactions';

    [
        { type: 'like',    emoji: '👍', label: 'Like'    },
        { type: 'save',    emoji: '🔖', label: 'Save'    },
        { type: 'helpful', emoji: '⭐', label: 'Helpful' }
    ].forEach(({ type, emoji, label }) => {
        const btn = document.createElement('button');
        btn.className = 'lsn-reaction-btn' + (userReactions.has(type) ? ' active' : '');
        btn.dataset.type = type;
        btn.innerHTML = `
            <span class="lsn-reaction-btn__emoji">${emoji}</span>
            <span class="lsn-reaction-btn__label">${label}</span>
            <span class="lsn-reaction-btn__count">${counts[type]}</span>
        `;

        btn.addEventListener('click', async () => {
            if (!token) { window.location.href = 'login.html'; return; }
            const wasActive = btn.classList.contains('active');
            btn.classList.toggle('active');
            const countEl = btn.querySelector('.lsn-reaction-btn__count');
            countEl.textContent = wasActive
                ? Math.max(0, parseInt(countEl.textContent, 10) - 1)
                : parseInt(countEl.textContent, 10) + 1;
            try {
                await fetch(`${API_BASE_URL}/lessons/${lessonId}/react`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ type })
                });
            } catch { /* ignore */ }
        });

        bar.appendChild(btn);
    });

    main.appendChild(bar);
}

/* ─────────────────────────────────────
   NEW: COMMENTS
───────────────────────────────────── */
async function fetchCommentsData() {
    try {
        const token = localStorage.getItem('cn_token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch(`${API_BASE_URL}/lessons/${lessonId}/comments`, { headers });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function buildCommentEl(comment, userCommentLikes) {
    const token = localStorage.getItem('cn_token');
    const el = document.createElement('div');
    el.className = 'lsn-comment';
    el.dataset.id = comment.id;

    const initials = (comment.username || 'U').slice(0, 2).toUpperCase();
    const liked = userCommentLikes.has(comment.id);

    el.innerHTML = `
        <div class="lsn-comment__avatar">${initials}</div>
        <div class="lsn-comment__body">
            <div class="lsn-comment__meta">
                <span class="lsn-comment__author">${esc(comment.username || 'User')}</span>
                <span class="lsn-comment__time">${formatTimeAgo(comment.created_at)}</span>
            </div>
            <p class="lsn-comment__content">${esc(comment.content)}</p>
            <button class="lsn-comment__like${liked ? ' active' : ''}" data-comment-id="${comment.id}">
                ♥ <span class="lsn-comment__like-count">${comment.like_count || 0}</span>
            </button>
        </div>
    `;

    el.querySelector('.lsn-comment__like').addEventListener('click', async () => {
        if (!token) { window.location.href = 'login.html'; return; }
        const likeBtn = el.querySelector('.lsn-comment__like');
        const wasLiked = likeBtn.classList.contains('active');
        likeBtn.classList.toggle('active');
        const countEl = likeBtn.querySelector('.lsn-comment__like-count');
        countEl.textContent = wasLiked
            ? Math.max(0, parseInt(countEl.textContent, 10) - 1)
            : parseInt(countEl.textContent, 10) + 1;
        try {
            await fetch(`${API_BASE_URL}/comments/${comment.id}/like`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
        } catch { /* ignore */ }
    });

    return el;
}

function renderComments(data) {
    const main = document.querySelector('.lsn-main');
    if (!main) return;

    const token = localStorage.getItem('cn_token');
    const comments = data ? (data.comments || []) : [];
    const userCommentLikes = new Set(data ? (data.user_comment_likes || []) : []);

    const section = document.createElement('section');
    section.className = 'lsn-comments';
    section.id = 'lsn-comments';

    const header = document.createElement('div');
    header.className = 'lsn-comments__header';
    header.innerHTML = `
        <h2 class="lsn-comments__title">Comments</h2>
        <span class="lsn-comments__count">${comments.length}</span>
    `;
    section.appendChild(header);

    if (token) {
        const form = document.createElement('div');
        form.className = 'lsn-comment-form';

        const textarea = document.createElement('textarea');
        textarea.className = 'lsn-comment-input';
        textarea.placeholder = 'Share your thoughts…';
        textarea.rows = 3;

        const submitBtn = document.createElement('button');
        submitBtn.className = 'lsn-comment-submit';
        submitBtn.textContent = 'Post comment';

        submitBtn.addEventListener('click', async () => {
            const content = textarea.value.trim();
            if (!content) return;
            submitBtn.disabled = true;
            try {
                const res = await fetch(`${API_BASE_URL}/lessons/${lessonId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ content })
                });
                if (res.ok) {
                    const newData = await res.json();
                    textarea.value = '';
                    const listEl = section.querySelector('.lsn-comments__list');
                    if (listEl && newData.comment) {
                        listEl.prepend(buildCommentEl(newData.comment, new Set()));
                        const countEl = section.querySelector('.lsn-comments__count');
                        if (countEl) countEl.textContent = parseInt(countEl.textContent || '0', 10) + 1;
                    }
                }
            } catch { /* ignore */ }
            submitBtn.disabled = false;
        });

        form.appendChild(textarea);
        form.appendChild(submitBtn);
        section.appendChild(form);
    } else {
        const loginBanner = document.createElement('div');
        loginBanner.className = 'lsn-comment-login';
        loginBanner.innerHTML = `<a href="login.html">Log in</a> to leave a comment.`;
        section.appendChild(loginBanner);
    }

    const list = document.createElement('div');
    list.className = 'lsn-comments__list';
    comments.forEach(c => list.appendChild(buildCommentEl(c, userCommentLikes)));
    section.appendChild(list);

    main.appendChild(section);
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
async function init() {
    const token = localStorage.getItem('cn_token');

    const lesson = await fetchLesson();

    if (!lesson) {
        document.querySelector('.lsn-title').textContent = 'Lesson not found';
        document.querySelector('.lsn-content').innerHTML = '<p class="lsn-empty-content">This lesson could not be loaded.</p>';
        return;
    }

    const resolvedSlug = lesson.course_slug || courseSlug;
    if (resolvedSlug !== 'starter-guide' && !token) {
        window.location.href = 'login.html';
        return;
    }

    if (resolvedSlug) {
        courseSlug = resolvedSlug;
        sessionStorage.setItem('lsn_course_slug', resolvedSlug);
    }

    if (!token) {
        const topBanner = document.querySelector('.lsn-guest-banner');
        if (topBanner) topBanner.style.display = 'flex';

        const bottomBanner = document.querySelector('.lsn-bottom-banner');
        if (bottomBanner) bottomBanner.style.display = 'flex';
    }

    lessonData = lesson;
    renderLesson(lesson);

    const course = await fetchCourseStructure();
    renderTopbar(lesson, course);
    renderQuiz(lesson.quiz_questions || []);

    // ── Two-column layout ──
    buildTwoColumnLayout();

    // ── Fetch sidebar progress + reactions + comments in parallel ──
    const [progressData, reactionsData, commentsData] = await Promise.all([
        fetchCourseProgress(),
        fetchReactionsData(),
        fetchCommentsData()
    ]);

    const completedIds = new Set((progressData?.completed_lesson_ids || []).map(Number));
    if (course) renderSidebarTOC(course, completedIds);
    initScrollProgress();
    renderReactions(reactionsData);
    renderComments(commentsData);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
