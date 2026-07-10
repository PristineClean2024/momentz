'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const STORAGE_BUCKET = 'media';
const GUEST_ID_KEY = 'momentz_guest_id';

function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function escapeHtml(s) {
  return s;
}

// Downscale + compress an image in the browser before upload, so a phone
// photo (often 4-8MB) doesn't take forever to upload on a guest's connection.
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({ reminders_email: true, reminders_sms: false });
  const [currentGuestId, setCurrentGuestId] = useState(null);
  const [tab, setTab] = useState('feed');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const fetchAll = useCallback(async () => {
    const [g, p, allowed, likes, comments, s] = await Promise.all([
      supabase.from('guests').select('*').order('created_at'),
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('post_allowed_guests').select('*'),
      supabase.from('likes').select('*'),
      supabase.from('comments').select('*').order('created_at'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);

    const allowedByPost = {};
    (allowed.data || []).forEach((r) => {
      (allowedByPost[r.post_id] ||= []).push(r.guest_id);
    });
    const likesByPost = {};
    (likes.data || []).forEach((r) => {
      (likesByPost[r.post_id] ||= []).push(r.guest_id);
    });
    const commentsByPost = {};
    (comments.data || []).forEach((r) => {
      (commentsByPost[r.post_id] ||= []).push(r);
    });

    const merged = (p.data || []).map((post) => ({
      ...post,
      allowedIds: allowedByPost[post.id] || [],
      likeIds: likesByPost[post.id] || [],
      comments: commentsByPost[post.id] || [],
    }));

    setGuests(g.data || []);
    setPosts(merged);
    if (s.data) setSettings(s.data);
  }, []);

  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(GUEST_ID_KEY) : null;
    if (savedId) setCurrentGuestId(savedId);

    fetchAll().finally(() => setLoading(false));

    const channel = supabase
      .channel('momentz-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_allowed_guests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const currentGuest = guests.find((g) => g.id === currentGuestId);

  async function handleJoin({ name, bio, avatarFile }) {
    let avatar_url = null;
    if (avatarFile) {
      const compressed = await compressImage(avatarFile, 400, 0.85);
      const path = `avatars/${crypto.randomUUID()}-${compressed.name}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed);
      if (upErr) {
        showToast('Could not upload photo, joining without one.');
      } else {
        avatar_url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    }
    const { data, error } = await supabase
      .from('guests')
      .insert({ name, bio, avatar_url })
      .select()
      .single();
    if (error) {
      showToast('Something went wrong joining. Try again.');
      return;
    }
    localStorage.setItem(GUEST_ID_KEY, data.id);
    setCurrentGuestId(data.id);
    await fetchAll();
  }

  async function handleAddPost({ file, caption, visibility, allowedIds }) {
    const isVideo = file.type.startsWith('video/');
    const uploadFile = isVideo ? file : await compressImage(file);
    const path = `posts/${crypto.randomUUID()}-${uploadFile.name}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, uploadFile);
    if (upErr) {
      showToast('Upload failed: ' + upErr.message);
      return false;
    }
    const media_url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: currentGuestId,
        media_url,
        media_type: isVideo ? 'video' : 'image',
        caption,
        visibility,
      })
      .select()
      .single();
    if (error) {
      showToast('Could not save post: ' + error.message);
      return false;
    }
    if (visibility === 'private' && allowedIds.length > 0) {
      await supabase
        .from('post_allowed_guests')
        .insert(allowedIds.map((guest_id) => ({ post_id: post.id, guest_id })));
    }
    await fetchAll();
    showToast('Added to the album!');
    return true;
  }

  async function toggleLike(post) {
    const liked = post.likeIds.includes(currentGuestId);
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('guest_id', currentGuestId);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, guest_id: currentGuestId });
    }
    await fetchAll();
  }

  async function addComment(postId, text) {
    if (!text.trim()) return;
    await supabase.from('comments').insert({ post_id: postId, author_id: currentGuestId, text });
    await fetchAll();
  }

  async function updateSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await supabase.from('settings').update({ [key]: value }).eq('id', 1);
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied — send it to your guests!');
  }

  if (loading) {
    return <div className="spinner-text">Loading Momentz…</div>;
  }

  if (!currentGuestId || !currentGuest) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  const visiblePosts = posts.filter(
    (p) => p.visibility === 'public' || p.author_id === currentGuestId || p.allowedIds.includes(currentGuestId)
  );
  const postedIds = new Set(posts.map((p) => p.author_id));
  const pendingGuests = guests.filter((g) => !postedIds.has(g.id));

  return (
    <div id="app">
      <header className="top">
        <div className="brand">Momentz · by Crystal Clear Company</div>
        <h1>Our Wedding Memories</h1>
        <div className="sub">
          {guests.length} guest{guests.length === 1 ? '' : 's'} · {posts.length} memor
          {posts.length === 1 ? 'y' : 'ies'} shared
        </div>
        <div className="share-row">
          <button onClick={copyInviteLink}>Copy invite link</button>
        </div>
      </header>

      <nav className="tabs">
        {[
          ['feed', 'Feed'],
          ['people', 'People'],
          ['reminders', 'Reminders'],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'feed' && (
          <Feed
            posts={visiblePosts}
            guests={guests}
            currentGuestId={currentGuestId}
            onLike={toggleLike}
            onComment={addComment}
          />
        )}
        {tab === 'people' && <People guests={guests} currentGuestId={currentGuestId} postedIds={postedIds} />}
        {tab === 'reminders' && (
          <Reminders settings={settings} onToggle={updateSetting} pendingGuests={pendingGuests} />
        )}
      </main>

      <button className="fab" title="Add a memory" onClick={() => setShowModal(true)}>
        +
      </button>

      {showModal && (
        <AddMemoryModal
          guests={guests.filter((g) => g.id !== currentGuestId)}
          onClose={() => setShowModal(false)}
          onSubmit={async (payload) => {
            const ok = await handleAddPost(payload);
            if (ok) setShowModal(false);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function JoinScreen({ onJoin }) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }
    setSubmitting(true);
    await onJoin({ name: name.trim(), bio: bio.trim(), avatarFile });
    setSubmitting(false);
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <span className="eyebrow">Momentz · Crystal Clear Company</span>
        <h2>Join the album</h2>
        <p className="lead">Add your name and a photo so everyone knows whose memories are whose.</p>
        <div className="avatar-picker">
          <div className="avatar">
            {avatarPreview ? <img src={avatarPreview} alt="" /> : '＋'}
          </div>
          <button type="button" onClick={() => document.getElementById('avatarFile').click()}>
            Add photo
          </button>
          <input id="avatarFile" type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </div>
        <label className="field">Your name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Carter" />
        <label className="field">A line about you (optional)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bride's college roommate, here for the cake 🍰"
        />
        <button className="btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? 'Joining…' : 'Join album'}
        </button>
      </div>
    </div>
  );
}

function Feed({ posts, guests, currentGuestId, onLike, onComment }) {
  if (posts.length === 0) {
    return (
      <div className="empty">
        <div className="display">No memories yet</div>
        <div>Tap the + button to add the first photo or video.</div>
      </div>
    );
  }
  return posts.map((post) => (
    <PostCard
      key={post.id}
      post={post}
      author={guests.find((g) => g.id === post.author_id)}
      guests={guests}
      currentGuestId={currentGuestId}
      onLike={onLike}
      onComment={onComment}
    />
  ));
}

function PostCard({ post, author, guests, currentGuestId, onLike, onComment }) {
  const [commentText, setCommentText] = useState('');
  const liked = post.likeIds.includes(currentGuestId);
  const isPrivate = post.visibility === 'private';

  return (
    <article className="post">
      <div className="post-head">
        <div className="avatar">
          {author?.avatar_url ? <img src={author.avatar_url} alt="" /> : initials(author?.name || '?')}
        </div>
        <div>
          <div className="who">{author?.name || 'Unknown guest'}</div>
          <div className="when">{timeAgo(post.created_at)}</div>
        </div>
        <div className={`ribbon ${isPrivate ? 'private' : 'public'}`}>{isPrivate ? 'Private' : 'Everyone'}</div>
      </div>
      <div className="media-wrap">
        {post.media_type === 'video' ? (
          <video src={post.media_url} controls playsInline />
        ) : (
          <img src={post.media_url} alt="wedding memory" />
        )}
      </div>
      {post.caption && (
        <div className="caption">
          <b>{author?.name}</b> {escapeHtml(post.caption)}
        </div>
      )}
      <div className="actions">
        <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={() => onLike(post)}>
          <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
          {post.likeIds.length > 0 ? post.likeIds.length : ''}
        </button>
        <span style={{ fontSize: 12, color: 'rgba(34,38,43,0.5)' }}>
          {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="comments">
        {post.comments.map((c) => (
          <div className="comment" key={c.id}>
            <b>{guests.find((g) => g.id === c.author_id)?.name || 'Guest'}</b>
            {c.text}
          </div>
        ))}
        <div className="comment-form">
          <input
            type="text"
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onComment(post.id, commentText);
                setCommentText('');
              }
            }}
          />
          <button
            onClick={() => {
              onComment(post.id, commentText);
              setCommentText('');
            }}
          >
            Post
          </button>
        </div>
      </div>
    </article>
  );
}

function People({ guests, currentGuestId, postedIds }) {
  return guests.map((g) => {
    const posted = postedIds.has(g.id);
    return (
      <div className="person-card" key={g.id}>
        <div className="avatar">{g.avatar_url ? <img src={g.avatar_url} alt="" /> : initials(g.name)}</div>
        <div>
          <div className="name">
            {g.name}
            {g.id === currentGuestId ? ' (you)' : ''}
          </div>
          <div className="bio">{g.bio || 'No bio yet'}</div>
        </div>
        <div className={`status-dot ${posted ? 'posted' : 'pending'}`} />
        <span className="status-label">{posted ? 'shared' : 'no posts yet'}</span>
      </div>
    );
  });
}

function Reminders({ settings, onToggle, pendingGuests }) {
  return (
    <>
      <div className="card">
        <span className="eyebrow">Weekly Nudge</span>
        <h3>Auto-reminders</h3>
        <p>Anyone who hasn&apos;t shared a photo or video yet gets a friendly link once a week.</p>
        <ToggleRow
          label="Send weekly email reminder"
          value={settings.reminders_email}
          onChange={(v) => onToggle('reminders_email', v)}
        />
        <ToggleRow
          label="Also send by text (SMS)"
          value={settings.reminders_sms}
          onChange={(v) => onToggle('reminders_sms', v)}
        />
        <div className="note">
          These toggles are saved. Actually sending the weekly email/SMS needs the scheduled function described in
          the README (Phase 2) — it&apos;s not wired up yet.
        </div>
      </div>
      <div className="card">
        <h3>Who&apos;d get nudged this week</h3>
        {pendingGuests.length === 0 ? (
          <p>Everyone has shared at least one memory — no reminders needed 🎉</p>
        ) : (
          pendingGuests.map((g) => (
            <span className="pill" key={g.id}>
              {g.name}
            </span>
          ))
        )}
      </div>
    </>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span style={{ fontSize: 13 }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 20,
          background: value ? '#5F8A7C' : '#EDE6D9',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
          }}
        />
      </div>
    </div>
  );
}

