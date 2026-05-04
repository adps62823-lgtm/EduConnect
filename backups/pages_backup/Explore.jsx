import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, feedAPI } from "../api";
import UserCard from "../components/UserCard";
import { useAuthStore } from "../store/authStore";

const CATEGORY_OPTIONS = [
  { id: "all", label: "All" },
  { id: "posts", label: "Posts" },
  { id: "students", label: "Students" },
];

const INITIAL_VISIBLE_POSTS = 12;

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function normalize(value) {
  return (value || "").toString().trim().toLowerCase();
}

function PostCard({ post }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);

  const handleLike = async (event) => {
    event.stopPropagation();
    try {
      const result = await feedAPI.likePost(post.id);
      setLiked(result.liked);
      setLikeCount(result.likes_count);
    } catch {}
  };

  const openProfile = () => {
    if (post.author?.username) {
      navigate(`/profile/${post.author.username}`);
    }
  };

  return (
    <div className={`explore-card ${post.author?.username ? "clickable" : ""}`} onClick={openProfile}>
      {post.images?.[0] && (
        <div className="explore-card-img">
          <img src={post.images[0]} alt="" />
          {post.images.length > 1 && (
            <span className="img-count">+{post.images.length - 1}</span>
          )}
        </div>
      )}

      <div className="explore-card-body">
        <div className="explore-author">
          <img
            src={post.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.name || "EduConnect"}`}
            alt=""
            className="explore-avatar"
          />
          <div>
            <span className="explore-name">{post.author?.name || "EduConnect member"}</span>
            <span className="explore-time">{ago(post.created_at)}</span>
          </div>
          {post.exam_tag && <span className="explore-exam-tag">{post.exam_tag}</span>}
        </div>

        {post.subject && <div className="explore-subject">{post.subject}</div>}
        <p className="explore-content">{post.content || "Shared an update."}</p>

        {post.tags?.length > 0 && (
          <div className="explore-tags">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="etag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="explore-actions">
          <button className={`eaction ${liked ? "liked" : ""}`} onClick={handleLike}>
            {liked ? "Liked" : "Like"} {likeCount}
          </button>
          <span className="eaction">Comments {post.comments_count || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const { user } = useAuthStore();

  const [posts, setPosts] = useState([]);
  const [studentResults, setStudentResults] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [activeSubject, setActiveSubject] = useState("");
  const [activeExamTag, setActiveExamTag] = useState("");
  const [visiblePosts, setVisiblePosts] = useState(INITIAL_VISIBLE_POSTS);

  async function loadExplore(searchValue = "") {
    const normalizedSearch = searchValue.trim();

    if (!posts.length && !normalizedSearch) {
      setLoading(true);
    } else {
      setSearching(true);
    }

    try {
      const [postResponse, tagResponse, userResponse] = await Promise.all([
        feedAPI.explore(normalizedSearch ? { page: 1, limit: 60, q: normalizedSearch } : { page: 1, limit: 60 }),
        feedAPI.getTags(),
        normalizedSearch ? authAPI.searchUsers({ q: normalizedSearch, limit: 12 }) : Promise.resolve([]),
      ]);

      setPosts(postResponse?.posts || []);
      setTags(Array.isArray(tagResponse) ? tagResponse : []);
      setStudentResults(Array.isArray(userResponse) ? userResponse : []);
      setVisiblePosts(INITIAL_VISIBLE_POSTS);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  useEffect(() => {
    loadExplore();
  }, []);

  const subjects = useMemo(() => {
    return Array.from(new Set(posts.map((post) => post.subject).filter(Boolean))).sort();
  }, [posts]);

  const examTags = useMemo(() => {
    return Array.from(new Set(posts.map((post) => post.exam_tag).filter(Boolean))).sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const needle = normalize(submittedQuery);

    return posts.filter((post) => {
      const haystack = [
        post.content,
        post.subject,
        post.exam_tag,
        post.author?.name,
        post.author?.username,
        ...(post.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !needle || haystack.includes(needle);
      const matchesTag = !activeTag || post.tags?.includes(activeTag);
      const matchesSubject = !activeSubject || post.subject === activeSubject;
      const matchesExam = !activeExamTag || post.exam_tag === activeExamTag;

      return matchesQuery && matchesTag && matchesSubject && matchesExam;
    });
  }, [activeExamTag, activeSubject, activeTag, posts, submittedQuery]);

  const filteredStudents = useMemo(() => {
    const currentUserId = user?.id;
    return studentResults.filter((student) => student.id !== currentUserId);
  }, [studentResults, user?.id]);

  const visiblePostItems = filteredPosts.slice(0, visiblePosts);
  const canLoadMorePosts = visiblePosts < filteredPosts.length;
  const hasActiveFilters = Boolean(submittedQuery || activeTag || activeSubject || activeExamTag);

  const handleSearch = async (event) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    await loadExplore(query);
  };

  const handleClear = async () => {
    setQuery("");
    setSubmittedQuery("");
    setActiveTag("");
    setActiveSubject("");
    setActiveExamTag("");
    setActiveCategory("all");
    await loadExplore("");
  };

  const shouldShowPosts = activeCategory === "all" || activeCategory === "posts";
  const shouldShowStudents = activeCategory === "all" || activeCategory === "students";

  return (
    <div className="explore-page">
      <div className="explore-hero">
        <div>
          <h1>Explore</h1>
          <p>Search across posts, tags, subjects, exam communities, and students from your school network.</p>
        </div>
        <div className="explore-meta">
          <span>{posts.length} recent posts</span>
          <span>{filteredStudents.length} student matches</span>
        </div>
      </div>

      <form className="explore-search-panel" onSubmit={handleSearch}>
        <div className="explore-search-row">
          <input
            className="explore-search"
            placeholder="Search posts, tags, subjects, exams, or student names..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="btn-search" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
          {hasActiveFilters && (
            <button type="button" className="btn-clear" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        <div className="explore-segments">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`segment-pill ${activeCategory === option.id ? "active" : ""}`}
              onClick={() => setActiveCategory(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <select className="filter-select" value={activeSubject} onChange={(event) => setActiveSubject(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select className="filter-select" value={activeExamTag} onChange={(event) => setActiveExamTag(event.target.value)}>
            <option value="">All exams</option>
            {examTags.map((examTag) => (
              <option key={examTag} value={examTag}>{examTag}</option>
            ))}
          </select>
        </div>
      </form>

      {tags.length > 0 && (
        <div className="tags-scroll">
          {tags.slice(0, 18).map((tag) => (
            <button
              key={tag.tag}
              type="button"
              className={`tag-pill ${activeTag === tag.tag ? "active" : ""}`}
              onClick={() => setActiveTag((value) => value === tag.tag ? "" : tag.tag)}
            >
              #{tag.tag} <span className="tag-count">{tag.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="explore-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="explore-skeleton" />)}
        </div>
      ) : (
        <>
          {shouldShowStudents && submittedQuery && (
            <section className="explore-section">
              <div className="section-head">
                <h2>Students</h2>
                <span>{filteredStudents.length} results</span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="empty-state compact">
                  <span>Students</span>
                  <p>No student matches for this search yet.</p>
                </div>
              ) : (
                <div className="students-list">
                  {filteredStudents.map((student) => (
                    <UserCard
                      key={student.id}
                      user={student}
                      showMessage
                      showCloseFriend
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {shouldShowPosts && (
            <section className="explore-section">
              <div className="section-head">
                <h2>{submittedQuery ? "Post Matches" : "Trending Posts"}</h2>
                <span>{filteredPosts.length} results</span>
              </div>

              {visiblePostItems.length === 0 ? (
                <div className="empty-state">
                  <span>Explore</span>
                  <p>Nothing matched these filters. Try another tag, subject, or search term.</p>
                </div>
              ) : (
                <>
                  <div className="explore-grid">
                    {visiblePostItems.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>

                  {canLoadMorePosts && (
                    <button className="load-more" onClick={() => setVisiblePosts((count) => count + INITIAL_VISIBLE_POSTS)}>
                      Load more posts
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {activeCategory === "students" && !submittedQuery && (
            <div className="empty-state">
              <span>Students</span>
              <p>Search by name or username to discover students in your school network.</p>
            </div>
          )}
        </>
      )}

      <style>{`
        .explore-page { max-width: 1080px; margin: 0 auto; padding: 24px 16px 60px; }

        .explore-hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-end;
          padding: 10px 0 18px;
        }
        .explore-hero h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .explore-hero p {
          margin: 6px 0 0;
          color: var(--text-muted);
          max-width: 680px;
          line-height: 1.55;
        }
        .explore-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .explore-meta span {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .explore-search-panel {
          background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, transparent), transparent);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 16px;
          margin-bottom: 14px;
        }
        .explore-search-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }
        .explore-search {
          flex: 1;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 12px 16px;
          color: var(--text-primary);
          font-size: 0.95rem;
        }
        .btn-search {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 12px 18px;
          border-radius: 18px;
          cursor: pointer;
          font-weight: 700;
        }
        .btn-clear {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 11px 14px;
          border-radius: 18px;
          cursor: pointer;
        }

        .explore-segments {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .segment-pill {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .segment-pill.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .filter-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-select {
          min-width: 180px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 0.88rem;
        }

        .tags-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 18px;
          scrollbar-width: none;
        }
        .tags-scroll::-webkit-scrollbar { display: none; }
        .tag-pill {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 0.82rem;
          color: var(--text-secondary);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .tag-pill.active {
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          color: var(--accent);
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .tag-count { font-size: 0.72rem; opacity: 0.8; }

        .explore-section { margin-top: 8px; }
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .section-head h2 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
        }
        .section-head span {
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        .students-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .explore-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 14px;
        }
        .explore-skeleton {
          height: 240px;
          background: var(--bg-elevated);
          border-radius: 18px;
          animation: shimmer 1.5s infinite ease-in-out;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.82; }
        }

        .explore-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .explore-card.clickable {
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .explore-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }
        .explore-card-img {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }
        .explore-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .img-count {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .explore-card-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .explore-author {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .explore-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .explore-name {
          display: block;
          font-size: 0.86rem;
          font-weight: 700;
        }
        .explore-time {
          display: block;
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .explore-exam-tag {
          margin-left: auto;
          background: color-mix(in srgb, #7c3aed 12%, transparent);
          color: #7c3aed;
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .explore-subject {
          align-self: flex-start;
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          color: var(--accent);
          border-radius: 999px;
          padding: 4px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .explore-content {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.55;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .explore-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .etag {
          color: var(--accent);
          font-size: 0.78rem;
          font-weight: 600;
        }
        .explore-actions {
          display: flex;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
          margin-top: auto;
        }
        .eaction {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 0.84rem;
          padding: 2px 0;
        }
        .eaction.liked { color: #e11d48; font-weight: 700; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 54px 22px;
          gap: 12px;
          color: var(--text-muted);
          text-align: center;
          border: 1px dashed var(--border);
          border-radius: 18px;
          background: color-mix(in srgb, var(--bg-elevated) 72%, transparent);
        }
        .empty-state.compact {
          padding: 28px 18px;
          margin-bottom: 20px;
        }
        .empty-state span {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .empty-state p {
          margin: 0;
          max-width: 460px;
        }

        .load-more {
          display: block;
          margin: 20px auto 0;
          padding: 12px 24px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 999px;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
        }

        @media (max-width: 720px) {
          .explore-hero {
            flex-direction: column;
            align-items: flex-start;
          }
          .explore-meta {
            justify-content: flex-start;
          }
          .explore-search-row {
            flex-wrap: wrap;
          }
          .btn-search, .btn-clear {
            flex: 1;
          }
          .filter-select {
            width: 100%;
          }
          .explore-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
