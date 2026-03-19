/**
 * Global Chat Script (community.html)
 * Real-time global chat with polling, message rendering,
 * cooldown-based rate limiting, and character counter.
 */
import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

const POLL_INTERVAL = 5000;
const COOLDOWN_MS = 3000;
const AVATAR_COLORS = ['#5B8CFF', '#43B581', '#9B59B6', '#FF6B6B', '#F0A830'];

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
let lastMsgUser = '';
let lastMsgDate = '';

// Show form or login notice
if (user) {
    formEl.hidden = false;
    charCount.hidden = false;
} else {
    loginNotice.hidden = false;
}

// Character counter + auto-resize textarea
inputEl.addEventListener('input', () => {
    charCurrent.textContent = inputEl.value.length;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

// Enter to send, Shift+Enter for new line
inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        formEl.requestSubmit();
    }
});

/** Escape HTML special characters */
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Get deterministic color for a username */
function getUserColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Get 2-letter uppercase initials */
function getInitials(username) {
    return username.slice(0, 2).toUpperCase();
}

/** Format timestamp as HH:MM */
function formatTimeShort(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Get date label for dividers */
function getDateLabel(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (msgDate.getTime() === today.getTime()) return 'Today';
    if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Render a single chat message DOM element */
function renderMessage(msg, grouped) {
    const div = document.createElement('div');
    const color = getUserColor(msg.user.username);
    const time = formatTimeShort(msg.created_at);

    if (grouped) {
        div.className = 'chat-msg chat-msg--grouped chat-msg--new';
        div.dataset.id = msg.id;
        div.dataset.user = msg.user.username;
        div.innerHTML = `
            <span class="chat-msg__time-hover">${time}</span>
            <div class="chat-msg__text">${escapeHtml(msg.message)}</div>`;
    } else {
        div.className = 'chat-msg chat-msg--new';
        div.dataset.id = msg.id;
        div.dataset.user = msg.user.username;
        const avatarInner = msg.user.avatar
            ? `<img src="${escapeHtml(msg.user.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${getInitials(msg.user.username)}</span>`
            : getInitials(msg.user.username);
        div.innerHTML = `
            <div class="chat-msg__avatar" style="background:${color}">${avatarInner}</div>
            <div class="chat-msg__body">
                <div class="chat-msg__header">
                    <a href="/user/${encodeURIComponent(msg.user.username)}" class="chat-msg__name" style="color:${color}">${escapeHtml(msg.user.username)}</a>
                    <span class="chat-msg__time">${time}</span>
                </div>
                <div class="chat-msg__text">${escapeHtml(msg.message)}</div>
            </div>`;
    }
    return div;
}

/** Append a message with date divider + grouping logic */
function appendMessage(msg) {
    const dateLabel = getDateLabel(msg.created_at);
    if (dateLabel !== lastMsgDate) {
        const divider = document.createElement('div');
        divider.className = 'chat-date-divider';
        divider.innerHTML = `<span>${dateLabel}</span>`;
        messagesEl.appendChild(divider);
        lastMsgDate = dateLabel;
        lastMsgUser = '';
    }
    const grouped = msg.user.username === lastMsgUser;
    messagesEl.appendChild(renderMessage(msg, grouped));
    lastMsgUser = msg.user.username;
}

/** Show the empty state */
function showEmptyState() {
    loadingEl.innerHTML = `
        <div class="chat-empty-state">
            <div class="chat-empty-state__circle"><span>💬</span></div>
            <div class="chat-empty-state__title">No messages yet</div>
            <div class="chat-empty-state__subtitle">Be the first to start the conversation!</div>
            <button class="chat-empty-state__btn" type="button">Write the first message →</button>
        </div>`;
    loadingEl.hidden = false;
    loadingEl.querySelector('.chat-empty-state__btn')?.addEventListener('click', () => inputEl.focus());
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
                showEmptyState();
                return;
            }

            // Only append new messages (after lastMessageId)
            const newMessages = data.messages.filter(m => m.id > lastMessageId);
            if (newMessages.length > 0) {
                newMessages.forEach(appendMessage);
                lastMessageId = newMessages[newMessages.length - 1].id;
                scrollToBottom();
            }
        }
    } catch {
        // On error, show empty state instead of stuck spinner
        if (loadingEl && !loadingEl.hidden && !loadingEl.querySelector('.chat-empty-state')) {
            showEmptyState();
        }
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
            appendMessage(data.message);
            lastMessageId = Math.max(lastMessageId, data.message.id);
            inputEl.value = '';
            inputEl.style.height = 'auto';
            charCurrent.textContent = '0';
            scrollToBottom();
            window.dispatchEvent(new CustomEvent('cn:message-sent'));
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

// Timeout fallback — if first load fails or hangs, show empty state after 5s
setTimeout(() => {
    if (loadingEl && !loadingEl.hidden && !loadingEl.querySelector('.chat-empty-state')) {
        showEmptyState();
    }
}, 5000);
