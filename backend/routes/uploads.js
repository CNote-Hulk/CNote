/* ─────────────────────────────────────────
   FILE: uploads.js
   DESCRIPTION: Chat attachment uploads (images + voice messages) —
   /api/uploads. Client asks here for a presigned PUT URL, uploads the
   file bytes directly to object storage, then sends the returned
   attachment_key along with the chat/DM message. The file itself never
   passes through this server.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { buildAttachmentKey, getPresignedUploadUrl, publicUrlForKey } = require('../utils/objectStorage');

const router = express.Router();

const IMAGE_TYPES = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
};
const VOICE_TYPES = {
	'audio/webm': 'webm',
	'audio/ogg': 'ogg',
	'audio/mp4': 'm4a',
	'audio/mpeg': 'mp3',
	'audio/wav': 'wav',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 MB
const MAX_VOICE_BYTES = 15 * 1024 * 1024;  // 15 MB (few minutes of voice)

// POST /api/uploads/presign — { kind: 'image'|'voice', contentType, fileSize }
router.post('/presign', authRequired, async (req, res) => {
	try {
		const { kind, contentType, fileSize } = req.body || {};

		if (kind !== 'image' && kind !== 'voice') {
			return res.status(400).json({ success: false, error: 'Invalid kind — must be "image" or "voice".' });
		}

		const typeMap = kind === 'image' ? IMAGE_TYPES : VOICE_TYPES;
		const extension = typeMap[contentType];
		if (!extension) {
			return res.status(400).json({ success: false, error: `Unsupported content type for ${kind}.` });
		}

		const size = parseInt(fileSize);
		const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VOICE_BYTES;
		if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
			return res.status(400).json({ success: false, error: `File too large — max ${Math.round(maxBytes / 1024 / 1024)}MB.` });
		}

		const key = buildAttachmentKey(req.user.id, kind === 'image' ? 'images' : 'voice', extension);
		const uploadUrl = await getPresignedUploadUrl(key, contentType);

		res.json({
			success: true,
			uploadUrl,
			key,
			publicUrl: publicUrlForKey(key),
		});
	} catch (err) {
		console.error('Upload presign POST error:', err.message);
		res.status(500).json({ success: false, error: 'Storage not available — try again shortly.' });
	}
});

module.exports = router;
