// ... keep your existing imports and constants

const API_URL = "https://examguide.onrender.com/api/blogger-dashboard/allposts";
const USER_API = "https://examguide.onrender.com/api/users/";

// Store blogs globally for filtering/sorting
let blogPosts = [];
let filteredBlogs = [];
let authorsCache = {};
let currentCategory = 'General';

// Pagination state
let currentPage = 1;
let totalPages = 1;
const PAGE_LIMIT = 9; // You can change this as needed

// Show loader at start
document.getElementById('blogLoader').style.display = "flex";
document.getElementById('blogGrid').style.display = "none";

// Fetch blogs with pagination and (optional) category
async function fetchBlogPosts(category = 'General', setActiveTab = false, tabBtn = null, page = 1) {
  document.getElementById('blogLoader').style.display = "flex";
  document.getElementById('blogGrid').style.display = "none";
  try {
    // Use pagination
    let url = `${API_URL}?page=${page}&limit=${PAGE_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch blogs");
    const data = await res.json();

    // data.posts = array of posts, data.total, data.page, data.totalPages
    const postsData = data.posts || [];
    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;

    // Get all unique authorIds
    const authorIds = [...new Set(postsData.map(post => post.authorId || post.user).filter(Boolean))];
    await Promise.all(authorIds.map(async uid => {
      if (authorsCache[uid]) return;
      try {
        const resp = await fetch(USER_API + uid);
        if (!resp.ok) return;
        const d = await resp.json();
        authorsCache[uid] = {
          name: d.user?.fullname || d.user?.username || "Anonymous",
          avatar: d.user?.profilePic
            ? (d.user.profilePic.startsWith("http") ? d.user.profilePic : d.user.profilePic)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user?.fullname || d.user?.username || "A")}&background=FFCE45&color=263159&rounded=true`
        };
      } catch { /* ignore error */ }
    }));

    // Transform data to fit the expected frontend fields
    blogPosts = postsData.map(post => {
      const userId = post.authorId || post.user;
      const authorData = userId && authorsCache[userId] ? authorsCache[userId] : { name: "Anonymous", avatar: "https://ui-avatars.com/api/?name=A&background=FFCE45&color=263159&rounded=true" };
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

    // Filter by category unless "All"
    if (category && category !== 'All') {
      filteredBlogs = blogPosts.filter(blog => blog.category === category);
    } else {
      filteredBlogs = [...blogPosts];
    }
    currentCategory = category;

    renderBlogs(filteredBlogs);
    renderPagination();

    // Set active tab visually if needed
    if (setActiveTab && tabBtn) {
      setActiveCategoryTab(tabBtn);
    }
  } catch (e) {
    document.getElementById('blogGrid').innerHTML = `<div class='col-span-3 text-center text-gray-500 py-10'>Could not load blog posts.</div>`;
    document.querySelector(".pagination")?.remove();
  }
  // Hide loader and show grid after loading
  document.getElementById('blogLoader').style.display = "none";
  document.getElementById('blogGrid').style.display = "grid";
}

