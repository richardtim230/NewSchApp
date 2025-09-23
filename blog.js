// Updated blog.js for optimized backend usage and efficient network

const API_URL = "https://examguide.onrender.com/api/blogger-dashboard/public/posts";
const COUNT_URL = "https://examguide.onrender.com/api/blogger-dashboard/public/posts/count";
const POSTS_PER_PAGE = 20;

// Store blogs globally for sorting
let blogPosts = [];
let currentCategory = 'General';
let currentPage = 1;
let totalPages = 1;

// Show loader at start
document.getElementById('blogLoader').style.display = "flex";
document.getElementById('blogGrid').style.display = "none";

// Read page from URL
function getPageFromURL() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('page')) || 1;
}

// Set page in URL
function setPageInURL(page) {
  const params = new URLSearchParams(window.location.search);
  params.set('page', page);
  window.location.search = params.toString(); // reloads page
}

// Fetch total count for pagination (async, returns int)
async function fetchTotalCount(category = 'General') {
  try {
    const res = await fetch(`${COUNT_URL}?category=${encodeURIComponent(category)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 0;
  }
}

// Main optimized fetch function
async function fetchBlogPosts(category = 'General', setActiveTab = false, tabBtn = null) {
  document.getElementById('blogLoader').style.display = "flex";
  document.getElementById('blogGrid').style.display = "none";

  currentPage = getPageFromURL();
  currentCategory = category;

  // Fetch posts and total count in parallel for speed
  const [postsRes, totalCount] = await Promise.all([
    fetch(`${API_URL}?category=${encodeURIComponent(category)}&page=${currentPage}&limit=${POSTS_PER_PAGE}`),
    fetchTotalCount(category)
  ]);

  try {
    if (!postsRes.ok) throw new Error("Could not fetch blogs");
    const data = await postsRes.json();

    // Map backend data to frontend format
    blogPosts = data.map(post => ({
      id: post._id,
      title: post.title,
      category: post.category || "General",
      author: post.author,
      authorAvatar: post.authorAvatar,
      date: post.date ? new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "",
      images: Array.isArray(post.images) && post.images.length ? post.images : (post.imageUrl ? [post.imageUrl] : ["oaugate-1140x570.jpg"]),
      summary: post.content ? post.content.replace(/<[^>]+>/g, '').substring(0, 120) + "..." : "",
      content: post.content || "",
      reads: post.views || 0,
      rating: post.likes ? (Math.min(5, 3 + (post.likes / 20))).toFixed(1) : 4.5,
      comments: typeof post.comments === "number" ? post.comments : 0,
      featured: post.featured || false,
      userId: post.authorId
    }));

    // Total pages for pagination
    totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

    renderBlogs(blogPosts);

    if (setActiveTab && tabBtn) setActiveCategoryTab(tabBtn);

  } catch (e) {
    document.getElementById('blogGrid').innerHTML = `<div class='col-span-3 text-center text-gray-500 py-10'>Could not load blog posts.</div>`;
    totalPages = 1;
  }

  document.getElementById('blogLoader').style.display = "none";
  document.getElementById('blogGrid').style.display = "grid";
}

// PATCH increment read count for a post
async function incrementReadCount(postId) {
  try {
    await fetch(`https://examguide.onrender.com/api/blogger-dashboard/increment-views/${postId}`, {
      method: "PATCH"
    });
  } catch {}
}

