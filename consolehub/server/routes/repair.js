const express = require('express');
const RepairRequest = require('../models/RepairRequest');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const VALID = ['playstation', 'xbox', 'nintendo', 'pc'];

// Analyze
router.post('/analyze', authRequired, async (req, res) => {
    const { consoleCategory, description, image } = req.body;
    if (!consoleCategory || !VALID.includes(String(consoleCategory).toLowerCase())) {
        return res.status(400).json({ error: 'Consolă invalidă.' });
    }
    if (!description || String(description).trim().length < 10) {
        return res.status(400).json({ error: 'Descrierea trebuie să aibă minim 10 caractere.' });
    }
    try {
        const repair = await RepairRequest.create({
            userId: req.userId,
            username: req.username,
            consoleCategory: String(consoleCategory).toLowerCase(),
            description: String(description).trim().slice(0, 5000),
            image: typeof image === 'string' ? image.slice(0, 500) : '',
        });

        const KEY = process.env.OPENAI_API_KEY;
        if (!KEY) {
            repair.aiDiagnosis = 'Analiza AI nu este disponibilă momentan. Consultă forumul comunității.';
            repair.severity = 'medium';
            repair.estimatedCost = { min: 50, max: 200 };
            repair.estimatedTime = '3-7 zile';
            repair.recommendation = 'Postează în forum pentru sfaturi de la comunitate.';
            repair.status = 'analyzed';
            await repair.save();
            return res.json(repair);
        }

        const prompt = `You are an expert console/PC repair technician. Problem with ${consoleCategory}:\n\n"${String(description).trim().slice(0, 2000)}"\n\nRespond ONLY with valid JSON:\n{"diagnosis":"(Romanian)","severity":"low|medium|high","estimatedCost":{"min":N,"max":N},"estimatedTime":"(Romanian)","recommendation":"(Romanian)"}\n\nCosts in LEI.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 500 }),
        });
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';

        let parsed;
        try {
            const m = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(m ? m[0] : raw);
        } catch {
            parsed = { diagnosis: raw || 'Nu s-a putut analiza.', severity: 'medium', estimatedCost: { min: 50, max: 200 }, estimatedTime: '3-7 zile', recommendation: 'Consultă un tehnician.' };
        }

        repair.aiDiagnosis = String(parsed.diagnosis || '').slice(0, 2000);
        repair.severity = ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium';
        repair.estimatedCost = { min: Number(parsed.estimatedCost?.min) || 50, max: Number(parsed.estimatedCost?.max) || 200 };
        repair.estimatedTime = String(parsed.estimatedTime || '3-7 zile').slice(0, 100);
        repair.recommendation = String(parsed.recommendation || '').slice(0, 2000);
        repair.status = 'analyzed';
        await repair.save();
        res.json(repair);
    } catch (err) {
        console.error('Repair analyze:', err);
        res.status(500).json({ error: 'Eroare la analiză.' });
    }
});

// Submit repair request
router.post('/submit/:id', authRequired, async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: 'ID invalid.' });
        const repair = await RepairRequest.findById(req.params.id);
        if (!repair) return res.status(404).json({ error: 'Nu a fost găsit.' });
        repair.status = 'submitted';
        await repair.save();
        res.json(repair);
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

module.exports = router;
