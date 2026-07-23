/* ─────────────────────────────────────────
   FILE: articles.js
   DESCRIPTION: Admin-written blog articles ("New" section on home.html).
   Admin-only write (create/update/delete), public read. Cover + inline
   content images are uploaded separately via the existing
   POST /api/uploads/presign ('article' kind, admin-gated there too).
   ───────────────────────────────────────── */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { publicUrlForKey } = require('../utils/objectStorage');

function slugify(title) {
    return String(title || '')
        .toLowerCase()
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'article';
}

async function uniqueSlug(base, excludeId) {
    let slug = base;
    let n = 2;
    while (true) {
        const { rows } = await pool.query(
            excludeId ? 'SELECT id FROM articles WHERE slug = $1 AND id != $2' : 'SELECT id FROM articles WHERE slug = $1',
            excludeId ? [slug, excludeId] : [slug]
        );
        if (!rows.length) return slug;
        slug = `${base}-${n++}`;
    }
}

function toPublic(row) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        content_html: row.content_html,
        cover_image_url: publicUrlForKey(row.cover_image_key),
        author_id: row.author_id,
        author_name: row.author_name,
        published: row.published,
        views: row.views,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

// GET /api/articles — public, list published articles (newest first)
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        const { rows } = await pool.query(
            `SELECT a.*, u.username AS author_name
             FROM articles a JOIN users u ON u.id = a.author_id
             WHERE a.published = TRUE
             ORDER BY a.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        res.json({ success: true, articles: rows.map(toPublic) });
    } catch (err) {
        console.error('Articles GET error:', err.message);
        res.status(500).json({ success: false, error: 'Could not load articles.' });
    }
});

// GET /api/articles/:slug — public, single article; increments views
router.get('/:slug', authOptional, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.username AS author_name
             FROM articles a JOIN users u ON u.id = a.author_id
             WHERE a.slug = $1`,
            [req.params.slug]
        );
        if (!rows.length) return res.status(404).json({ success: false, error: 'Article not found.' });
        const row = rows[0];
        if (!row.published && (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({ success: false, error: 'Article not found.' });
        }
        pool.query('UPDATE articles SET views = views + 1 WHERE id = $1', [row.id]).catch(() => {});
        res.json({ success: true, article: toPublic(row) });
    } catch (err) {
        console.error('Article GET error:', err.message);
        res.status(500).json({ success: false, error: 'Could not load article.' });
    }
});

// POST /api/articles — admin-only create
router.post('/', authRequired, adminOnly, async (req, res) => {
    try {
        const title = String(req.body?.title || '').trim().slice(0, 200);
        const excerpt = String(req.body?.excerpt || '').trim().slice(0, 400);
        const contentHtml = String(req.body?.content_html || '').trim().slice(0, 50000);
        const coverImageKey = typeof req.body?.cover_image_key === 'string' && req.body.cover_image_key.startsWith(`articles/image/${req.user.id}/`)
            ? req.body.cover_image_key.slice(0, 300) : null;
        const published = req.body?.published !== false;

        if (!title || !contentHtml) {
            return res.status(400).json({ success: false, error: 'Title and content are required.' });
        }

        const slug = await uniqueSlug(slugify(title));
        const { rows } = await pool.query(
            `INSERT INTO articles (slug, title, excerpt, content_html, cover_image_key, author_id, published)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [slug, title, excerpt, contentHtml, coverImageKey, req.user.id, published]
        );
        res.status(201).json({ success: true, article: toPublic({ ...rows[0], author_name: req.user.username }) });
    } catch (err) {
        console.error('Article POST error:', err.message);
        res.status(500).json({ success: false, error: 'Could not create article.' });
    }
});

// PUT /api/articles/:id — admin-only update
router.put('/:id', authRequired, adminOnly, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid article id.' });

        const { rows: existingRows } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
        if (!existingRows.length) return res.status(404).json({ success: false, error: 'Article not found.' });
        const existing = existingRows[0];

        const title = String(req.body?.title ?? existing.title).trim().slice(0, 200);
        const excerpt = String(req.body?.excerpt ?? existing.excerpt).trim().slice(0, 400);
        const contentHtml = String(req.body?.content_html ?? existing.content_html).trim().slice(0, 50000);
        const coverImageKey = typeof req.body?.cover_image_key === 'string'
            ? (req.body.cover_image_key.startsWith(`articles/image/${req.user.id}/`) ? req.body.cover_image_key.slice(0, 300) : existing.cover_image_key)
            : existing.cover_image_key;
        const published = typeof req.body?.published === 'boolean' ? req.body.published : existing.published;

        if (!title || !contentHtml) {
            return res.status(400).json({ success: false, error: 'Title and content are required.' });
        }

        let slug = existing.slug;
        if (req.body?.title && slugify(req.body.title) !== existing.slug) {
            slug = await uniqueSlug(slugify(title), id);
        }

        const { rows } = await pool.query(
            `UPDATE articles SET slug = $1, title = $2, excerpt = $3, content_html = $4,
                cover_image_key = $5, published = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [slug, title, excerpt, contentHtml, coverImageKey, published, id]
        );
        const { rows: authorRows } = await pool.query('SELECT username FROM users WHERE id = $1', [existing.author_id]);
        res.json({ success: true, article: toPublic({ ...rows[0], author_name: authorRows[0]?.username }) });
    } catch (err) {
        console.error('Article PUT error:', err.message);
        res.status(500).json({ success: false, error: 'Could not update article.' });
    }
});

// DELETE /api/articles/:id — admin-only
router.delete('/:id', authRequired, adminOnly, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid article id.' });
        await pool.query('DELETE FROM articles WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Article DELETE error:', err.message);
        res.status(500).json({ success: false, error: 'Could not delete article.' });
    }
});

module.exports = router;
