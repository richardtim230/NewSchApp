// blog-detail.js -- Ultra-fast blog details page, always uses new endpoints

const API_BASE = "https://examguard-jmvj.onrender.com/api";
const POSTS_API = API_BASE + "/public/posts";
const USERS_API = API_BASE + "/users";
const COMMENTS_API = API_BASE + "/posts";

// --- Efficient endpoints ---
async function fetchMainPost(postId) {
  const res = await fetch(`${POSTS_API}/${postId}`);
  return res.ok ? await res.json() : null;
}
async function fetchUserInfo(userId) {
  if (!userId) return {};
  try {
    const res = await fetch(`${USERS_API}/${userId}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.user || data;
  } catch {
    return {};
  }
}
async function likePost(postId) {
  const res = await fetch(`${COMMENTS_API}/${postId}/like`, { method: "PATCH" });
  return res.ok ? (await res.json()).likes : null;
}
async function likeComment(postId, commentId) {
  const res = await fetch(`${COMMENTS_API}/${postId}/comments/${commentId}/like`, { method: "PATCH" });
  return res.ok ? (await res.json()).likes : null;
}
async function addCommentToBackend(postId, userId, name, text, parentId = null) {
  try {
    const res = await fetch(`${COMMENTS_API}/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text, user: userId, parentId })
    });
    if (!res.ok) throw new Error("Failed to add comment");
    return true;
  } catch {
    return false;
  }
}

// --- Utility ---
function getPostIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// --- Render comments (simple, no deep nesting for speed) ---
function renderComments(comments) {
  const list = document.getElementById("commentsList");
  if (!Array.isArray(comments) || comments.length === 0) {
    list.innerHTML = `<div class="text-gray-400 italic">No comments yet. Be the first to comment!</div>`;
    return;
  }
  comments = [...comments].sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = comments.filter(c => !c.parentId).map(c => renderCommentHTML(c, comments)).join('');
  attachCommentActionListeners();
}
function renderCommentHTML(comment, allComments) {
  const cid = comment._id || '';
  const likedKey = 'liked_comment_' + cid;
  const liked = localStorage.getItem(likedKey);
  return `
    <div class="comment-bubble" data-comment-id="${cid}">
      <div>
        <span class="comment-author">${comment.name || 'Anonymous'}</span>
        <span class="comment-date ml-2">${comment.date ? new Date(comment.date).toLocaleString() : ''}</span>
      </div>
      <div class="mt-1 text-gray-800">${comment.text}</div>
      <div class="comment-actions">
        <button class="like-btn ${liked ? 'liked' : ''}" data-comment-id="${cid}">
          <span class="like-count">${comment.likes || 0}</span>
        </button>
        <button class="reply-btn" data-comment-id="${cid}">Reply</button>
      </div>
      <div class="reply-form-container"></div>
    </div>
  `;
}
function attachCommentActionListeners() {
  document.querySelectorAll('.like-btn[data-comment-id]').forEach(btn => {
    btn.onclick = async function(e) {
      e.preventDefault();
      const commentId = this.getAttribute('data-comment-id');
      if (!commentId || localStorage.getItem('liked_comment_' + commentId)) return;
      this.disabled = true;
      const likeCountSpan = this.querySelector('.like-count');
      const newLikes = await likeComment(getPostIdFromURL(), commentId);
      if (newLikes !== null) {
        localStorage.setItem('liked_comment_' + commentId, '1');
        this.classList.add('liked');
        likeCountSpan.textContent = newLikes;
      }
      this.disabled = false;
    }
  });
  document.querySelectorAll('.reply-btn[data-comment-id]').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const commentId = this.getAttribute('data-comment-id');
      document.querySelectorAll('.reply-form-container').forEach(f => f.innerHTML = '');
      const parentBubble = this.closest('.comment-bubble');
      const container = parentBubble.querySelector('.reply-form-container');
      container.innerHTML = `
        <form class="reply-form" data-parent-id="${commentId}">
          <input type="text" name="name" placeholder="Your name" class="w-full px-2 py-1 mb-1 border rounded" required />
          <textarea name="text" rows="2" placeholder="Write a reply..." class="w-full px-2 py-1 border rounded" required></textarea>
          <div class="flex items-center gap-2">
            <button type="submit">Reply</button>
            <button type="button" class="cancel-reply-btn">Cancel</button>
          </div>
        </form>
      `;
      container.querySelector('form').onsubmit = async function(ev) {
        ev.preventDefault();
        const name = this.name.value.trim() || "Anonymous";
        const text = this.text.value.trim();
        if (!text) return;
        const ok = await addCommentToBackend(getPostIdFromURL(), null, name, text, commentId);
        if (ok) {
          const mainPost = await fetchMainPost(getPostIdFromURL());
          renderComments(mainPost && Array.isArray(mainPost.comments) ? mainPost.comments : []);
        }
      };
      container.querySelector('.cancel-reply-btn').onclick = function() {
        container.innerHTML = '';
      };
    }
  });
}

