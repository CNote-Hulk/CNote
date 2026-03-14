const API = '/api';

function headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('cnote_token');
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

export async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers(), ...opts.headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return data;
}

export const api = {
    // Auth
    register: (username, password, email) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, email }) }),
    login: (username, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    me: () => apiFetch('/auth/me'),

    // Messages
    getMessages: (roomId) => apiFetch(`/messages/${encodeURIComponent(roomId)}`),

    // Forum
    getThreads: (c) => apiFetch(`/forum/${c}`),
    getThread: (c, id) => apiFetch(`/forum/${c}/${id}`),
    createThread: (c, body) => apiFetch(`/forum/${c}`, { method: 'POST', body: JSON.stringify(body) }),
    reply: (c, id, body) => apiFetch(`/forum/${c}/${id}/reply`, { method: 'POST', body: JSON.stringify(body) }),
    upvoteThread: (c, id) => apiFetch(`/forum/${c}/${id}/upvote`, { method: 'POST', body: '{}' }),
    upvoteReply: (c, tid, rid) => apiFetch(`/forum/${c}/${tid}/reply/${rid}/upvote`, { method: 'POST', body: '{}' }),

    // Repair
    analyzeRepair: (body) => apiFetch('/repair/analyze', { method: 'POST', body: JSON.stringify(body) }),
    submitRepair: (id) => apiFetch(`/repair/submit/${id}`, { method: 'POST' }),

    // Listings
    getListings: (params) => apiFetch(`/listings?${new URLSearchParams(params)}`),
    getListing: (id) => apiFetch(`/listings/${id}`),
    createListing: (body) => apiFetch('/listings', { method: 'POST', body: JSON.stringify(body) }),
    updateListing: (id, body) => apiFetch(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    markSold: (id) => apiFetch(`/listings/${id}/sold`, { method: 'POST' }),
    deleteListing: (id) => apiFetch(`/listings/${id}`, { method: 'DELETE' }),

    // DM
    getConversations: () => apiFetch('/dm/conversations'),
    getDMs: (partnerId) => apiFetch(`/dm/${partnerId}`),
    getUnreadDMs: () => apiFetch('/dm/unread/count'),

    // Notifications
    getNotifications: () => apiFetch('/notifications'),
    getUnreadNotifs: () => apiFetch('/notifications/unread'),
    markNotifRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    markAllNotifsRead: () => apiFetch('/notifications/read-all', { method: 'POST' }),
};
