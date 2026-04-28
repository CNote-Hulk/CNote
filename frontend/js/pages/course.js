import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

if (!slug) window.location.href = 'invata.html';

// Access control: non-starter courses require login
const _token = localStorage.getItem('cn_token');
if (slug !== 'starter-guide' && !_token) {
    window.location.href = 'login.html';
}

let completedIds = new Set();
let allLessons = [];

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchCourse() {
    const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(slug)}`);
    if (!res.ok) { window.location.href = 'invata.html'; return null; }
    const data = await res.json();
    return data.course;
}

async function fetchProgress() {
    if (!_token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(slug)}/progress`, {
            headers: { 'Authorization': 'Bearer ' + _token }
        });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

function renderHeader(course, progress) {
    document.title = `${course.title} — Console Notebook`;
    document.querySelector('.crs-icon').textContent = course.icon || '📚';
    document.querySelector('.crs-title').textContent = course.title;
    document.querySelector('.crs-description').textContent = course.description || '';
    document.querySelector('.crs-badge').textContent = course.difficulty || '';
}

function renderHeroStats(course, progress) {
    const inner = document.querySelector('.crs-hero__inner');
    if (!inner) return;

    const total = allLessons.length;
    const completedArr = progress ? (progress.completed_lesson_ids || []) : [];
    const completed = completedArr.length;
    const chapters = (course.modules || []).length;
    const totalMins = total * 5;
    const timeStr = totalMins >= 60 ? `~${Math.round(totalMins / 60)}h` : `~${totalMins}m`;

    const statsEl = document.createElement('div');
    statsEl.className = 'crs-hero-stats';
    statsEl.innerHTML = `
        <div class="crs-hero-stat"><span class="crs-hero-stat-val">${completed}</span><span class="crs-hero-stat-label">Completed</span></div>
        <div class="crs-hero-stat"><span class="crs-hero-stat-val">${total}</span><span class="crs-hero-stat-label">Lessons</span></div>
        <div class="crs-hero-stat"><span class="crs-hero-stat-val">${timeStr}</span><span class="crs-hero-stat-label">Total Time</span></div>
        <div class="crs-hero-stat"><span class="crs-hero-stat-val">${chapters}</span><span class="crs-hero-stat-label">Chapters</span></div>
    `;

    const lastId = progress && progress.last_lesson_id;
    const isCourseCompleted = progress && progress.course_completed;
    let resumeHref = '#';
    let resumeLabel = '▶ Start Course';
    if (allLessons.length > 0) {
        if (isCourseCompleted) {
            resumeLabel = '✓ Completed';
        } else if (lastId) {
            resumeHref = `lesson.html?id=${lastId}&slug=${encodeURIComponent(slug)}`;
            resumeLabel = '▶ Resume Course';
        } else {
            resumeHref = `lesson.html?id=${allLessons[0].id}&slug=${encodeURIComponent(slug)}`;
        }
    }

    const btnsEl = document.createElement('div');
    btnsEl.className = 'crs-hero-actions';
    btnsEl.innerHTML = `
        <a href="${resumeHref}" class="crs-hero-btn crs-hero-btn--primary">${resumeLabel}</a>
        <a href="#" class="crs-hero-btn crs-hero-btn--outline">View Certificate</a>
    `;

    const body = inner.querySelector('.crs-hero__body');
    if (body) {
        body.after(btnsEl);
        btnsEl.after(statsEl);
    }

    // Populate hero progress card (right column)
    const progressCard = document.getElementById('crs-hero-progress');
    if (progressCard) {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const stepsHTML = (course.modules || []).map((mod, i) => {
            const modLessons = mod.lessons || [];
            const doneMod = modLessons.filter(l => completedIds.has(Number(l.id))).length;
            const isDone = doneMod === modLessons.length && modLessons.length > 0;
            const isActive = doneMod > 0 && !isDone;
            const dotClass = isDone ? 'crs-hero-step-dot--done' : isActive ? 'crs-hero-step-dot--active' : '';
            return `<div class="crs-hero-progress-step">
                <div class="crs-hero-step-dot ${dotClass}">${isDone ? '✓' : i + 1}</div>
                <span>${esc(mod.title)}</span>
            </div>`;
        }).join('');

        progressCard.innerHTML = `
            <div class="crs-hero-progress-card">
                <div class="crs-hero-progress-card__header">
                    <span class="crs-hero-progress-card__label">Your Progress</span>
                    <span class="crs-hero-progress-card__pct">${pct}%</span>
                </div>
                <div class="crs-hero-progress-card__track">
                    <div class="crs-hero-progress-card__fill" style="width:${pct}%"></div>
                </div>
                <div class="crs-hero-progress-steps">${stepsHTML}</div>
            </div>
        `;
    }
}