function AddMemoryModal({ guests, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [allowedIds, setAllowedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      alert('That file is over 50MB. Try a shorter video or a smaller export.');
      return;
    }
    setFile(f);
    setFileName(f.name);
  }

  function toggleAllowed(id) {
    setAllowedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!file) return;
    setSubmitting(true);
    await onSubmit({ file, caption, visibility, allowedIds });
    setSubmitting(false);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>
          ✕
        </button>
        <span className="eyebrow">New Memory</span>
        <h2>Add a photo or video</h2>
        <label className="field">Media</label>
        <div
          className={`file-drop ${file ? 'has-file' : ''}`}
          onClick={() => document.getElementById('mediaFile').click()}
        >
          {fileName || 'Tap to choose a photo or video'}
        </div>
        <input id="mediaFile" type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={onFile} />

        <label className="field">Caption (optional)</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="First dance, best moment of the night…"
        />

        <label className="field">Who can see this</label>
        <div className="vis-options">
          <div
            className={`vis-opt ${visibility === 'public' ? 'selected' : ''}`}
            onClick={() => setVisibility('public')}
          >
            Everyone
          </div>
          <div
            className={`vis-opt ${visibility === 'private' ? 'selected' : ''}`}
            onClick={() => setVisibility('private')}
          >
            Private — select people
          </div>
        </div>
        {visibility === 'private' && (
          <div className="people-select">
            {guests.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(34,38,43,0.5)', padding: 6 }}>
                No other guests have joined yet.
              </div>
            ) : (
              guests.map((g) => (
                <label key={g.id}>
                  <input
                    type="checkbox"
                    checked={allowedIds.includes(g.id)}
                    onChange={() => toggleAllowed(g.id)}
                  />
                  {g.name}
                </label>
              ))
            )}
          </div>
        )}
        <button className="btn-primary" disabled={!file || submitting} onClick={submit}>
          {submitting ? 'Uploading…' : 'Share to album'}
        </button>
      </div>
    </div>
  );
}