// --- NEW: Fetch related posts by category (excluding current post, optionally other subjects) ---
async function fetchRelatedPostsByCategory(category, excludeId, excludeSubject = null, limit = 4) {
  // Fetch up to 20 posts in this category
  const res = await fetch(`${POSTS_API}?category=${encodeURIComponent(category)}&limit=20`);
  if (!res.ok) return [];
  let posts = await res.json();
  // Exclude current post
  posts = posts.filter(p => p._id !== excludeId);
  // Optionally exclude same subject (if desired), otherwise comment out next line
  if (excludeSubject) posts = posts.filter(p => p.subject !== excludeSubject);
  return posts.slice(0, limit);
}

// --- Increment views count for consistency ---
async function incrementPostViews(postId) {
  // Use the public PATCH view endpoint
  const res = await fetch(`${POSTS_API}/${postId}/view`, { method: "PATCH" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.views ?? null;
}

// --- Main load function ---
(async function(){
  const postId = getPostIdFromURL();
  if (!postId) {
    document.getElementById('blogContent').innerHTML = `<div class="text-center text-gray-500 py-20">Blog post not found.</div>`;
    return;
  }

  // Fetch the main post
  let mainPost = await fetchMainPost(postId);
  if (!mainPost) {
    document.getElementById('blogContent').innerHTML = `<div class="text-center text-gray-500 py-20">Blog post not found.</div>`;
    return;
  }

  // Increment views count FIRST
  await incrementPostViews(postId);

  // Re-fetch the post to get the updated views count
  mainPost = await fetchMainPost(postId) || mainPost;

  // Format post details
  const authorId = mainPost.authorId || mainPost.user || mainPost.author; // fallback
  let authorData = {};
  if (authorId) {
    authorData = await fetchUserInfo(authorId);
  }

  const authorName = authorData.fullname || authorData.username || mainPost.authorName || "Anonymous";
  const date = mainPost.date ? new Date(mainPost.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "";
  const image = mainPost.imageUrl || "oaugate-1140x570.jpg";
  const category = mainPost.category || "General";
  const views = mainPost.views ?? 0;
  const likes = mainPost.likes ?? 0;
  const comments = Array.isArray(mainPost.comments) ? mainPost.comments : [];
  const content = mainPost.content || "";
  const title = mainPost.title || "";

  document.getElementById('blogContent').innerHTML = `
<div class="relative w-full mb-4">
  <img src="${image}" alt="${title}" class="w-full h-auto object-cover rounded-lg shadow" />
  <div class="flex items-center gap-3 mt-3">
    <button id="likePostBtn" class="flex items-center gap-2 px-4 py-2 bg-white border border-yellow-300 rounded-lg shadow-sm hover:bg-yellow-50 transition">
      <svg class="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2 21h4V9H2v12zM22 11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13 2 7.59 7.41C7.21 7.79 7 8.3 7 8.83V19c0 1.1.9 2 2 2h9c.82 0 1.54-.5 1.84-1.22l2.02-4.67c.09-.23.14[...]
      </svg>
      <span id="likePostCount" class="font-semibold text-gray-700">${likes}</span>
    </button>
    <button id="sharePostBtn" class="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-blue-900 font-bold rounded-lg hover:bg-yellow-500 transition">
      Share
    </button>
  </div>

  <h1 class="text-3xl font-extrabold text-blue-900 mb-2">${title}</h1>
  <div class="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
    <span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">${category}</span>
    <span>${authorName}</span>
    <span>• ${date}</span>
  </div>
  <div class="flex gap-4 text-xs text-gray-400 mb-6">
    <span>👁️ ${views} reads</span>
    <span>⭐ <span id="likePostCount2">${likes}</span> likes</span>
    <span>💬 ${comments.length} comments</span>
  </div>
  <div class="prose prose-lg max-w-none text-gray-900 mb-6">${content}</div>
</div>
`;

  // Author card rendering (visible and filled)
  if (authorId && authorData && (authorData.fullname || authorData.username)) {
    const authorCard = document.getElementById("authorCard");
    if (authorCard) {
      authorCard.classList.remove("hidden");
      authorCard.style.display = "block";
      document.getElementById("authorName").textContent = authorData.fullname || authorData.username || "Anonymous";
      document.getElementById("authorDept").textContent = 
        (authorData.department ? authorData.department + " Dept" : "") + 
        (authorData.faculty ? ", " + authorData.faculty : "");
      document.getElementById("authorBio").textContent = authorData.bio || "";
      document.getElementById("authorAvatar").src = authorData.profilePic
        ? (authorData.profilePic.startsWith("http") ? authorData.profilePic : authorData.profilePic)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorData.fullname || authorData.username || "Author")}&background=ffda00&color=263159&rounded=true`;
    }
  } else {
    // Hide card if not found
    const authorCard = document.getElementById("authorCard");
    if (authorCard) authorCard.style.display = "none";
  }

  document.getElementById('sharePostBtn').onclick = function() {
    const postUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: postUrl });
    } else {
      navigator.clipboard.writeText(postUrl);
      showNotificationModal('Link Copied', 'Post link copied to clipboard.', 'success');
    }
  };
  document.getElementById('likePostBtn').addEventListener('click', async function() {
    if (localStorage.getItem('liked_post_' + postId)) return;
    this.disabled = true;
    const newLikes = await likePost(postId);
    if (newLikes !== null) {
      localStorage.setItem('liked_post_' + postId, '1');
      document.getElementById('likePostBtn').classList.add('liked');
      document.getElementById('likePostCount').textContent = newLikes;
      document.getElementById('likePostCount2').textContent = newLikes;
    }
    this.disabled = false;
  });

  // Render comments
  renderComments(comments);

  // Comments submit handler
  if (document.getElementById("commentForm")) {
    document.getElementById("commentForm").onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById("commentName").value.trim() || "Anonymous";
      const text = document.getElementById("commentText").value.trim();
      if (!text) return;
      const userId = null;
      const ok = await addCommentToBackend(postId, userId, name, text);
      if (ok) {
        const updated = await fetchMainPost(postId);
        renderComments(updated && Array.isArray(updated.comments) ? updated.comments : []);
        this.reset();
      } else {
        alert("Failed to add comment. Please try again.");
      }
    };
  }

  // --- Related posts section ---
  // If you want to exclude same subject, pass mainPost.subject as third argument below
  const related = await fetchRelatedPostsByCategory(mainPost.category, postId, null, 4);
  const relatedGrid = document.getElementById('relatedPosts');
  if (relatedGrid) {
    if (related.length === 0) {
      relatedGrid.innerHTML = `<div class="text-gray-400">No related posts found.</div>`;
    } else {
      relatedGrid.innerHTML = related.map(blog => `
        <a href="blog-details.html?id=${blog._id}" class="block bg-white rounded-xl shadow hover:shadow-xl overflow-hidden transition group">
          <img src="${blog.imageUrl || "https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80"}"
               alt="${blog.title}" class="h-auto w-full object-cover group-hover:scale-105 transition" />
          <div class="p-4">
            <h3 class="font-bold text-blue-900 text-lg mb-1 line-clamp-2">${blog.title}</h3>
            <div class="flex items-center text-yellow-500 text-base font-bold mb-1">${blog.category || "General"}</div>
            <div class="text-xs text-gray-400 mb-2">${blog.authorName || "Anonymous"} • ${blog.date ? new Date(blog.date).toLocaleDateString() : ""}</div>
            <p class="text-gray-600 mb-2 line-clamp-2">${blog.content ? blog.content.substring(0, 80) + "..." : ""}</p>
            <div class="flex gap-2 text-xs text-gray-400">
              <span>👁️ ${blog.views ?? 0}</span>
              <span>⭐ ${blog.likes ?? 0}</span>
              <span>💬 ${Array.isArray(blog.comments) ? blog.comments.length : 0}</span>
            </div>
          </div>
        </a>
      `).join('');
    }
  }

  // Inject Blog Post Schema Markup after mainPost is ready
  injectBlogPostJsonLD({
    title: mainPost.title,
    image: mainPost.imageUrl,
    author: authorName,
    datePublished: mainPost.date,
    description: mainPost.summary || (mainPost.content ? mainPost.content.substring(0, 120) + "..." : "")
  });

})();

// --- Inject Blog Post JSON-LD Schema
function injectBlogPostJsonLD({ title, image, author, datePublished, description }) {
  const oldLd = document.getElementById('blog-post-json-ld');
  if (oldLd) oldLd.remove();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "image": image,
    "author": {
      "@type": "Person",
      "name": author
    },
    "datePublished": datePublished,
    "publisher": {
      "@type": "Organization",
      "name": "OAU ExamGuard",
      "logo": {
        "@type": "ImageObject",
        "url": "https://oau.examguard.com.ng/logo.png"
      }
    },
    "description": description
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'blog-post-json-ld';
  script.textContent = JSON.stringify(jsonLd, null, 2);
  document.head.appendChild(script);
}

function showNotificationModal(title, message, type = "info") {
  // Use your modal, or simply alert for now
  alert(title + ": " + message);
}
