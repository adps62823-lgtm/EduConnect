# EduConnect — MongoDB + Cloudinary Migration Guide

## What changed and why

Your old backend stored all data in JSON files on Render's disk.
Render's **free tier has no persistent disk** — every cold start (after ~15 min
of inactivity) wipes the filesystem, deleting all users, posts, messages, etc.
That's why logins fail and data disappears.

**The fix:** MongoDB Atlas (free cloud database) + Cloudinary (free file CDN).
- All data lives in Atlas — never wiped, even when Render restarts.
- All uploads (avatars, posts, stories, chat files) go to Cloudinary CDN.
- The `database.py` API is **identical** — all existing routes work unchanged.

---

## Step 1 — MongoDB Atlas (5 minutes)

1. Go to **https://cloud.mongodb.com** and sign up (free, no credit card).

2. Click **"Build a Database"** → choose **M0 Free** → pick any region
   (Mumbai / Singapore for India is fastest).

3. Set a username and password (save these — you'll need them).

4. Under **"Where would you like to connect from?"** choose
   **"My Local Environment"** and add IP `0.0.0.0/0`
   (allows connections from Render's servers).

5. Click **"Connect"** → **"Drivers"** → copy the connection string.
   It looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/
   ```

6. In your `.env` (or Render environment variables), set:
   ```
   MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/
   MONGO_DB_NAME=educonnect
   ```

---

## Step 2 — Cloudinary (3 minutes)

1. Go to **https://cloudinary.com** and sign up (free, no credit card).
   Free plan: **25 GB storage + 25 GB bandwidth/month** — more than enough.

2. On your **Dashboard**, you'll see three values:
   - Cloud name
   - API Key
   - API Secret

3. Add these to your `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
   ```

---

## Step 3 — Deploy updated files

Replace these files in your backend with the ones in this folder:

```
backend/
├── database.py          ← rewritten (MongoDB)
├── cloudinary_utils.py  ← NEW file
├── main.py              ← updated (calls ensure_indexes, no local upload mount)
├── requirements.txt     ← updated (pymongo, cloudinary added)
├── .env.example         ← updated template
└── routes/
    ├── feed_routes.py      ← upload_file() instead of _save_upload()
    ├── profile_routes.py   ← upload_file() instead of _save_upload()
    ├── chat_routes.py      ← upload_file() instead of local write
    └── resource_routes.py  ← upload_file() instead of local write
```

**All other routes (auth, help, mentor, college, gamification, room) are
unchanged** — they don't handle file uploads, and the `database.py` API is
100% backward compatible.

---

## Step 4 — Set environment variables on Render

1. Go to your Render service → **Environment** tab.
2. Add each variable from `.env.example`:
   - `MONGO_URI`
   - `MONGO_DB_NAME`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `SECRET_KEY` (keep your existing one)
   - `FRONTEND_URL` = `https://my-edu-connect.vercel.app`
   - `ACCESS_TOKEN_EXPIRE_MINUTES` = `10080`

3. **Do NOT set** `UPLOAD_DIR` anymore — it's not used.

4. Redeploy.

---

## Step 5 — Verify it works

After deploy, open your browser console or use curl:

```bash
# Health check
curl https://educonnect-backend-hxa5.onrender.com/api/health

# Should return:
# {"status": "ok", "app": "EduConnect", ...}
```

Then register a new account, post something, log out, log back in —
data will persist permanently.

---

## What about old test data?

Since you said all existing data is dummy/test data, there's nothing to migrate.
Start fresh — register new accounts on the MongoDB-backed app.

If you ever need to seed data, you can insert documents directly via
**MongoDB Atlas → Collections** in the web UI, or use the Atlas Data Explorer.

---

## Free tier limits (you won't hit these for a school pilot)

| Service      | Free limit                        |
|--------------|-----------------------------------|
| MongoDB Atlas M0 | 512 MB storage, shared cluster |
| Cloudinary   | 25 GB storage, 25 GB bandwidth/mo |
| Render Free  | 750 hrs/mo, spins down after 15min inactivity |

**Render spin-down tip:** Your backend will still spin down after inactivity
(that's a Render free-tier thing, not a data issue). Data is safe in Atlas —
the server just takes ~30 seconds to wake up on the first request after a break.
To avoid this, you can use **UptimeRobot** (free) to ping your `/api/health`
endpoint every 14 minutes, keeping Render awake 24/7.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `MONGO_URI is not set` | Add `MONGO_URI` to Render environment vars |
| `ServerSelectionTimeoutError` | Check Atlas IP whitelist — add `0.0.0.0/0` |
| `Cloudinary is not configured` | Add all 3 Cloudinary env vars |
| `AuthenticationFailed` | Check username/password in MONGO_URI are URL-encoded (e.g. `@` → `%40`) |
| Login says "Invalid credentials" after migration | Re-register — old flat-file passwords don't transfer |
