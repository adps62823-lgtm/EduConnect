# EduConnect 🎓

A full-stack educational social media platform — think Instagram + StackOverflow + WhatsApp + Zoom + LinkedIn, built for students.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 · Vite · React Router v6 · Zustand     |
| Styling    | Pure CSS · CSS Variables · Glassmorphism        |
| Animation  | Framer Motion                                   |
| Backend    | Python · FastAPI · Uvicorn                      |
| Database   | JSON Flat File Storage · Hashed Token & Password|
| Auth       | JWT (python-jose) · bcrypt                      |
| Real-time  | WebSockets (FastAPI native)                     |
| File Upload| FastAPI UploadFile → local /uploads             |

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+

### 1 — Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY etc.
uvicorn main:app --reload --port 8000
```

Health check: `http://localhost:8000/api/health`
API docs:     `http://localhost:8000/docs`

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

---

## Project Structure

```
educonnect/
├── README.md
│
├── backend/
│   ├── requirements.txt          
│   ├── .env.example
│   ├── main.py                   
│   ├── database.py               
│   ├── models.py                
│   ├── auth.py                   
│   └── routes
│       ├── auth_routes.py
│       ├── feed_routes.py        # Posts, likes, comments, stories, journey, explore
│       ├── help_routes.py        # Questions, answers, votes, accept, senior matcher
│       ├── chat_routes.py        # DMs, group chats, messages, read receipts, uploads
│       ├── mentor_routes.py      # Mentor profiles, discovery, connections, reviews
│       ├── room_routes.py        # Study rooms, join, Pomodoro, kick, host transfer
│       ├── resource_routes.py    # File uploads, help-points economy, likes, search
│       ├── profile_routes.py     # Full profile, badges, exam countdowns, theme
│       ├── college_routes.py     # College listings, reviews, ratings
│       └── gamification_routes.py# Leaderboard, check-in, streak calendar, wars, badges
│
└── frontend/
    ├── package.json              
    ├── vite.config.js            
    ├── index.html                #splash screen
    └── src/
        ├── main.jsx              # React mount, splash hide
        ├── App.jsx               
        ├── api.js               
        │
        ├── styles/
        │   ├── global.css        # Full design system — variables, components, utilities
        │   └── themes.js         # 12 accent colors, 4 base themes, 8 wallpapers,
        │                         
        │
        ├── store/
        │   ├── authStore.js      # Zustand — user session, login/logout, follow, avatar
        │   ├── themeStore.js     # Zustand — theme, accent, wallpaper, font, navbar pos
        │   └── notifStore.js     # Zustand — notifications + full WebSocket store
        │                         #   (connect, typing, presence, WS event emitter)
        │
        ├── components/
        │   ├── Layout.jsx        # App shell — WS connect on mount, <Outlet />
        │   ├── Navbar.jsx        # Bottom / top / left-sidebar, active spring dot,
        │   │                     #   unread badges, study status
        │   ├── Avatar.jsx        # User avatar, study ring, DiceBear fallback
        │   ├── Modal.jsx         # Animated modal, Escape-to-close, click-outside
        │   ├── UserCard.jsx      # Follow/unfollow inline, message button, status label
        │   ├── SearchBar.jsx     # Debounced user search, animated dropdown
        │   └── ui.jsx            # Button, Input, Textarea, Spinner, FullPageSpinner,
        │                         #   EmptyState, PageHeader, Toggle, StarRating,
        │                         #   Tag, Skeleton, CardSkeleton, Divider,
        │                         #   StatBox, NotifDot
        │
        └── pages/
            ├── Auth/
            │   ├── Login.jsx         # Glassmorphism login, email or username
            │   └── Register.jsx      # 2-step signup — credentials + study profile,
            │                         #   exam picker grid, animated step dots
            │
            ├── Feed.jsx              # Instagram clone
            │                         #   Stories row + viewer modal
            │                         #   Infinite scroll (react-intersection-observer)
            │                         #   Create post (text + 4 images, anon toggle)
            │                         #   Like (optimistic), threaded comments
            │                         #   Following / Trending / Anonymous feed filters
            │
            ├── HelpForum.jsx         # StackOverflow clone — question list
            │                         #   Search, filter (subject/exam/status), sort chips
            │                         #   Vote + answer count columns, pagination
            │
            ├── AskQuestion.jsx       # Question editor
            │                         #   Auto-monospace on code fences, tag builder,
            │                         #   tips sidebar, reputation economy explainer
            │
            ├── QuestionDetail.jsx    # Full question + answers
            │                         #   RichContent (triple-backtick code blocks)
            │                         #   Vote ±1, accept answer, accepted floats to top
            │                         #   Senior Matcher panel, stats sidebar
            │
            ├── Chat.jsx              # WhatsApp clone — conversation list
            │                         #   Unread badges, online dots, new group modal,
            │                         #   auto-open DM from location.state
            │
            ├── ChatConversation.jsx  # Live chat window
            │                         #   Real-time WebSocket messages
            │                         #   Typing indicator (3-dot bounce)
            │                         #   Date separators, read receipts (✓ / ✓✓)
            │                         #   Image + file upload, delete own messages
            │                         #   Load older messages on scroll-up
            │                         #   Group info modal (add/remove members)
            │
            ├── StudyRooms.jsx        # Room browser
            │                         #   Live badge, capacity bar, stacked avatars
            │                         #   Create room (private/public, max members slider)
            │                         #   Join with optional password modal
            │                         #   All Rooms / My Rooms tabs, filters
            │
            ├── RoomSession.jsx       # Live study room (Zoom-lite)
            │                         #   Pomodoro SVG ring (25/5 cycles, WS-synced)
            │                         #   Host start/stop, late-join timer restore
            │                         #   Member grid with HOST crown, kick, host transfer
            │                         #   Slide-in room chat panel, mic/cam UI toggles
            │
            ├── Profile.jsx           
            ├── Mentor.jsx            
            ├── Resources.jsx        
            ├── Colleges.jsx         
            ├── Leaderboard.jsx       
            └── Settings.jsx         
```

