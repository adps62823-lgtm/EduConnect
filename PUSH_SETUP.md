# EduConnect — Web Push Notifications Setup

## Step 1 — Generate VAPID keys (one time only)

Run this in your terminal (needs Node.js):

```bash
npx web-push generate-vapid-keys
```

Output looks like:
```
Public Key:
BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA=

Private Key:
yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

Save both. You'll never need to regenerate these.

---

## Step 2 — Add environment variables

### On Render (backend):
Add these in Render → Environment:
```
VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxA=
VAPID_PRIVATE_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyy
VAPID_EMAIL=your@email.com
```

### On Vercel (frontend):
Add in Vercel → Settings → Environment Variables:
```
VITE_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxA=
```
⚠️ Must be the PUBLIC key only. Never put the private key on the frontend.

---

## Step 3 — Replace/add these files

### Backend:
| File | Action |
|---|---|
| `backend/routes/push_routes.py` | **New file** |
| `backend/routes/auth_routes.py` | Replace (adds push on follow) |
| `backend/routes/feed_routes.py` | Replace (adds push on like/comment) |
| `backend/routes/chat_routes.py` | Replace (adds push on new message) |
| `backend/main.py` | Replace (registers push router) |
| `backend/requirements.txt` | Replace (adds pywebpush) |

### Frontend:
| File | Action |
|---|---|
| `frontend/public/sw.js` | **New file** (service worker) |
| `frontend/src/pushService.js` | **New file** |
| `frontend/src/App.jsx` | Replace (calls initPush after login) |

---

## Step 4 — Deploy

```bash
# Push to GitHub → Vercel and Render auto-deploy

# Verify sw.js is accessible:
curl https://my-edu-connect.vercel.app/sw.js
# Should return the service worker JS, not a 404
```

---

## How it works after setup

1. User logs in → 2 seconds later browser shows "Allow notifications?"
2. User clicks Allow → subscription saved to MongoDB
3. Another user likes a post / sends a message / follows them
4. Backend calls send_push_to_user() → pywebpush delivers to browser
5. OS shows notification with sound — even if browser is closed

## Notifications sent automatically:
- ❤️ Someone liked your post
- 💬 New chat message  
- 👥 Someone followed you
- 💬 New comment on your post

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `sw.js` returns 404 | Make sure it's in `frontend/public/` not `frontend/src/` |
| No permission prompt | Must be HTTPS (works on Vercel, not on http://localhost) |
| Push sends but not received | Check VAPID keys match between frontend and backend |
| `pywebpush` import error | Run `pip install pywebpush` and redeploy |
| Notifications stop working | Subscriptions expire — user needs to re-allow (handled automatically) |
