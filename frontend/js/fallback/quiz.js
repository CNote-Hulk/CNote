/**
 * Interactive Quiz System
 * Auto-transforms static quiz sections into clickable, scored quizzes.
 * Works as standalone script (no ES module dependency).
 * Detects #quiz section, parses questions from existing HTML, adds interactivity.
 */

(function () {
    'use strict';

    var SESSION_KEY = 'cn_session';
    var PROGRESS_STORAGE_KEY = 'cn_progress';
    var QUIZ_STATS_KEY = 'cn_quiz_stats';
    var LESSON_VISITS_KEY = 'cn_lesson_visits';
    var COURSE_ID = 'inginerie';

    // Prevent double-init
    if (window.__QUIZ_INITIALIZED__) return;

    /** Main quiz initializer — parses quiz HTML, builds interactive elements */
    function initQuiz() {
        const quizSection = document.getElementById('quiz');
        if (!quizSection) return;

        window.__QUIZ_INITIALIZED__ = true;
        console.log('📝 Quiz system initializing...');

        const container = quizSection.querySelector('.container');
        if (!container) return;

        const cards = container.querySelectorAll('.card');
        if (!cards.length) return;

        // ── State ──
        let totalQuestions = 0;
        let answeredCount = 0;
        let correctCount = 0;

        function getCurrentUser() {
            try {
                var session = JSON.parse(localStorage.getItem(SESSION_KEY));
                return session && session.id ? session : null;
            } catch (_) {
                return null;
            }
        }

        function getLessonIdFromPath() {
            var match = window.location.pathname.match(/lectia-(\d+)-(\d+)\.html$/i);
            if (!match) return null;
            var major = parseInt(match[1], 10);
            var minor = parseInt(match[2], 10);
            if (Number.isNaN(major) || Number.isNaN(minor)) return null;
            return (major * 100) + minor;
        }

        function getVisitedLessons(userId) {
            try {
                var allVisits = JSON.parse(localStorage.getItem(LESSON_VISITS_KEY)) || {};
                var userVisits = allVisits[userId] || {};
                var lessons = userVisits[COURSE_ID] || [];
                return Array.isArray(lessons) ? lessons : [];
            } catch (_) {
                return [];
            }
        }

        function saveVisitedLessons(userId, lessons) {
            try {
                var allVisits = JSON.parse(localStorage.getItem(LESSON_VISITS_KEY)) || {};
                if (!allVisits[userId] || typeof allVisits[userId] !== 'object') {
                    allVisits[userId] = {};
                }
                allVisits[userId][COURSE_ID] = lessons;
                localStorage.setItem(LESSON_VISITS_KEY, JSON.stringify(allVisits));
            } catch (_) {
                // noop
            }
        }

        function isQuizCompleted(userId, lessonId) {
            try {
                var allStats = JSON.parse(localStorage.getItem(QUIZ_STATS_KEY)) || {};
                var courseStats = (((allStats[userId] || {})[COURSE_ID]) || {});
                var lessonStats = courseStats[String(lessonId)] || null;
                return !!(lessonStats && Number(lessonStats.attempts || 0) > 0);
            } catch (_) {
                return false;
            }
        }

        function syncLessonProgress(userId, lessonId) {
            if (!userId || !lessonId) return;

            var user = getCurrentUser();
            if (!user || user.id !== userId) return;

            var visitedLessons = getVisitedLessons(userId);
            var hasVisited = visitedLessons.includes(lessonId);
            var hasQuiz = isQuizCompleted(userId, lessonId);

            try {
                var allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)) || {};
                if (!allData[userId] || typeof allData[userId] !== 'object') {
                    allData[userId] = {};
                }

                if (!Array.isArray(allData[userId][COURSE_ID])) {
                    allData[userId][COURSE_ID] = [];
                }

                var lessons = allData[userId][COURSE_ID];
                var alreadyCompleted = lessons.includes(lessonId);
                var shouldComplete = hasVisited && hasQuiz;

                if (shouldComplete && !alreadyCompleted) {
                    lessons.push(lessonId);
                    lessons.sort(function (a, b) { return a - b; });
                    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
                    window.dispatchEvent(new CustomEvent('cn:lesson-completed', {
                        detail: { courseId: COURSE_ID, lessonId: lessonId }
                    }));
                } else if (!shouldComplete && alreadyCompleted) {
                    allData[userId][COURSE_ID] = lessons.filter(function (id) { return id !== lessonId; });
                    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
                }
            } catch (_) {
                // Silent fallback: quiz should still function even if storage fails.
            }
        }

        function markLessonVisited() {
            var user = getCurrentUser();
            var lessonId = getLessonIdFromPath();
            if (!user || !lessonId) return;

            var visited = getVisitedLessons(user.id);
            if (!visited.includes(lessonId)) {
                visited.push(lessonId);
                visited.sort(function (a, b) { return a - b; });
                saveVisitedLessons(user.id, visited);
                window.dispatchEvent(new CustomEvent('cn:lesson-visited', {
                    detail: { courseId: COURSE_ID, lessonId: lessonId }
                }));
            }

            syncLessonProgress(user.id, lessonId);
        }

        function bindNextLessonTracking() {
            var navLinks = document.querySelectorAll('#navigare a.hero-button[href*="lectia-"]');
            if (!navLinks.length) return;

            navLinks.forEach(function (link) {
                link.addEventListener('click', function () {
                    markLessonVisited();
                });
            });
        }

        function storeQuizStats(total, correct) {
            var user = getCurrentUser();
            var lessonId = getLessonIdFromPath();
            if (!user || !lessonId || total <= 0) return;

            var percent = Math.round((correct / total) * 100);

            try {
                var allData = JSON.parse(localStorage.getItem(QUIZ_STATS_KEY)) || {};
                if (!allData[user.id] || typeof allData[user.id] !== 'object') {
                    allData[user.id] = {};
                }
                if (!allData[user.id][COURSE_ID] || typeof allData[user.id][COURSE_ID] !== 'object') {
                    allData[user.id][COURSE_ID] = {};
                }

                var key = String(lessonId);
                var current = allData[user.id][COURSE_ID][key] || {
                    attempts: 0,
                    best_percent: 0,
                    last_percent: 0,
                    first_completed_at: null,
                    last_completed_at: null
                };

                current.attempts = Number(current.attempts || 0) + 1;
                current.last_percent = percent;
                current.best_percent = Math.max(Number(current.best_percent || 0), percent);
                if (!current.first_completed_at) {
                    current.first_completed_at = new Date().toISOString();
                }
                current.last_completed_at = new Date().toISOString();

                allData[user.id][COURSE_ID][key] = current;
                localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(allData));
                syncLessonProgress(user.id, lessonId);

                window.dispatchEvent(new CustomEvent('cn:quiz-finished', {
                    detail: { courseId: COURSE_ID, lessonId: lessonId, percent: percent }
                }));
            } catch (_) {
                // Keep quiz usable even when localStorage fails.
            }
        }

        // Data structure for each question
        const questions = [];

        cards.forEach(function (card) {
            const details = card.querySelector('details');
            if (!details) return;

            // Parse correct answer letter from details content
            // Pattern: <strong>b)</strong> or <strong>b) Text</strong>
            var detailP = details.querySelector('p');
            var detailText = detailP ? detailP.innerHTML : details.innerHTML;
            var match = detailText.match(/<strong>\s*([a-dA-D])\)/);
            if (!match) return;

            var correctLetter = match[1].toLowerCase();
            var explanation = detailP ? detailP.innerHTML : detailText;

            // Get options list
            var optionsList = card.querySelector('ul.specs-list');
            if (!optionsList) return;

            var items = optionsList.querySelectorAll('li');
            if (!items.length) return;

            totalQuestions++;

            // Store question data
            var questionData = {
                card: card,
                correctLetter: correctLetter,
                explanation: explanation,
                items: items
            };
            questions.push(questionData);

            // Remove <details> element
            details.remove();

            // Mark card as quiz question
            card.classList.add('quiz-question-card');

            // Transform list items into interactive options
            items.forEach(function (li) {
                var text = li.textContent.trim();
                var letterMatch = text.match(/^([a-dA-D])\)/);
                if (!letterMatch) return;

                var letter = letterMatch[1].toLowerCase();
                li.classList.add('quiz-option');
                li.setAttribute('data-letter', letter);
                li.setAttribute('role', 'button');
                li.setAttribute('tabindex', '0');

                // Click handler
                li.addEventListener('click', function () {
                    handleAnswer(questionData, li, letter);
                });

                // Keyboard support (Enter / Space)
                li.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAnswer(questionData, li, letter);
                    }
                });
            });
        });

        if (!totalQuestions) return;

        // ── Create Score Bar ──
        var scoreBar = document.createElement('div');
        scoreBar.className = 'quiz-score-bar';
        scoreBar.innerHTML =
            '<p>Scor: <span class="quiz-score-count"><strong>0</strong> / ' + totalQuestions + '</span></p>' +
            '<div class="quiz-progress-track"><div class="quiz-progress-fill"></div></div>';

        // Insert before the first card
        var sectionTitle = container.querySelector('.section-title');
        if (sectionTitle && sectionTitle.nextSibling) {
            container.insertBefore(scoreBar, sectionTitle.nextSibling);
        } else {
            container.insertBefore(scoreBar, container.firstChild);
        }

        // ── Create Retry Button ──
        var retryBtn = document.createElement('button');
        retryBtn.className = 'quiz-retry-btn';
        retryBtn.textContent = '↻ Try again';
        retryBtn.addEventListener('click', resetQuiz);
        container.appendChild(retryBtn);

        console.log('✓ Quiz initialized: ' + totalQuestions + ' questions');

        // ── Handle Answer ──
        function handleAnswer(qData, clickedLi, letter) {
            // Ignore if already answered
            if (qData.card.classList.contains('quiz-answered')) return;

            qData.card.classList.add('quiz-answered');
            answeredCount++;

            var isCorrect = letter === qData.correctLetter;

            if (isCorrect) {
                correctCount++;
                clickedLi.classList.add('quiz-correct');
            } else {
                clickedLi.classList.add('quiz-wrong');
                // Highlight the correct answer
                qData.items.forEach(function (item) {
                    if (item.getAttribute('data-letter') === qData.correctLetter) {
                        item.classList.add('quiz-correct');
                    }
                });
            }

            // Disable all options in this question
            qData.items.forEach(function (item) {
                item.classList.add('quiz-disabled');
            });

            // Show explanation
            var explDiv = document.createElement('div');
            explDiv.className = 'quiz-explanation';
            explDiv.innerHTML = qData.explanation;
            qData.card.appendChild(explDiv);

            // Update score display
            updateScore();

            // Check completion
            if (answeredCount === totalQuestions) {
                showFinalResult();
            }
        }

        // ── Update Score Display ──
        function updateScore() {
            var countEl = scoreBar.querySelector('.quiz-score-count');
            if (countEl) {
                countEl.innerHTML = '<strong>' + correctCount + '</strong> / ' + totalQuestions;
            }

            var fill = scoreBar.querySelector('.quiz-progress-fill');
            if (fill) {
                fill.style.width = Math.round((answeredCount / totalQuestions) * 100) + '%';
            }
        }

        // ── Show Final Result ──
        function showFinalResult() {
            storeQuizStats(totalQuestions, correctCount);
            scoreBar.classList.add('quiz-complete');

            var percent = Math.round((correctCount / totalQuestions) * 100);
            var resultClass, emoji, message;

            if (percent === 100) {
                resultClass = 'quiz-result-great';
                emoji = '🏆';
                message = 'Excellent! All answers correct!';
            } else if (percent >= 60) {
                resultClass = 'quiz-result-good';
                emoji = '👍';
                message = 'Good job! Review the concepts you got wrong.';
            } else {
                resultClass = 'quiz-result-retry';
                emoji = '📖';
                message = 'Re-read the theory section and try again.';
            }

            var resultDiv = document.createElement('div');
            resultDiv.className = 'quiz-final-result ' + resultClass;
            resultDiv.innerHTML =
                '<h3>' + emoji + ' ' + percent + '% — ' + correctCount + ' / ' + totalQuestions + ' corecte</h3>' +
                '<p>' + message + '</p>';

            container.appendChild(resultDiv);

            // Show retry button
            retryBtn.classList.add('visible');
        }

        // ── Reset Quiz ──
        function resetQuiz() {
            answeredCount = 0;
            correctCount = 0;

            // Remove result & retry
            var finalResult = container.querySelector('.quiz-final-result');
            if (finalResult) finalResult.remove();
            retryBtn.classList.remove('visible');

            // Reset score bar
            scoreBar.classList.remove('quiz-complete');
            updateScore();
            var fill = scoreBar.querySelector('.quiz-progress-fill');
            if (fill) fill.style.width = '0%';

            // Reset all questions
            questions.forEach(function (qData) {
                qData.card.classList.remove('quiz-answered');

                // Remove explanation
                var expl = qData.card.querySelector('.quiz-explanation');
                if (expl) expl.remove();

                // Reset options
                qData.items.forEach(function (item) {
                    item.classList.remove('quiz-correct', 'quiz-wrong', 'quiz-disabled');
                });
            });
        }

        bindNextLessonTracking();
        markLessonVisited();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuiz);
    } else {
        initQuiz();
    }
})();
