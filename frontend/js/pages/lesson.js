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

    // Update header meta course name
    const metaItem = document.querySelector('.lsn-header-meta-item');
    if (metaItem && course) {
        metaItem.lastChild.textContent = course.title;
    }

    // Progress indicator (lesson X of Y)
    if (course) {
        const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
        const idx = allLessons.findIndex(l => l.id === lesson.id);
        if (idx !== -1) {
            const indicator = document.querySelector('.lsn-progress-indicator');
            if (indicator) indicator.textContent = `${idx + 1} / ${allLessons.length}`;

            // Store next lesson id for navigation
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
        // Last lesson in course — show completion screen
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

async function init() {
    const token = localStorage.getItem('cn_token');

    // Fetch lesson first — we need course_slug from the response for access control
    const lesson = await fetchLesson();

    if (!lesson) {
        document.querySelector('.lsn-title').textContent = 'Lesson not found';
        document.querySelector('.lsn-content').innerHTML = '<p class="lsn-empty-content">This lesson could not be loaded.</p>';
        return;
    }

    // Access control: if this lesson belongs to a non-starter course, require login
    const resolvedSlug = lesson.course_slug || courseSlug;
    if (resolvedSlug !== 'starter-guide' && !token) {
        window.location.href = 'login.html';
        return;
    }

    // Persist slug for next-lesson navigation
    if (resolvedSlug) {
        courseSlug = resolvedSlug;
        sessionStorage.setItem('lsn_course_slug', resolvedSlug);
    }

    // Guest on starter-guide: show top banner, show bottom progress banner
    if (!token) {
        const topBanner = document.querySelector('.lsn-guest-banner');
        if (topBanner) topBanner.style.display = 'flex';

        const bottomBanner = document.querySelector('.lsn-bottom-banner');
        if (bottomBanner) bottomBanner.style.display = 'flex';
    }

    lessonData = lesson;
    renderLesson(lesson);

    // Fetch course structure in parallel with rendering
    const course = await fetchCourseStructure();
    renderTopbar(lesson, course);
    renderQuiz(lesson.quiz_questions || []);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
