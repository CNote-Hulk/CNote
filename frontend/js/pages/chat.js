/**
 * Global Chat Script (community.html)
 * Real-time global chat with polling, message rendering,
 * cooldown-based rate limiting, and character counter.
 */
import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

const POLL_INTERVAL = 5000;
const COOLDOWN_MS = 3000;

const messagesEl = document.getElementById('chat-messages');
const loadingEl = document.getElementById('chat-loading');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send-btn');
const loginNotice = document.getElementById('chat-login-notice');
const charCount = document.getElementById('chat-char-count');
const charCurrent = document.getElementById('char-current');

const user = AuthModule.getCurrentUser();
let lastMessageId = 0;
let cooldownActive = false;

// Show form or login notice
if (user) {
    formEl.hidden = false;
    charCount.hidden = false;
} else {
    loginNotice.hidden = false;
}

// Character counter
inputEl.addEventListener('input', () => {
    charCurrent.textContent = inputEl.value.length;
});

/** Escape HTML special characters */
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Format timestamp as relative Romanian time string */
function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'chiar acum';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min în urmă';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ore în urmă';

    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

/** Render a single chat message DOM element */
function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.dataset.id = msg.id;

    const hasAvatar = msg.user.avatar && msg.user.avatar.length > 10;
    const avatarHtml = hasAvatar
        ? `<img src="${escapeHtml(msg.user.avatar)}" alt="" class="chat-message__avatar">`
        : `<span class="chat-message__avatar chat-message__avatar--fallback">👤</span>`;

    div.innerHTML = `
        <div class="chat-message__avatar-wrap">${avatarHtml}</div>
        <div class="chat-message__body">
            <div class="chat-message__header">
                <a href="/user/${encodeURIComponent(msg.user.username)}" class="chat-message__username">${escapeHtml(msg.user.username)}</a>
                <span class="chat-message__time">${formatTime(msg.created_at)}</span>
            </div>
            <div class="chat-message__text">${escapeHtml(msg.message)}</div>
        </div>
    `;
    return div;
}

function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

/** Fetch new messages from API and append to chat */
async function fetchMessages() {
    try {
        const token = localStorage.getItem('cn_token');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(API_BASE_URL + '/chat/messages', {
            headers,
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success && data.messages) {
            loadingEl.hidden = true;

            if (data.messages.length === 0 && messagesEl.children.length <= 1) {
                loadingEl.textContent = 'Niciun mesaj încă. Fii primul care scrie!';
                loadingEl.hidden = false;
                return;
            }

            // Only append new messages (after lastMessageId)
            const newMessages = data.messages.filter(m => m.id > lastMessageId);
            if (newMessages.length > 0) {
                newMessages.forEach(msg => {
                    messagesEl.appendChild(renderMessage(msg));
                });
                lastMessageId = newMessages[newMessages.length - 1].id;
                scrollToBottom();
            }
        }
    } catch {
        loadingEl.textContent = 'Nu s-au putut încărca mesajele.';
    }
}

// Send message
formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || cooldownActive) return;

    sendBtn.disabled = true;
    cooldownActive = true;

    try {
        const token = localStorage.getItem('cn_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(API_BASE_URL + '/chat/messages', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        if (data.success && data.message) {
            // Hide the "no messages" text
            loadingEl.hidden = true;
            messagesEl.appendChild(renderMessage(data.message));
            lastMessageId = Math.max(lastMessageId, data.message.id);
            inputEl.value = '';
            charCurrent.textContent = '0';
            scrollToBottom();
        } else {
            alert(data.error || 'Nu s-a putut trimite mesajul.');
        }
    } catch {
        alert('Nu s-a putut contacta serverul.');
    }

    // Cooldown
    setTimeout(() => {
        cooldownActive = false;
        sendBtn.disabled = false;
    }, COOLDOWN_MS);
});

// Initial load + auto-refresh polling
fetchMessages();
setInterval(fetchMessages, POLL_INTERVAL);