function buildCourseLayout(course, progress) {
    const container = document.querySelector('.crs-container');
    if (!container) return;

    const main = document.createElement('div');
    main.className = 'crs-main';
    while (container.firstChild) main.appendChild(container.firstChild);
    container.appendChild(main);

    const total = allLessons.length;
    const completedArr = progress ? (progress.completed_lesson_ids || []) : [];
    const completed = completedArr.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    let instructorName = 'CNote';
    if (_token) {
        try {
            const payload = JSON.parse(atob(_token.split('.')[1]));
            instructorName = payload.username || instructorName;
        } catch {}
    }

    const lastId = progress && progress.last_lesson_id;
    const isCourseCompleted = progress && progress.course_completed;
    let resumeHref = allLessons.length > 0 ? `lesson.html?id=${allLessons[0].id}&slug=${encodeURIComponent(slug)}` : '#';
    let resumeLabel = 'Start Course';
    if (lastId && !isCourseCompleted) {
        resumeHref = `lesson.html?id=${lastId}&slug=${encodeURIComponent(slug)}`;
        resumeLabel = 'Resume Course';
    } else if (isCourseCompleted) {
        resumeLabel = 'Review Course';
    }

    const learnPoints = Array.isArray(course.learn_points) ? course.learn_points : [];
    const learnHTML = learnPoints.length > 0
        ? learnPoints.map(pt => `<li class="crs-sb-learn__item"><span class="crs-sb-learn__check">✓</span><span>${esc(pt)}</span></li>`).join('')
        : '';

    const sidebar = document.createElement('aside');
    sidebar.className = 'crs-sidebar';
    sidebar.innerHTML = `
        <div class="crs-sb-progress">
            <span class="crs-sb-label">Progress</span>
            <span class="crs-sb-progress__pct">${pct}%</span>
            <p class="crs-sb-progress__meta">${completed} of ${total} completed</p>
            <div class="crs-sb-progress__track"><div class="crs-sb-progress__fill" style="width:${pct}%"></div></div>
            <a href="${resumeHref}" class="crs-sb-progress__btn">${resumeLabel}</a>
        </div>
        <div class="crs-sb-instructor">
            <span class="crs-sb-label">Instructor</span>
            <div class="crs-sb-instructor__body">
                <div class="crs-sb-instructor__avatar">${esc(instructorName.charAt(0).toUpperCase())}</div>
                <div class="crs-sb-instructor__info">
                    <p class="crs-sb-instructor__name">${esc(instructorName)}</p>
                    <p class="crs-sb-instructor__role">Console Notebook</p>
                </div>
            </div>
        </div>
        ${learnHTML ? `<div class="crs-sb-learn"><span class="crs-sb-label">What You'll Learn</span><ul class="crs-sb-learn__list">${learnHTML}</ul></div>` : ''}
    `;

    container.appendChild(sidebar);
}

function buildLessonIcon(state) {
    if (state === 'done') {
        return `<span class="crs-lesson-icon crs-lesson-icon--done" aria-label="Completed">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>`;
    }
    if (state === 'next') {
        return `<span class="crs-lesson-icon crs-lesson-icon--next" aria-label="Up next">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>`;
    }
    if (state === 'locked') {
        return `<span class="crs-lesson-icon crs-lesson-icon--locked" aria-label="Locked">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </span>`;
    }
    return `<span class="crs-lesson-icon crs-lesson-icon--open" aria-label="Not started">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>
    </span>`;
}

function renderModules(course) {
    const list = document.querySelector('.crs-module-list');
    list.innerHTML = '';
    allLessons = [];

    (course.modules || []).forEach(mod => {
        (mod.lessons || []).forEach(l => allLessons.push(l));
    });

    const nextLesson = allLessons.find(l => !completedIds.has(Number(l.id)));
    const nextId = nextLesson ? Number(nextLesson.id) : null;
    let nextModuleOpenIdx = -1;

    const isGuest = !_token;

    (course.modules || []).forEach((mod, modIdx) => {
        const lessons = mod.lessons || [];
        const isModFree = isGuest ? (modIdx === 0) : true;

        const div = document.createElement('div');
        const hasNext = lessons.some(l => Number(l.id) === nextId);
        if (hasNext) nextModuleOpenIdx = modIdx;
        div.className = 'crs-module';

        const doneInMod = lessons.filter(l => completedIds.has(Number(l.id))).length;
        const timeMins = lessons.length * 5;
        const timeStr = timeMins >= 60 ? `${Math.floor(timeMins / 60)}h ${timeMins % 60 > 0 ? timeMins % 60 + 'm' : ''}` : `${timeMins}m`;
        const badgeHTML = isGuest
            ? `<span class="crs-module-badge ${isModFree ? 'crs-module-badge--free' : 'crs-module-badge--pro'}">${isModFree ? 'FREE' : 'PRO'}</span>`
            : '';

        const header = document.createElement('div');
        header.className = 'crs-module-header';
        const isModDone = doneInMod === lessons.length && lessons.length > 0;
        header.innerHTML = `
            <span class="crs-module-num${isModDone ? ' crs-module-num--done' : ''}">${isModDone ? '✓' : modIdx + 1}</span>
            <div class="crs-module-info">
                <span class="crs-module-title">${esc(mod.title)}</span>
                <span class="crs-module-meta">${doneInMod}/${lessons.length} lessons · ${timeStr}</span>
            </div>
            ${badgeHTML}
            <svg class="crs-module-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        `;
        header.addEventListener('click', () => div.classList.toggle('open'));

        const lessonsDiv = document.createElement('div');
        lessonsDiv.className = 'crs-module-lessons';

        lessons.forEach(lesson => {
            const done = completedIds.has(Number(lesson.id));
            const isNext = Number(lesson.id) === nextId;
            const isProLocked = isGuest && !isModFree;
            const state = isProLocked ? 'locked' : done ? 'done' : isNext ? 'next' : nextId ? 'locked' : 'open';

            const row = document.createElement('a');
            row.className = 'crs-lesson-row' + (isNext ? ' crs-lesson-row--next' : '') + (isProLocked ? ' crs-lesson-row--locked' : '');

            if (isProLocked) {
                row.href = 'login.html';
            } else {
                row.href = `lesson.html?id=${lesson.id}&slug=${encodeURIComponent(slug)}`;
            }

            row.innerHTML = buildLessonIcon(state) + `<span class="crs-lesson-title">${esc(lesson.title)}</span><span class="crs-lesson-time">5m</span>`;
            lessonsDiv.appendChild(row);
        });

        div.appendChild(header);
        div.appendChild(lessonsDiv);
        list.appendChild(div);
    });

    const modules = list.querySelectorAll('.crs-module');
    const openIdx = nextModuleOpenIdx >= 0 ? nextModuleOpenIdx : 0;
    if (modules[openIdx]) modules[openIdx].classList.add('open');
}

function initTabs() {
    const btns = document.querySelectorAll('.crs-tab-btn');
    const panels = document.querySelectorAll('.crs-tab-panel');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
}

async function init() {
    initTabs();

    // Scroll progress bar
    const sp = document.getElementById('crs-sp');
    if (sp) {
        window.addEventListener('scroll', () => {
            const h = document.documentElement;
            const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) || 0;
            sp.style.transform = `scaleX(${pct})`;
        }, { passive: true });
    }

    const [course, progress] = await Promise.all([fetchCourse(), fetchProgress()]);
    if (!course) return;

    if (progress && progress.completed_lesson_ids) {
        completedIds = new Set(progress.completed_lesson_ids.map(Number));
    }

    // renderModules first — populates allLessons
    renderModules(course);
    renderHeader(course, progress);
    renderHeroStats(course, progress);
    buildCourseLayout(course, progress);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
