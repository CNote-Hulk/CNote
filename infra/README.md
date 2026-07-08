# Chat attachment storage — self-hosted MinIO on our own VPS

Why: chat images/voice messages need real storage. Supabase Storage's free
tier is 1GB — not enough. This runs our own S3-compatible object storage
(MinIO) on a VPS we control, so it scales just by growing the disk.

The backend (`backend/utils/objectStorage.js`, `backend/routes/uploads.js`)
already speaks plain S3 API, so once this is deployed you only need to fill
in the `OBJECT_STORAGE_*` vars in the backend's `.env` — no code changes.

## 1. Rent a VPS

Hetzner Cloud is the easiest/cheapest option (EU datacenters, hourly billing,
resizable disk):

1. Create an account at https://www.hetzner.com/cloud
2. New server → Ubuntu 22.04 → CX22 (2 vCPU / 4GB RAM / 40GB disk, ~4-5€/mo)
   is plenty to start; you can resize later without downtime.
3. Choose a datacenter region close to your users (Falkenstein/Nuremberg for
   Romania is fine, low latency).
4. Add your SSH key during creation (don't use password auth).
5. Note the server's public IPv4 address.

## 2. Point DNS at it

In your domain's DNS (wherever consolenotebook.com is managed), add:

```
storage.consolenotebook.com          A     <VPS_IP>
storage-console.consolenotebook.com  A     <VPS_IP>   (optional, admin console)
```

## 3. Install Docker on the VPS

SSH in (`ssh root@<VPS_IP>`), then:

```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Deploy this folder

From your machine:

```bash
scp -r infra root@<VPS_IP>:/opt/cnote-storage
```

On the VPS:

```bash
cd /opt/cnote-storage
cp .env.example .env
nano .env   # set MINIO_ROOT_USER and a long random MINIO_ROOT_PASSWORD
docker compose up -d
```

Caddy will automatically request Let's Encrypt certificates for both
hostnames the first time it starts — make sure DNS has propagated first.

## 5. Create the bucket + access key for the backend

Never give the backend the MinIO root credentials — create a scoped user.
Easiest via the web console at `https://storage-console.consolenotebook.com`
(log in with MINIO_ROOT_USER/PASSWORD), or via the `mc` CLI:

```bash
docker exec -it cnote-minio mc alias set local http://localhost:9000 <ROOT_USER> <ROOT_PASSWORD>

# Bucket for chat attachments
docker exec -it cnote-minio mc mb local/cnote-chat

# Public-read — same trust model as the existing Supabase "avatars" bucket:
# object keys are unguessable UUIDs, nothing is listable/enumerable, but a
# known URL is directly fetchable without auth (needed so <img>/<audio> tags
# can just point at the URL).
docker exec -it cnote-minio mc anonymous set download local/cnote-chat

# Scoped access key for the backend (upload-only policy, not admin)
docker exec -it cnote-minio mc admin user add local cnote-backend <A_LONG_RANDOM_SECRET>
docker exec -it cnote-minio mc admin policy attach local readwrite --user cnote-backend
```

### CORS — required for direct browser uploads

The browser PUTs the file straight to MinIO using the presigned URL our
backend issues, so the bucket needs CORS allowing our frontend origin:

```bash
cat > /tmp/cors.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://consolenotebook.com", "https://andreihalcu07-blip.github.io"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF
docker cp /tmp/cors.json cnote-minio:/tmp/cors.json
docker exec -it cnote-minio mc cors set local/cnote-chat /tmp/cors.json
```

Adjust the origins list if the frontend's real domain differs.

## 6. Configure the backend

In the backend's `.env` (Railway env vars in production):

```
OBJECT_STORAGE_ENDPOINT=https://storage.consolenotebook.com
OBJECT_STORAGE_PUBLIC_URL=https://storage.consolenotebook.com/cnote-chat
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_BUCKET=cnote-chat
OBJECT_STORAGE_ACCESS_KEY=<the cnote-backend access key mc printed>
OBJECT_STORAGE_SECRET_KEY=<the secret you chose above>
OBJECT_STORAGE_FORCE_PATH_STYLE=true
```

Redeploy the backend. `/api/uploads/presign` will start working.

## 7. Backups (do this before real users rely on it)

MinIO is a single point of failure until this is set up. Sync to a cheap
off-site target daily via `rclone` (Backblaze B2 is ~$6/TB/mo, no minimum):

```bash
docker run --rm -v /opt/cnote-storage:/config/rclone rclone/rclone \
  sync /data b2:cnote-chat-backup --config /config/rclone/rclone.conf
```

Add this as a nightly cron job on the VPS once `rclone.conf` is set up with
your B2 credentials (`rclone config`).

## 8. Disk monitoring

Set a simple cron + email/webhook alert for disk usage above ~80% so you can
resize the Hetzner volume before it fills up:

```bash
df -h /var/lib/docker/volumes | awk 'NR==2{print $5}'
```

## Status

- [ ] VPS created
- [ ] DNS pointed
- [ ] Docker Compose deployed, TLS certs issued
- [ ] Bucket created, public-read + CORS set
- [ ] Scoped access key created for backend
- [ ] Backend `.env` / Railway vars updated
- [ ] Backup cron configured
- [ ] Disk monitoring configured

Update this checklist as steps are completed — this file is the source of
truth for "is storage actually live yet."
