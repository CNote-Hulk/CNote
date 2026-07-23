/* ─────────────────────────────────────────
   FILE: objectStorage.js
   DESCRIPTION: Generic S3-compatible object storage client for chat
   attachments (images, voice messages), the community photo gallery, and
   console tutorial/modding step photos. Runs against Cloudflare R2 today
   (see /infra/R2-SETUP.md) but is provider-agnostic — the same code works
   unmodified against a self-hosted MinIO VPS (see /infra/README.md),
   Backblaze B2, or real AWS S3 by just changing env vars. Server-side only.

   Env vars (see .env.example):
     OBJECT_STORAGE_ENDPOINT      e.g. https://storage.consolenotebook.com
     OBJECT_STORAGE_REGION        e.g. us-east-1 (MinIO ignores the value but the SDK requires one)
     OBJECT_STORAGE_BUCKET        e.g. cnote-chat
     OBJECT_STORAGE_ACCESS_KEY
     OBJECT_STORAGE_SECRET_KEY
     OBJECT_STORAGE_PUBLIC_URL    public base URL objects are served from (bucket is public-read,
                                   same trust model as the existing Supabase "avatars" bucket —
                                   keys are unguessable UUIDs, nothing is enumerable)
     OBJECT_STORAGE_FORCE_PATH_STYLE  "true" for MinIO/most self-hosted S3 servers
   ───────────────────────────────────────── */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const BUCKET = process.env.OBJECT_STORAGE_BUCKET;
const PUBLIC_URL = String(process.env.OBJECT_STORAGE_PUBLIC_URL || '').replace(/\/$/, '');

// Missing env vars must not crash the whole server at boot — only chat
// attachment upload/delete depend on this client, same pattern as
// utils/supabaseStorage.js for avatars.
let s3 = null;
const REQUIRED = ['OBJECT_STORAGE_ENDPOINT', 'OBJECT_STORAGE_REGION', 'OBJECT_STORAGE_BUCKET', 'OBJECT_STORAGE_ACCESS_KEY', 'OBJECT_STORAGE_SECRET_KEY', 'OBJECT_STORAGE_PUBLIC_URL'];
const missing = REQUIRED.filter(name => !process.env[name]);

if (missing.length === 0) {
	s3 = new S3Client({
		endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
		region: process.env.OBJECT_STORAGE_REGION,
		forcePathStyle: String(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'true') === 'true',
		credentials: {
			accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
			secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
		},
	});
} else {
	console.error(`[objectStorage] Missing env vars (${missing.join(', ')}) — chat attachment upload disabled until configured.`);
}

/**
 * buildAttachmentKey
 * @description Generates an unguessable object key namespaced by kind and
 * uploader, e.g. "chat/images/42/f3a1...c9.webp". Never derived from
 * user-supplied filenames — avoids path traversal / collision entirely.
 * @param {string} [namespace] top-level folder — defaults to "chat" for the
 * existing chat/DM attachment callers; community gallery uploads pass "community".
 */
function buildAttachmentKey(userId, kind, extension, namespace = 'chat') {
	const safeExt = String(extension || '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
	const id = crypto.randomUUID();
	return `${namespace}/${kind}/${userId}/${id}${safeExt ? '.' + safeExt : ''}`;
}

/**
 * getPresignedUploadUrl
 * @description Returns a short-lived presigned PUT URL the client uploads
 * the file to directly — the file bytes never pass through our Node
 * process, only the (small) presign request/response does.
 */
async function getPresignedUploadUrl(key, contentType, expiresInSeconds = 300) {
	if (!s3) throw new Error('Object storage not configured');
	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType,
	});
	return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * deleteAttachment
 * @description Best-effort delete, e.g. when a message is removed.
 */
async function deleteAttachment(key) {
	if (!s3 || !key) return;
	try {
		await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
	} catch (err) {
		console.error('[objectStorage] delete failed:', err.message);
	}
}

/**
 * publicUrlForKey
 * @description Builds the public, directly-fetchable URL for a stored key.
 */
function publicUrlForKey(key) {
	if (!key) return null;
	return `${PUBLIC_URL}/${key}`;
}

module.exports = { s3, buildAttachmentKey, getPresignedUploadUrl, deleteAttachment, publicUrlForKey };