function renderBlogs(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = "";

  // Paginate the posts
  const pagePosts = posts;

  if (pagePosts.length === 0) {
    grid.innerHTML = "<div class='col-span-3 text-center text-gray-500 py-10'>No blog posts found.</div>";
  } else {
    pagePosts.forEach(blog => {
      let imagesArr = blog.images && Array.isArray(blog.images) ? blog.images : [];
      if (!imagesArr.length || !imagesArr[0]) imagesArr = ['oaugate-1140x570.jpg'];

      grid.innerHTML += `
      <div class="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden hover:scale-[1.025] hover:shadow-2xl transition-all duration-200 border border-gray-100 group relative">
        <div class="relative">
          <img 
            src="${imagesArr[0]}" 
            alt="${blog.title}" 
            class="w-full max-h-72 object-contain rounded-lg mb-3 group-hover:scale-105 transition bg-gray-50" 
            loading="lazy"
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
  renderPagination(totalPages);
}

// Render the pagination buttons
function renderPagination(totalPages) {
  const pag = document.getElementById('blogPagination');
  if (!pag) return;
  pag.innerHTML = '';
  if (totalPages <= 1) {
    pag.innerHTML = `<button class="bg-yellow-500 text-blue-900 px-4 py-2 rounded font-bold">1</button>`;
    return;
  }
  // Prev
  pag.innerHTML += `<button onclick="setPageInURL(${Math.max(1, currentPage-1)})" class="bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition"${currentPage===1 ? ' disabled' : ''}>Prev</button>`;
  // Numbered pages (show max 5 at a time)
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) {
    if (i === currentPage) {
      pag.innerHTML += `<button class="bg-yellow-500 text-blue-900 px-4 py-2 rounded font-bold">${i}</button>`;
    } else {
      pag.innerHTML += `<button onclick="setPageInURL(${i})" class="bg-white border px-4 py-2 rounded text-blue-900 hover:bg-yellow-100 transition">${i}</button>`;
    }
  }
  // Next
  pag.innerHTML += `<button onclick="setPageInURL(${Math.min(totalPages, currentPage+1)})" class="bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition"${currentPage===totalPages ? ' disabled' : ''}>Next</button>`;
}

// Handler for Read & Earn button
async function onReadAndEarn(postId) {
  // Find and update read count in UI optimistically
  const countSpan = document.getElementById('read-count-' + postId);
  if (countSpan) {
    let num = parseInt(countSpan.textContent, 10);
    if (!isNaN(num)) countSpan.textContent = num + 1;
  }
  await incrementReadCount(postId);
  window.location = `campus-news-update?id=${postId}`;
}

// FILTER BY CATEGORY & set active tab
function filterBlogCategory(cat, btn) {
  setActiveCategoryTab(btn);
  // Remove ?page=... from URL
  const params = new URLSearchParams(window.location.search);
  params.delete('page');
  window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
  fetchBlogPosts(cat, false);
}

// Set active tab visual state
function setActiveCategoryTab(activeBtn) {
  document.querySelectorAll('.category-tab').forEach(btn => {
    btn.classList.remove('bg-blue-900', 'text-white', 'font-bold', 'active');
    btn.classList.remove('bg-yellow-500', 'text-blue-900');
    btn.classList.add('bg-yellow-100', 'text-yellow-700');
  });
  if (activeBtn) {
    activeBtn.classList.remove('bg-yellow-100', 'text-yellow-700');
    activeBtn.classList.add('bg-blue-900', 'text-white', 'font-bold', 'active');
  }
}

// SORT BLOGS
document.getElementById('blogSortSelect').addEventListener('change', function(e){
  let sorted = [...blogPosts];
  if (this.value === 'popular') sorted.sort((a, b) => b.reads - a.reads);
  else if (this.value === 'highest') sorted.sort((a, b) => b.rating - a.rating);
  else sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Remove ?page=... from URL
  const params = new URLSearchParams(window.location.search);
  params.delete('page');
  window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
  renderBlogs(sorted);
});

// DARK MODE
document.getElementById('darkToggle').addEventListener('click', function() {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('text-gray-100');
});

// INIT: show only General category by default and set active tab/page
window.addEventListener('DOMContentLoaded', function() {
  currentPage = getPageFromURL();
  setActiveCategoryTab(document.querySelector('.category-tab'));
  fetchBlogPosts('General');
});

// Close modal when clicking outside (post blog)
document.querySelectorAll('[data-modal-hide="post-blog-modal"]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById('post-blog-modal').classList.add('hidden'));
});
document.getElementById('post-blog-modal').addEventListener('click', function(e){
  if(e.target === this) this.classList.add('hidden');
});