---

## Features Completed (Files 1 – 26)

### Backend (Files 2 – 16) 
- **Auth** — JWT register/login, follow/unfollow, school email validation
- **Feed** — Posts (multi-image), likes, threaded comments, stories (24hr), journey, explore/trending
- **Help Forum** — Questions, answers, vote ±1, accept answer, senior matcher, tags, reputation economy
- **Chat** — DMs (no duplicates), group chats, paginated history, read receipts, file/image messages
- **Mentor** — Profiles, discovery with filters, connection requests, reviews, smart recommendations
- **Study Rooms** — Create/join/leave, password protection, Pomodoro (server-synced), host transfer, kick
- **Resources** — File uploads (10 MB max), help-points economy, likes, search/filter/sort
- **Profile** — Full stats, 12 auto-computed badges, exam countdowns (max 5), full theme system
- **Colleges** — Reviews, ratings, one-review-per-user, pros/cons, reviewer rewards
- **Gamification** — Multi-scope leaderboard, daily check-in, streak calendar, streak wars, badge auto-award

### Frontend (Files 17 – 26) 
- **Setup** — Vite, React Router, Zustand, Framer Motion, all deps
- **Design System** — 550+ line global.css, 12 accent colors, 4 themes, 8 wallpapers
- **Stores** — authStore, themeStore, notifStore + full WebSocket store
- **Components** — Layout, Navbar (3 positions), Avatar, Modal, UserCard, SearchBar, full ui.jsx library
- **Auth pages** — Login + 2-step Register with exam picker
- **Feed** — Stories, infinite scroll, create post, like/comment, 3 feed filters
- **Help Forum** — Question list, ask question, question detail with voting + senior matcher
- **Chat** — Conversation list + full real-time chat window with typing indicators
- **Study Rooms** — Room browser + live session with Pomodoro, member grid, room chat

---

## API Overview

All endpoints are prefixed `/api/`.

| Router              | Prefix                 | Key endpoints                                      |
|---------------------|------------------------|----------------------------------------------------|
| auth_routes         | `/api/auth`            | register, login, me, follow, search, notifications |
| feed_routes         | `/api/feed`            | posts, likes, comments, stories, journey, explore  |
| help_routes         | `/api/help`            | questions, answers, votes, accept, senior-match    |
| chat_routes         | `/api/chat`            | conversations, messages, read, group manage        |
| mentor_routes       | `/api/mentor`          | profiles, discover, connect, reviews               |
| room_routes         | `/api/rooms`           | rooms CRUD, join, pomodoro, kick, transfer         |
| resource_routes     | `/api/resources`       | upload, download, points, likes, search            |
| profile_routes      | `/api/profile`         | stats, badges, countdowns, theme                   |
| college_routes      | `/api/colleges`        | listings, reviews, ratings                         |
| gamification_routes | `/api/gamification`    | leaderboard, check-in, streak calendar, wars       |

WebSocket: `ws://localhost:8000/ws/{user_id}`

---

## Environment Variables

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./educonnect.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
ACCESS_TOKEN_EXPIRE_DAYS=7
```

---

## Progress

```
████████████████████████░░░░░░░░  26 / ~32 files  (80%)
```