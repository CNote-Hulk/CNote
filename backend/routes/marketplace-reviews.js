/* ─────────────────────────────────────────
   FILE: marketplace-reviews.js
   DESCRIPTION: Seller reviews for the marketplace. A review is tied to the
   seller (user), not a specific listing, so it survives the listing being
   sold/deleted — mirrors the eBay/OLX/Vinted convention. One review per
   (reviewer, seller) pair, upsertable. Mounted at /api/marketplace
   alongside the main marketplace router (same split pattern as
   forum-liked.js / forum-my-posts.js).
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/marketplace/sellers/:sellerId/reviews ──────────────────────────
router.get('/sellers/:sellerId/reviews', authOptional, async (req, res) => {
    const sellerId = parseInt(req.params.sellerId, 10);
    if (!sellerId) return res.status(400).json({ success: false, error: 'Invalid seller ID.' });

    try {
        const statsResult = await pool.query(
            'SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count FROM seller_reviews WHERE seller_id = $1',
            [sellerId]
        );
        const { average, count } = statsResult.rows[0];

        const reviewsResult = await pool.query(
            `SELECT sr.id, sr.rating, sr.comment, sr.listing_id, sr.created_at,
                    u.username AS reviewer_username, u.avatar AS reviewer_avatar
             FROM seller_reviews sr
             JOIN users u ON u.id = sr.reviewer_id
             WHERE sr.seller_id = $1
             ORDER BY sr.created_at DESC
             LIMIT 50`,
            [sellerId]
        );

        let userRating = null;
        if (req.user) {
            const own = await pool.query(
                'SELECT rating, comment FROM seller_reviews WHERE reviewer_id = $1 AND seller_id = $2',
                [req.user.id, sellerId]
            );
            if (own.rows[0]) userRating = own.rows[0];
        }

        res.json({
            success: true,
            average: Math.round(parseFloat(average) * 10) / 10,
            count,
            reviews: reviewsResult.rows,
            userRating,
        });
    } catch (err) {
        console.error('Seller reviews GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/marketplace/sellers/:sellerId/review ───────────────────────────
router.post('/sellers/:sellerId/review', authRequired, async (req, res) => {
    const sellerId = parseInt(req.params.sellerId, 10);
    if (!sellerId) return res.status(400).json({ success: false, error: 'Invalid seller ID.' });
    if (sellerId === req.user.id) {
        return res.status(400).json({ success: false, error: 'You cannot review yourself.' });
    }

    const ratingNum = parseInt(req.body?.rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
    }
    const comment = req.body?.comment ? String(req.body.comment).trim().slice(0, 1000) : '';
    const listingId = req.body?.listingId ? parseInt(req.body.listingId, 10) || null : null;

    try {
        await pool.query(
            `INSERT INTO seller_reviews (reviewer_id, seller_id, listing_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (reviewer_id, seller_id)
             DO UPDATE SET rating = $4, comment = $5, listing_id = $3, created_at = NOW()`,
            [req.user.id, sellerId, listingId, ratingNum, comment]
        );

        const statsResult = await pool.query(
            'SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count FROM seller_reviews WHERE seller_id = $1',
            [sellerId]
        );
        const { average, count } = statsResult.rows[0];

        res.json({
            success: true,
            average: Math.round(parseFloat(average) * 10) / 10,
            count,
            userRating: { rating: ratingNum, comment },
        });
    } catch (err) {
        console.error('Seller review POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
