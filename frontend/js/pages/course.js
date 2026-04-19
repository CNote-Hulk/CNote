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
    const token = localStorage.getItem('cn_token');
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(slug)}/progress`, {
            headers: { 'Authorization': 'Bearer ' + token }
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

    const progressWrap = document.querySelector('.crs-progress-wrap');
    if (!_token) {
        // Guest on starter-guide: hide progress bar
        if (progressWrap) progressWrap.style.display = 'none';
        return;
    }

    const total = allLessons.length;
    const completedArr = progress ? (progress.completed_lesson_ids || []) : [];
    const completed = completedArr.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.querySelector('.crs-progress-fill').style.width = pct + '%';
    document.querySelector('.crs-progress-text').textContent = `${completed} / ${total} lessons`;

    // "Continue" button — links to last visited lesson or first uncompleted
    const continueBtn = document.querySelector('.crs-continue-btn');
    if (continueBtn && total > 0) {
        if (progress && progress.course_completed) {
            continueBtn.textContent = '✓ Completed';
            continueBtn.classList.add('crs-continue-btn--done');
            continueBtn.href = '#';
        } else {
            const lastId = progress && progress.last_lesson_id;
            if (lastId) {
                continueBtn.href = `lesson.html?id=${lastId}&slug=${encodeURIComponent(slug)}`;
                continueBtn.textContent = 'Continue →';
                continueBtn.style.display = 'inline-flex';
            } else if (allLessons.length > 0) {
                continueBtn.href = `lesson.html?id=${allLessons[0].id}&slug=${encodeURIComponent(slug)}`;
                continueBtn.textContent = 'Start →';
                continueBtn.style.display = 'inline-flex';
            }
        }
    }
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

    // Build flat list first to determine next lesson
    (course.modules || []).forEach(mod => {
        (mod.lessons || []).forEach(l => allLessons.push(l));
    });

    // The "next" lesson is the first one not yet completed
    const nextLesson = allLessons.find(l => !completedIds.has(l.id));
    const nextId = nextLesson ? nextLesson.id : null;
    let nextModuleOpenIdx = -1;

    (course.modules || []).forEach((mod, modIdx) => {
        const lessons = mod.lessons || [];

        const div = document.createElement('div');
        // Open the module that contains the next lesson, or the first module
        const hasNext = lessons.some(l => l.id === nextId);
        if (hasNext) nextModuleOpenIdx = modIdx;
        div.className = 'crs-module';

        const doneInMod = lessons.filter(l => completedIds.has(l.id)).length;
        const header = document.createElement('div');
        header.className = 'crs-module-header';
        header.innerHTML = `
            <span class="crs-module-title">${esc(mod.title)}</span>
            <span class="crs-module-count">${doneInMod}/${lessons.length}</span>
            <svg class="crs-module-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        `;
        header.addEventListener('click', () => div.classList.toggle('open'));

        const lessonsDiv = document.createElement('div');
        lessonsDiv.className = 'crs-module-lessons';

        lessons.forEach(lesson => {
            const done = completedIds.has(lesson.id);
            const isNext = lesson.id === nextId;
            const state = done ? 'done' : isNext ? 'next' : nextId ? 'locked' : 'open';
            const row = document.createElement('a');
            row.className = 'crs-lesson-row' + (isNext ? ' crs-lesson-row--next' : '');
            row.href = `lesson.html?id=${lesson.id}&slug=${encodeURIComponent(slug)}`;
            row.innerHTML = buildLessonIcon(state) + `<span class="crs-lesson-title">${esc(lesson.title)}</span>`;
            lessonsDiv.appendChild(row);
        });

        div.appendChild(header);
        div.appendChild(lessonsDiv);
        list.appendChild(div);
    });

    // Open the relevant module
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

    const [course, progress] = await Promise.all([fetchCourse(), fetchProgress()]);
    if (!course) return;

    if (progress && progress.completed_lesson_ids) {
        completedIds = new Set(progress.completed_lesson_ids.map(Number));
    }

    renderHeader(course, progress);
    renderModules(course);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
