const API_URL = "https://examguide.onrender.com/api/blogger-dashboard/allposts";
const USER_API = "https://examguide.onrender.com/api/users/";

const POSTS_PER_PAGE = 5;
const STORAGE_POSTS_KEY = "oau_blogs_posts";
const STORAGE_AUTHORS_KEY = "oau_blogs_authors";
const STORAGE_CATEGORY_KEY = "oau_blogs_category";
const STORAGE_PAGE_KEY = "oau_blogs_page";

let blogPosts = [];
let filteredBlogs = [];
let authorsCache = {};

function saveState(category, page) {
  localStorage.setItem(STORAGE_CATEGORY_KEY, category);
  localStorage.setItem(STORAGE_PAGE_KEY, page);
}

function loadState() {
  const category = localStorage.getItem(STORAGE_CATEGORY_KEY) || "General";
  const page = parseInt(localStorage.getItem(STORAGE_PAGE_KEY) || "1");
  return { category, page };
}

function fetchAndCacheBlogPosts() {
  document.getElementById('blogLoader').style.display = "flex";
  document.getElementById('blogGrid').style.display = "none";
  fetch(API_URL)
    .then(res => res.json())
    .then(async data => {
      const authorIds = [...new Set(data.map(post => post.authorId || post.user).filter(Boolean))];
      let tempAuthorsCache = {};
      await Promise.all(authorIds.map(async uid => {
        try {
          const resp = await fetch(USER_API + uid);
          if (!resp.ok) return;
          const d = await resp.json();
          tempAuthorsCache[uid] = {
            name: d.user?.fullname || d.user?.username || "Anonymous",
            avatar: d.user?.profilePic
              ? (d.user.profilePic.startsWith("http") ? d.user.profilePic : d.user.profilePic)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user?.fullname || d.user?.username || "A")}&background=FFCE45&color=263159&rounded=true`
          };
        } catch { }
      }));
      blogPosts = data.map(post => {
        const userId = post.authorId || post.user;
        const authorData = userId && tempAuthorsCache[userId] ? tempAuthorsCache[userId] : { name: "Anonymous", avatar: "https://ui-avatars.com/api/?name=A&background=FFCE45&color=263159&rounded=true" };
        return {
          id: post._id,
          title: post.title,
          category: post.category || "General",
          author: authorData.name,
          authorAvatar: authorData.avatar,
          date: post.date ? new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "",
          image: post.images || "oaugate-1140x570.jpg",
          summary: post.content ? post.content.replace(/<[^>]+>/g, '').substring(0, 120) + "..." : "",
          content: post.content || "",
          reads: post.views || 0,
          rating: post.likes ? (Math.min(5, 3 + (post.likes / 20))).toFixed(1) : 4.5,
          comments: Array.isArray(post.comments) ? post.comments.length : 0,
          featured: post.featured || false,
          userId
        };
      });
      localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(blogPosts));
      localStorage.setItem(STORAGE_AUTHORS_KEY, JSON.stringify(tempAuthorsCache));
      const { category, page } = loadState();
      filterBlogCategory(category, true, page);
    })
    .catch(() => {
      document.getElementById('blogGrid').innerHTML = `<div class='col-span-3 text-center text-gray-500 py-10'>Could not load blog posts.</div>`;
      document.getElementById('blogLoader').style.display = "none";
      document.getElementById('blogGrid').style.display = "grid";
    });
}

function loadPostsFromStorage() {
  const posts = localStorage.getItem(STORAGE_POSTS_KEY);
  const authors = localStorage.getItem(STORAGE_AUTHORS_KEY);
  if (posts) blogPosts = JSON.parse(posts);
  if (authors) authorsCache = JSON.parse(authors);
}

function renderBlogs(posts, currentPage) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE;
  const endIdx = startIdx + POSTS_PER_PAGE;
  const pagePosts = posts.slice(startIdx, endIdx);

  grid.innerHTML = "";
  if (pagePosts.length === 0) {
    grid.innerHTML = "<div class='col-span-3 text-center text-gray-500 py-10'>No blog posts found.</div>";
  } else {
    pagePosts.forEach(blog => {
      let imagesArr = [];
      if (Array.isArray(blog.image)) imagesArr = blog.image;
      else if (Array.isArray(blog.images)) imagesArr = blog.images;
      else if (typeof blog.image === "string" && blog.image.startsWith("data:image")) imagesArr = [blog.image];
      else if (typeof blog.images === "string" && blog.images.startsWith("data:image")) imagesArr = [blog.images];
      else if (blog.imageUrl && blog.imageUrl.startsWith("data:image")) imagesArr = [blog.imageUrl];
      else if (blog.imageUrl) imagesArr = [blog.imageUrl];
      else if (typeof blog.image === "string" && blog.image) imagesArr = [blog.image];
      if (!imagesArr.length || !imagesArr[0]) imagesArr = ['oaugate-1140x570.jpg'];
      grid.innerHTML += `
      <div class="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden hover:scale-[1.025] hover:shadow-2xl transition-all duration-200 border border-gray-100 group relative">
        <div class="relative">
          <img 
            src="${imagesArr[0]}" 
            alt="${blog.title}" 
            class="w-full max-h-72 object-contain rounded-lg mb-3 group-hover:scale-105 transition bg-gray-50" 
          />
          ${blog.featured ? `<span class="absolute top-4 left-4 bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">Featured</span>` : ''}
        </div>
        <div class="flex-1 flex flex-col px-5 pt-4 pb-5">
          <div class="flex items-center gap-2 mb-3">
            <img src="${blog.authorAvatar}" alt="${blog.author}" class="w-8 h-8 rounded-full border-2 border-yellow-300 object-cover bg-white" loading="lazy" />
            <span class="font-semibold text-blue-900 text-sm mr-2">${blog.author}</span>
            <span class="text-xs text-gray-400">&bull; ${blog.date}</span>
            <span class="ml-auto bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">${blog.category}</span>
          </div>
          <h3 class="font-bold text-blue-900 text-xl mb-1 transition-colors group-hover:text-yellow-600">${blog.title}</h3>
          <p class="text-gray-600 mb-3 line-clamp-3 text-sm">${blog.summary}</p>
          <div class="flex gap-4 items-center text-xs text-gray-500 mb-4 mt-auto">
            <span title="Views">👁️ <span id="read-count-${blog.id}">${blog.reads}</span></span>
            <span title="Rating">⭐ ${blog.rating}</span>
            <span title="Comments">💬 ${blog.comments}</span>
          </div>
          <button 
            type="button"
            onclick="onReadAndEarn('${blog.id}')"
            class="w-full bg-yellow-500 text-blue-900 px-4 py-2 rounded-lg font-bold hover:bg-blue-900 hover:text-yellow-400 transition mt-auto focus:outline-none focus:ring-2 focus:ring-yellow-300"
            aria-label="Read full blog post by ${blog.author}">
            Read & Earn
          </button>
        </div>
      </div>
      `;
    });
  }
  renderPagination(posts.length, totalPages, currentPage);
  document.getElementById('blogLoader').style.display = "none";
  grid.style.display = "grid";
}

function renderPagination(totalPosts, totalPages, currentPage) {
  const paginationDiv = document.getElementById('blogPagination');
  if (!paginationDiv) return;
  paginationDiv.innerHTML = "";

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.type = "button";
  prevBtn.className = "bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition";
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      saveState(localStorage.getItem(STORAGE_CATEGORY_KEY), currentPage - 1);
      filterBlogCategory(localStorage.getItem(STORAGE_CATEGORY_KEY), true, currentPage - 1);
    }
  };
  paginationDiv.appendChild(prevBtn);

  // Page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.type = "button";
    if (i === currentPage) {
      btn.className = "bg-yellow-500 text-blue-900 px-4 py-2 rounded font-bold";
    } else {
      btn.className = "bg-white border px-4 py-2 rounded text-blue-900 hover:bg-yellow-100 transition";
    }
    btn.textContent = i;
    btn.onclick = () => {
      saveState(localStorage.getItem(STORAGE_CATEGORY_KEY), i);
      filterBlogCategory(localStorage.getItem(STORAGE_CATEGORY_KEY), true, i);
    };
    paginationDiv.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.type = "button";
  nextBtn.className = "bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition";
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      saveState(localStorage.getItem(STORAGE_CATEGORY_KEY), currentPage + 1);
      filterBlogCategory(localStorage.getItem(STORAGE_CATEGORY_KEY), true, currentPage + 1);
    }
  };
  paginationDiv.appendChild(nextBtn);
}

async function onReadAndEarn(postId) {
  const countSpan = document.getElementById('read-count-' + postId);
  if (countSpan) {
    let num = parseInt(countSpan.textContent, 10);
    if (!isNaN(num)) countSpan.textContent = num + 1;
  }
  await incrementReadCount(postId);
  window.location = `campus-news-update?id=${postId}`;
}

async function incrementReadCount(postId) {
  try {
    await fetch(`https://examguide.onrender.com/api/blogger-dashboard/increment-views/${postId}`, { method: "PATCH" });
  } catch {}
}

// FILTER BY CATEGORY
function filterBlogCategory(cat, skipTabUpdate = false, page = 1) {
  localStorage.setItem(STORAGE_CATEGORY_KEY, cat);
  localStorage.setItem(STORAGE_PAGE_KEY, page);
  if (!skipTabUpdate) setActiveTab(cat);

  loadPostsFromStorage();
  filteredBlogs = (cat === 'All') ? [...blogPosts] : blogPosts.filter(blog => blog.category === cat);
  renderBlogs(filteredBlogs, page);
}

// ACTIVE TAB UI CONTROL
function setActiveTab(category) {
  document.querySelectorAll('#blogTabs .blog-tab, #blogCategoryTabs .category-tab').forEach(btn => {
    btn.classList.remove('bg-blue-900', 'text-white', 'ring-2', 'ring-yellow-400', 'font-semibold', 'active');
    btn.classList.remove('bg-yellow-500', 'text-blue-900');
    btn.classList.add('bg-yellow-100', 'text-yellow-700');
    btn.classList.remove('bg-yellow-100', 'text-yellow-700');
    if ((btn.dataset && btn.dataset.cat === category) || btn.textContent.trim() === category) {
      btn.classList.remove('bg-yellow-100', 'text-yellow-700');
      btn.classList.add('bg-blue-900', 'text-white', 'ring-2', 'ring-yellow-400', 'font-semibold', 'active');
    }
  });
}

// Tab event listeners (make sure they use filterBlogCategory)
document.querySelectorAll('#blogTabs .blog-tab, #blogCategoryTabs .category-tab').forEach(btn => {
  btn.addEventListener('click', function() {
    saveState(this.dataset ? this.dataset.cat || this.textContent.trim() : this.textContent.trim(), 1);
    filterBlogCategory(this.dataset ? this.dataset.cat || this.textContent.trim() : this.textContent.trim(), false, 1);
  });
});

// Sort blogs
document.getElementById('blogSortSelect').addEventListener('change', function(e){
  let sorted = [...filteredBlogs];
  if (this.value === 'popular') sorted.sort((a, b) => b.reads - a.reads);
  else if (this.value === 'highest') sorted.sort((a, b) => b.rating - a.rating);
  else sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveState(localStorage.getItem(STORAGE_CATEGORY_KEY), 1);
  renderBlogs(sorted, 1);
  filteredBlogs = sorted;
});

// DARK MODE
document.getElementById('darkToggle').addEventListener('click', function() {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('text-gray-100');
});

// INIT: Try to load from storage, else fetch
const postsInStorage = localStorage.getItem(STORAGE_POSTS_KEY);
const { category, page } = loadState();
if (postsInStorage) {
  loadPostsFromStorage();
  filterBlogCategory(category, true, page);
} else {
  fetchAndCacheBlogPosts();
}

// Modal close logic (unchanged)
document.querySelectorAll('[data-modal-hide="post-blog-modal"]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById('post-blog-modal').classList.add('hidden'));
});
document.getElementById('post-blog-modal').addEventListener('click', function(e){
  if(e.target === this) this.classList.add('hidden');
});
