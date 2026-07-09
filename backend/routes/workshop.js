/* ─────────────────────────────────────────
   FILE: workshop.js
   DESCRIPTION: Workshop Routes — /api/workshop
   Private hardware-diagnostics tool (boards, components, pins, journal).
   Admin-only: every route requires authRequired + adminOnly.
   Uses the service-role Supabase client because workshop_* tables have
   RLS enabled with no public policies (deny by default).
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { supabaseAdmin } = require('../utils/supabaseStorage');

const router = express.Router();

// Every workshop route is admin-only.
router.use(authRequired, adminOnly);

// Service-role client is created at boot from env; if it's missing, all
// workshop routes fail with 500 instead of crashing the server.
router.use((req, res, next) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Supabase client not configured.' });
    }
    next();
});

// ── GET /api/workshop/boards ─────────────────────────────
router.get('/boards', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('workshop_boards')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) throw error;

        res.json({ success: true, boards: data });
    } catch (err) {
        console.error('Workshop boards GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/workshop/boards/:id ─────────────────────────
// Board + its components + each component's pins (FK-based embed).
router.get('/boards/:id', async (req, res) => {
    try {
        const { data: board, error: boardErr } = await supabaseAdmin
            .from('workshop_boards')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();
        if (boardErr) throw boardErr;
        if (!board) return res.status(404).json({ success: false, error: 'Board not found.' });

        const { data: components, error: compErr } = await supabaseAdmin
            .from('workshop_components')
            .select('*, workshop_pins(*)')
            .eq('board_id', board.id)
            .order('ref_designator', { ascending: true });
        if (compErr) throw compErr;

        // Flatten the embed key to plain `pins` for the client.
        const shaped = (components || []).map(({ workshop_pins, ...c }) => ({
            ...c,
            pins: workshop_pins || []
        }));

        res.json({ success: true, board, components: shaped });
    } catch (err) {
        console.error('Workshop board GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/workshop/boards/:id/journal ─────────────────
router.get('/boards/:id/journal', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('workshop_journal')
            .select('*')
            .eq('board_id', req.params.id)
            .order('created_at', { ascending: false });
        if (error) throw error;

        res.json({ success: true, journal: data });
    } catch (err) {
        console.error('Workshop journal GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/workshop/journal ───────────────────────────
// Body: { board_id, title, body?, component_id? }
router.post('/journal', async (req, res) => {
    const { board_id, title, body, component_id } = req.body || {};
    if (!board_id || typeof board_id !== 'string') {
        return res.status(400).json({ success: false, error: 'board_id is required.' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, error: 'title is required.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('workshop_journal')
            .insert({
                board_id,
                title: title.trim(),
                body: typeof body === 'string' && body.trim() ? body.trim() : null,
                component_id: typeof component_id === 'string' && component_id ? component_id : null
            })
            .select()
            .single();
        if (error) {
            // FK violation → caller sent an unknown board/component id.
            if (error.code === '23503') {
                return res.status(400).json({ success: false, error: 'Unknown board_id or component_id.' });
            }
            throw error;
        }

        res.status(201).json({ success: true, entry: data });
    } catch (err) {
        console.error('Workshop journal POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── PATCH /api/workshop/components/:id/position ──────────
// Body: { x_percent, y_percent } — both 0..100.
router.patch('/components/:id/position', async (req, res) => {
    const { x_percent, y_percent } = req.body || {};
    const x = Number(x_percent);
    const y = Number(y_percent);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
        return res.status(400).json({ success: false, error: 'x_percent and y_percent must be numbers between 0 and 100.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('workshop_components')
            .update({ x_percent: x, y_percent: y })
            .eq('id', req.params.id)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Component not found.' });

        res.json({ success: true, component: data });
    } catch (err) {
        console.error('Workshop component position PATCH error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
