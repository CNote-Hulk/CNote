const express = require('express');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const CATEGORIES = ['consoles', 'games', 'accessories', 'parts'];
const CONDITIONS = ['new', 'like_new', 'good', 'used', 'for_parts'];
const isOid = (id) => mongoose.Types.ObjectId.isValid(id);

// List / search
router.get('/', async (req, res) => {
    try {
        const { category, condition, search, minPrice, maxPrice, sort, page = 1 } = req.query;
        const filter = {};
        if (category && CATEGORIES.includes(category)) filter.category = category;
        if (condition && CONDITIONS.includes(condition)) filter.condition = condition;
        if (search) filter.title = { $regex: String(search).slice(0, 100), $options: 'i' };
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        let sortObj = { createdAt: -1 };
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };

        const limit = 24;
        const skip = (Math.max(1, Number(page)) - 1) * limit;
        const [listings, total] = await Promise.all([
            Listing.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
            Listing.countDocuments(filter),
        ]);
        res.json({ listings, total, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('Listings list:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get single listing + seller info
router.get('/:id', async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const listing = await Listing.findById(req.params.id).lean();
        if (!listing) return res.status(404).json({ error: 'Not found.' });
        const seller = await User.findById(listing.sellerId).select('username avatar badges createdAt totalListings').lean();
        res.json({ listing, seller });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Create listing
router.post('/', authRequired, async (req, res) => {
    const { title, category, price, condition, description, images, location, contact, olxLink } = req.body;
    if (!title?.trim() || !category || !price || !condition || !description?.trim()) {
        return res.status(400).json({ error: 'Completează câmpurile obligatorii.' });
    }
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categorie invalidă.' });
    if (!CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Condiție invalidă.' });
    try {
        const user = await User.findById(req.userId).select('badges').lean();
        const listing = await Listing.create({
            title: title.trim().slice(0, 120),
            category,
            price: Math.max(0, Number(price)),
            condition,
            description: description.trim().slice(0, 5000),
            images: Array.isArray(images) ? images.slice(0, 8).map(u => String(u).slice(0, 500)) : [],
            location: String(location || '').trim().slice(0, 100),
            contact: String(contact || '').trim().slice(0, 30),
            olxLink: String(olxLink || '').trim().slice(0, 300),
            sellerId: req.userId,
            sellerName: req.username,
            badges: user?.badges || [],
        });
        await User.findByIdAndUpdate(req.userId, { $inc: { totalListings: 1 } });
        res.status(201).json(listing);
    } catch (err) {
        console.error('Create listing:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Update listing
router.put('/:id', authRequired, async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ error: 'Not found.' });
        if (String(listing.sellerId) !== req.userId) return res.status(403).json({ error: 'Nu ai permisiunea.' });

        const allowed = ['title', 'category', 'price', 'condition', 'description', 'images', 'location', 'contact', 'olxLink'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) listing[key] = req.body[key];
        }
        await listing.save();
        res.json(listing);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Mark sold
router.post('/:id/sold', authRequired, async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ error: 'Not found.' });
        if (String(listing.sellerId) !== req.userId) return res.status(403).json({ error: 'Nu ai permisiunea.' });
        listing.sold = true;
        await listing.save();
        res.json(listing);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// Delete listing
router.delete('/:id', authRequired, async (req, res) => {
    if (!isOid(req.params.id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ error: 'Not found.' });
        if (String(listing.sellerId) !== req.userId) return res.status(403).json({ error: 'Nu ai permisiunea.' });
        await listing.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
