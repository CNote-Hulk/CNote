# Chat/gallery/tutorial photo storage — Cloudflare R2

Why: chat images/voice messages, Community "Photos" gallery uploads, and
console tutorial/modding step photos all need real object storage. Supabase
Storage's free tier is 1GB (too small). Cloudflare R2 gives 10GB storage free
with **no egress fees** (the thing that makes AWS S3/most providers expensive
once traffic grows), and needs no server to manage — no VPS, no DNS, no
Docker, no TLS certs.

The backend (`backend/utils/objectStorage.js`, `backend/routes/uploads.js`)
already speaks plain S3 API, so once the bucket + token exist below, you only
need to fill in the `OBJECT_STORAGE_*` vars in Railway — no code changes.

If you ever outgrow R2's free tier or want to self-host instead, see
`/infra/README.md` for the MinIO-on-your-own-VPS alternative — same env vars,
same code, just different values.

## 1. Enable R2 on your Cloudflare account

1. Log into the Cloudflare dashboard → **R2** in the left sidebar.
2. If this is the first time, Cloudflare asks you to add a payment method
   even to use the free tier (anti-abuse measure) — you won't be charged
   unless you go over 10GB storage or make heavy Class A/B API call volume.

## 2. Create a bucket

1. R2 → **Create bucket**.
2. Name it `cnote-chat` (matches the `OBJECT_STORAGE_BUCKET` default the
   backend expects — you can use a different name, just keep the env var in
   sync).
3. Location: Automatic is fine.

## 3. Make the bucket public (so uploaded images/audio are directly fetchable)

1. Open the bucket → **Settings** tab → **Public access**.
2. Under "R2.dev subdomain", click **Allow Access** → confirm.
3. Cloudflare gives you a URL like `https://pub-xxxxxxxxxxxxxxxx.r2.dev` —
   this is your `OBJECT_STORAGE_PUBLIC_URL`.

   (This is the same trust model as the existing Supabase "avatars" bucket:
   object keys are unguessable UUIDs, nothing is listable/enumerable, but a
   known URL is directly fetchable without auth — needed so `<img>`/`<audio>`
   tags can just point at the URL.)

   A custom domain (e.g. `storage.consolenotebook.com` via Cloudflare DNS) can
   be mapped later instead of the r2.dev URL if you want — same "Public
   access" tab, "Custom Domains" section. Not required to get this working.

## 4. Set up CORS — required for direct browser uploads

The browser PUTs the file straight to R2 using the presigned URL our backend
issues, so the bucket needs CORS allowing the frontend origin.

Bucket → **Settings** → **CORS Policy** → add:

```json
[
  {
    "AllowedOrigins": ["https://consolenotebook.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

Add any other origin the frontend is actually served from (e.g. a GitHub
Pages mirror) to `AllowedOrigins` if applicable.

## 5. Create a scoped API token (not your global Cloudflare credentials)

1. R2 → **Manage API Tokens** (top right of the R2 overview page, or bucket →
   Settings → API Tokens).
2. **Create API Token**.
3. Permissions: **Object Read & Write**.
4. Scope it to the specific bucket (`cnote-chat`) — don't grant account-wide
   access.
5. Create it. Cloudflare shows the **Access Key ID** and **Secret Access
   Key** exactly once — copy both immediately, you can't view the secret
   again later (only regenerate a new one).

## 6. Find your Account ID

R2 overview page (or the right sidebar on almost any Cloudflare dashboard
page) shows your **Account ID** — a 32-char hex string. You need it for the
endpoint URL below.

## 7. Set the Railway env vars

In Railway → your backend service → **Variables**, set:

```
OBJECT_STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
OBJECT_STORAGE_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=cnote-chat
OBJECT_STORAGE_ACCESS_KEY=<the Access Key ID from step 5>
OBJECT_STORAGE_SECRET_KEY=<the Secret Access Key from step 5>
OBJECT_STORAGE_FORCE_PATH_STYLE=false
```

Railway redeploys automatically on variable changes. Once it's back up,
`/api/uploads/presign` starts working — try a chat image, a Community Photos
upload, or writing a console tutorial step with a photo to confirm.

## Status

- [ ] R2 enabled on the Cloudflare account
- [ ] Bucket created (`cnote-chat`)
- [ ] Public access (r2.dev) enabled
- [ ] CORS policy set
- [ ] Scoped API token created
- [ ] Railway env vars set
- [ ] Verified with a real upload (chat / Photos / tutorial step)

Update this checklist as steps are completed — this file is the source of
truth for "is storage actually live yet."
