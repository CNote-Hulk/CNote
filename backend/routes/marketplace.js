/**
 * Marketplace Routes — /api/marketplace
 * Listings CRUD with search, filter, sort, pagination.
 * Uses PostgreSQL pool from db.js.
 */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const VALID_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'parts'];
const VALID_CATEGORIES = ['consoles', 'games', 'accessories', 'parts'];
const VALID_SORT = ['newest', 'oldest', 'price_asc', 'price_desc'];

// ── GET /api/marketplace/listings ───────────────────────
router.get('/listings', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;
        const sort = VALID_SORT.includes(req.query.sort) ? req.query.sort : 'newest';
        const category = VALID_CATEGORIES.includes(req.query.category) ? req.query.category : null;
        const condition = VALID_CONDITIONS.includes(req.query.condition) ? req.query.condition : null;
        const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;

        let where = [];
        let params = [];
        let paramIdx = 1;

        if (category) {
            where.push(`l.category = $${paramIdx++}`);
            params.push(category);
        }
        if (condition) {
            where.push(`l.condition = $${paramIdx++}`);
            params.push(condition);
        }
        if (search) {
            where.push(`(l.title ILIKE $${paramIdx} OR l.description ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
        }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        let orderBy;
        switch (sort) {
            case 'oldest': orderBy = 'l.created_at ASC'; break;
            case 'price_asc': orderBy = 'l.price ASC'; break;
            case 'price_desc': orderBy = 'l.price DESC'; break;
            default: orderBy = 'l.created_at DESC';
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM listings l ${whereClause}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const listingsResult = await pool.query(`
            SELECT l.id, l.title, l.description, l.price, l.condition, l.category,
                   l.location, l.images, l.sold, l.created_at,
                   u.id AS seller_id, u.username AS seller_name, u.avatar AS seller_avatar
            FROM listings l
            JOIN users u ON u.id = l.user_id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `, [...params, limit, offset]);

        const listings = listingsResult.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            price: parseFloat(row.price),
            condition: row.condition,
            category: row.category,
            location: row.location,
            images: row.images ? JSON.parse(row.images) : [],
            sold: row.sold,
            created_at: row.created_at,
            seller_id: row.seller_id,
            seller_name: row.seller_name,
            seller_avatar: row.seller_avatar || ''
        }));

        res.json({ success: true, listings, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('Marketplace GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── GET /api/marketplace/listings/:id ───────────────────
router.get('/listings/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const result = await pool.query(`
            SELECT l.*, u.id AS seller_id, u.username AS seller_name,
                   u.avatar AS seller_avatar
            FROM listings l
            JOIN users u ON u.id = l.user_id
            WHERE l.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Anunț negăsit.' });
        }

        const row = result.rows[0];
        res.json({
            success: true,
            listing: {
                id: row.id,
                title: row.title,
                description: row.description,
                price: parseFloat(row.price),
                condition: row.condition,
                category: row.category,
                location: row.location,
                phone: row.phone,
                olx_url: row.olx_url,
                images: row.images ? JSON.parse(row.images) : [],
                sold: row.sold,
                created_at: row.created_at,
                seller_id: row.seller_id,
                seller_name: row.seller_name,
                seller_avatar: row.seller_avatar || ''
            }
        });
    } catch (err) {
        console.error('Marketplace listing GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/marketplace/listings ──────────────────────
router.post('/listings', authRequired, async (req, res) => {
    const { title, description, price, condition, category, location, phone, olx_url, images } = req.body;

    if (!title || !description || price == null) {
        return res.status(400).json({ success: false, error: 'Titlu, descriere și preț obligatorii.' });
    }

    const safeTitle = String(title).trim().slice(0, 100);
    const safeDesc = String(description).trim().slice(0, 3000);
    const safePrice = Math.max(0, parseFloat(price) || 0);
    const safeCond = VALID_CONDITIONS.includes(condition) ? condition : 'good';
    const safeCat = VALID_CATEGORIES.includes(category) ? category : 'consoles';
    const safeLocation = String(location || '').trim().slice(0, 100);
    const safePhone = String(phone || '').trim().slice(0, 30);
    const safeOlx = String(olx_url || '').trim().slice(0, 500);
    const safeImages = JSON.stringify(Array.isArray(images) ? images.slice(0, 8).map(u => String(u).slice(0, 200000)) : []);

    try {
        const result = await pool.query(`
            INSERT INTO listings (user_id, title, description, price, condition, category, location, phone, olx_url, images)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, title, price, condition, category, created_at
        `, [req.user.id, safeTitle, safeDesc, safePrice, safeCond, safeCat, safeLocation, safePhone, safeOlx, safeImages]);

        const listing = result.rows[0];
        listing.seller_name = req.user.username;

        res.status(201).json({ success: true, listing });
    } catch (err) {
        console.error('Marketplace POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── PUT /api/marketplace/listings/:id ────────────────────
router.put('/listings/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const check = await pool.query('SELECT user_id FROM listings WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Anunț negăsit.' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Nu ai permisiunea.' });

        const { title, description, price, condition, category, location, phone, olx_url, images } = req.body;

        const sets = [];
        const params = [];
        let idx = 1;

        if (title !== undefined)       { sets.push(`title = $${idx++}`);       params.push(String(title).trim().slice(0, 100)); }
        if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(String(description).trim().slice(0, 3000)); }
        if (price !== undefined)       { sets.push(`price = $${idx++}`);       params.push(Math.max(0, parseFloat(price) || 0)); }
        if (condition !== undefined && VALID_CONDITIONS.includes(condition)) { sets.push(`condition = $${idx++}`); params.push(condition); }
        if (category !== undefined && VALID_CATEGORIES.includes(category))   { sets.push(`category = $${idx++}`);  params.push(category); }
        if (location !== undefined)    { sets.push(`location = $${idx++}`);    params.push(String(location).trim().slice(0, 100)); }
        if (phone !== undefined)       { sets.push(`phone = $${idx++}`);       params.push(String(phone).trim().slice(0, 30)); }
        if (olx_url !== undefined)     { sets.push(`olx_url = $${idx++}`);     params.push(String(olx_url).trim().slice(0, 500)); }
        if (images !== undefined && Array.isArray(images)) {
            sets.push(`images = $${idx++}`);
            params.push(JSON.stringify(images.slice(0, 8).map(u => String(u).slice(0, 200000))));
        }

        if (sets.length === 0) return res.status(400).json({ success: false, error: 'Nimic de actualizat.' });

        params.push(id);
        const result = await pool.query(
            `UPDATE listings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            params
        );

        res.json({ success: true, listing: result.rows[0] });
    } catch (err) {
        console.error('Marketplace PUT error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── PATCH /api/marketplace/listings/:id/sold ────────────
router.patch('/listings/:id/sold', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const check = await pool.query('SELECT user_id FROM listings WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Anunț negăsit.' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Nu ai permisiunea.' });

        await pool.query('UPDATE listings SET sold = TRUE WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Marketplace sold PATCH error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── DELETE /api/marketplace/listings/:id ─────────────────
router.delete('/listings/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        const check = await pool.query('SELECT user_id FROM listings WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Anunț negăsit.' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Nu ai permisiunea.' });

        await pool.query('DELETE FROM listings WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Marketplace DELETE error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
