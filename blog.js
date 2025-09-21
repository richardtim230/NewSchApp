const API_URL = "https://examguide.onrender.com/api/blogger-dashboard/allposts";
const USER_API = "https://examguide.onrender.com/api/users/";

let blogPosts = [];
let filteredBlogs = [];
let authorsCache = {};
let currentCategory = 'General';

let currentPage = 1;
const POSTS_PER_PAGE = 5;
let totalPages = 1;

// Show loader at start
document.getElementById('blogLoader').style.display = "flex";
document.getElementById('blogGrid').style.display = "none";

// Fetch blogs and optionally filter by category
async function fetchBlogPosts(category = 'General', setActiveTab = false, tabBtn = null) {
  document.getElementById('blogLoader').style.display = "flex";
  document.getElementById('blogGrid').style.display = "none";
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Could not fetch blogs");
    const data = await res.json();
    // Get all unique authorIds
    const authorIds = [...new Set(data.map(post => post.authorId || post.user).filter(Boolean))];
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
      } catch { }
    }));

    blogPosts = data.map(post => {
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
    currentPage = 1;
    updatePagination();
    renderBlogs(getCurrentPageBlogs());
    renderPagination();

    if (setActiveTab && tabBtn) setActiveCategoryTab(tabBtn);
  } catch (e) {
    document.getElementById('blogGrid').innerHTML = `<div class='col-span-3 text-center text-gray-500 py-10'>Could not load blog posts.</div>`;
  }
  document.getElementById('blogLoader').style.display = "none";
  document.getElementById('blogGrid').style.display = "grid";
}

function updatePagination() {
  totalPages = Math.max(1, Math.ceil(filteredBlogs.length / POSTS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
}

function getCurrentPageBlogs() {
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  return filteredBlogs.slice(start, start + POSTS_PER_PAGE);
}

function renderBlogs(posts) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = "";
  if (posts.length === 0) {
    grid.innerHTML = "<div class='col-span-3 text-center text-gray-500 py-10'>No blog posts found.</div>";
    return;
  }
  posts.forEach(blog => {
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

function renderPagination() {
  const pagDiv = document.querySelector(".pagination-container");
  let html = '';
  if (totalPages <= 1) {
    html = `<button class="bg-yellow-500 text-blue-900 px-4 py-2 rounded font-bold">1</button>`;
  } else {
    html += `<button class="bg-blue-900 text-white px-4 py-2 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600 hover:text-blue-900'}" onclick="changePage('prev')" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'bg-yellow-500 text-blue-900 font-bold' : 'bg-white border text-blue-900 hover:bg-yellow-100 transition'} px-4 py-2 rounded" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button class="bg-blue-900 text-white px-4 py-2 rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600 hover:text-blue-900'}" onclick="changePage('next')" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
  }
  pagDiv.innerHTML = html;
}

window.goToPage = function(page) {
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderBlogs(getCurrentPageBlogs());
    renderPagination();
    window.scrollTo({ top: document.getElementById('blogGrid').offsetTop - 100, behavior: 'smooth' });
  }
};

window.changePage = function(direction) {
  if (direction === 'prev' && currentPage > 1) {
    goToPage(currentPage - 1);
  }
  if (direction === 'next' && currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
};

window.filterBlogCategory = function(cat, btn) {
  setActiveCategoryTab(btn);
  fetchBlogPosts(cat, false);
};

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

document.getElementById('blogSortSelect').addEventListener('change', function() {
  let sorted = [...filteredBlogs];
  if (this.value === 'popular') sorted.sort((a, b) => b.reads - a.reads);
  else if (this.value === 'highest') sorted.sort((a, b) => b.rating - a.rating);
  else sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  filteredBlogs = sorted;
  currentPage = 1;
  updatePagination();
  renderBlogs(getCurrentPageBlogs());
  renderPagination();
});

document.getElementById('darkToggle').addEventListener('click', function() {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('text-gray-100');
});

// Handler for Read & Earn button
window.onReadAndEarn = async function(postId) {
  const countSpan = document.getElementById('read-count-' + postId);
  if (countSpan) {
    let num = parseInt(countSpan.textContent, 10);
    if (!isNaN(num)) countSpan.textContent = num + 1;
  }
  try {
    await fetch(`https://examguide.onrender.com/api/blogger-dashboard/increment-views/${postId}`, { method: "PATCH" });
  } catch { }
  window.location = `campus-news-update?id=${postId}`;
};

window.addEventListener('DOMContentLoaded', function() {
  setActiveCategoryTab(document.querySelector('.category-tab'));
  fetchBlogPosts('General');
  // Create pagination container if not present
  if (!document.querySelector(".pagination-container")) {
    const pagDiv = document.createElement("div");
    pagDiv.className = "flex justify-center mt-8 gap-2 pagination-container";
    document.getElementById("blogGrid").after(pagDiv);
  }
});

// Close modal when clicking outside (post blog)
document.querySelectorAll('[data-modal-hide="post-blog-modal"]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById('post-blog-modal').classList.add('hidden'));
});
document.getElementById('post-blog-modal').addEventListener('click', function(e){
  if(e.target === this) this.classList.add('hidden');
});