// Render blogs as before
function renderBlogs(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = "";
  if (posts.length === 0) {
    grid.innerHTML = "<div class='col-span-3 text-center text-gray-500 py-10'>No blog posts found.</div>";
    return;
  }
  posts.forEach(blog => {
    // ... keep your existing rendering logic for each blog ...
    let imagesArr = [];
    if (Array.isArray(blog.image)) {
      imagesArr = blog.image;
    } else if (Array.isArray(blog.images)) {
      imagesArr = blog.images;
    } else if (typeof blog.image === "string" && blog.image.startsWith("data:image")) {
      imagesArr = [blog.image];
    } else if (typeof blog.images === "string" && blog.images.startsWith("data:image")) {
      imagesArr = [blog.images];
    } else if (blog.imageUrl && blog.imageUrl.startsWith("data:image")) {
      imagesArr = [blog.imageUrl];
    } else if (blog.imageUrl) {
      imagesArr = [blog.imageUrl];
    } else if (typeof blog.image === "string" && blog.image) {
      imagesArr = [blog.image];
    }
    if (!imagesArr.length || !imagesArr[0]) {
      imagesArr = ['oaugate-1140x570.jpg'];
    }

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

// Render dynamic pagination below the blog grid
function renderPagination() {
  // Remove old pagination if any
  document.querySelector(".pagination")?.remove();

  // Only show if more than one page
  if (totalPages < 2) return;

  // Create container
  const pagDiv = document.createElement("div");
  pagDiv.className = "flex justify-center mt-8 gap-2 pagination";

  // Prev button
  const prevBtn = document.createElement("button");
  prevBtn.className = `bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition${currentPage === 1 ? " opacity-50 cursor-not-allowed" : ""}`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.textContent = "Prev";
  prevBtn.onclick = () => {
    if (currentPage > 1) fetchBlogPosts(currentCategory, false, null, currentPage - 1);
  };
  pagDiv.appendChild(prevBtn);

  // Page numbers (show up to 5 pages, with ... if needed)
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  if (start > 1) {
    pagDiv.appendChild(makePageBtn(1));
    if (start > 2) {
      pagDiv.appendChild(makeEllipsis());
    }
  }
  for (let p = start; p <= end; p++) {
    pagDiv.appendChild(makePageBtn(p));
  }
  if (end < totalPages) {
    if (end < totalPages - 1) pagDiv.appendChild(makeEllipsis());
    pagDiv.appendChild(makePageBtn(totalPages));
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.className = `bg-blue-900 text-white px-4 py-2 rounded hover:bg-yellow-600 hover:text-blue-900 transition${currentPage === totalPages ? " opacity-50 cursor-not-allowed" : ""}`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.textContent = "Next";
  nextBtn.onclick = () => {
    if (currentPage < totalPages) fetchBlogPosts(currentCategory, false, null, currentPage + 1);
  };
  pagDiv.appendChild(nextBtn);

  // Insert after blogGrid
  document.getElementById("blogGrid").after(pagDiv);

  function makePageBtn(page) {
    const btn = document.createElement("button");
    btn.className = page === currentPage
      ? "bg-yellow-500 text-blue-900 px-4 py-2 rounded font-bold"
      : "bg-white border px-4 py-2 rounded text-blue-900 hover:bg-yellow-100 transition";
    btn.textContent = page;
    btn.disabled = page === currentPage;
    btn.onclick = () => fetchBlogPosts(currentCategory, false, null, page);
    return btn;
  }
  function makeEllipsis() {
    const span = document.createElement("span");
    span.className = "px-2 py-2 text-blue-900";
    span.textContent = "...";
    return span;
  }
}

// Handler for Read & Earn button
async function onReadAndEarn(postId) {
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
  // Always reset to page 1 on category change
  fetchBlogPosts(cat, false, null, 1);
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

// SORT BLOGS (sorts current page only)
document.getElementById('blogSortSelect').addEventListener('change', function(e){
  let sorted = [...filteredBlogs];
  if (this.value === 'popular') sorted.sort((a, b) => b.reads - a.reads);
  else if (this.value === 'highest') sorted.sort((a, b) => b.rating - a.rating);
  else sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderBlogs(sorted);
});

// DARK MODE
document.getElementById('darkToggle').addEventListener('click', function() {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('text-gray-100');
});

// INIT: show only General category by default and set active tab
window.addEventListener('DOMContentLoaded', function() {
  setActiveCategoryTab(document.querySelector('.category-tab'));
  fetchBlogPosts('General', false, null, 1);
});

// Close modal when clicking outside (post blog)
document.querySelectorAll('[data-modal-hide="post-blog-modal"]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById('post-blog-modal').classList.add('hidden'));
});
document.getElementById('post-blog-modal').addEventListener('click', function(e){
  if(e.target === this) this.classList.add('hidden');
});
