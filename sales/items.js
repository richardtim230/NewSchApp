// --- Marketplace Product Details Page JavaScript ---

const BACKEND = "https://examguide.onrender.com";
let buyerProfile = null, currentProduct = null, allProducts = [];
let wishlistIds = []; // For wishlist server sync

// --- Helper: Get Query Params ---
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function getProductId() {
  // Normalize product id usage across the page
  // Prefer _id (Mongo style), then id, then fallback to query param
  const qid = getQueryParam("id");
  const pid = (currentProduct && (currentProduct._id || currentProduct.id)) || qid || null;
  return pid ? String(pid) : null;
}

// Safe DOM setters to avoid uncaught exceptions if an element is missing
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  else console.warn(`Missing element for safeSetText: ${id}`);
}
function safeSetHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
  else console.warn(`Missing element for safeSetHTML: ${id}`);
}
function safeSetAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el) el[attr] = val;
  else console.warn(`Missing element for safeSetAttr: ${id}`);
}
function safeClassList(id) {
  const el = document.getElementById(id);
  return el ? el.classList : null;
}

async function checkAuth() {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const res = await fetch(BACKEND+"/api/auth/me", { headers: { "Authorization": "Bearer " + token } });
      if (res.ok) {
        const accountBtn = document.getElementById("account-btn");
        if (accountBtn) {
          accountBtn.textContent = "My Dashboard";
          accountBtn.href = "/dashboard";
        }
        const data = await res.json();
        buyerProfile = data.user || data; // Support both {user:..} and direct user
        return true;
      } else {
        console.warn("Auth check failed, status:", res.status);
      }
    }
  } catch (e) {
    console.error("checkAuth error:", e);
  }
  const accountBtn = document.getElementById("account-btn");
  if (accountBtn) {
    accountBtn.textContent = "Sign In";
    accountBtn.href = "/login";
  }
  buyerProfile = null;
  return false;
}

// --- Product Loading ---
async function fetchProducts() {
  try {
    let res = await fetch(BACKEND + "/api/blogger-dashboard/public/listings");
    if (!res.ok) {
      console.warn("/public/listings returned", res.status);
      throw new Error("Not found");
    }
    let products = await res.json();
    // Only show published/active/approved
    products = products.filter(
      p => (p.status && (p.status === "Published" || p.status === "Active")) || p.approved
    );
    return products;
  } catch (e) {
    console.error("fetchProducts error:", e);
    return [];
  }
}
async function fetchProduct(id) {
  if (!id) {
    console.warn("fetchProduct called without id");
    return null;
  }
  // Try backend call for single product
  try {
    let res = await fetch(BACKEND + `/api/blogger-dashboard/public/listings/${id}`);
    if (res.ok) {
      let prod = await res.json();
      return prod;
    } else {
      // Helpful logging for debugging network/API issues
      let text = await res.text().catch(()=>null);
      console.warn(`fetchProduct backend returned ${res.status} for id=${id}`, text);
    }
  } catch(e){
    console.error("fetchProduct network/error:", e);
  }
  // Fallback: try allProducts
  try {
    if (!allProducts.length) allProducts = await fetchProducts();
    let prod = allProducts.find(p => String(p._id) === String(id) || String(p.id) == String(id));
    if (prod) return prod;
  } catch (e) {
    console.error("fetchProduct fallback error:", e);
  }
  // Fallback - minimal (still return an object to avoid infinite loader)
  return {
    _id: id,
    id,
    title: "Sample Product",
    price: "10000",
    category: "Sample",
    posted: "2 hours ago",
    seller: "Demo Seller",
    images: [
      "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
      "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg"
    ],
    tags: ["Demo", "Sample"],
    description: "This is a sample product description for demo.",
    rating: "4.6",
    inStock: false,
    views: 3
  };
}

// --- Offers loading (for chart) ---
async function fetchOffers(productId) {
  try {
    if (!productId) return [];
    let res = await fetch(BACKEND + `/api/offers/product/${productId}`);
    if (!res.ok) {
      console.warn("fetchOffers returned", res.status);
      return [];
    }
    let { offers=[] } = await res.json();
    return offers;
  } catch (e) {
    console.error("fetchOffers error:", e);
    return [];
  }
}

// --- Reviews APIs ---
async function fetchReviews(productId) {
  try {
    if (!productId) return [];
    const res = await fetch(BACKEND + `/api/reviews/product/${productId}`);
    if (res.ok) {
      const { reviews=[] } = await res.json();
      return reviews;
    } else {
      console.warn("fetchReviews returned", res.status);
    }
  } catch (e) {
    console.error("fetchReviews error:", e);
  }
  return [];
}

async function addReview(productId, rating, comment) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(BACKEND + `/api/reviews/product/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": "Bearer " + token } : {})
      },
      body: JSON.stringify({ rating, comment })
    });
    if (res.ok) return true;
    console.warn("addReview failed:", res.status, await res.text().catch(()=>""));
  } catch (e) {
    console.error("addReview error:", e);
  }
  return false;
}

// --- Render Product Details ---
function renderProduct(product) {
  try {
    if (!product) {
      safeSetText("product-loading", "Product not found.");
      return;
    }
    currentProduct = product;
    safeSetText("breadcrumb-title", product.title || "");
    safeSetText("product-title", product.title || "");
    safeSetText("product-category", product.category || "");
    safeSetText("product-posted", product.posted || (product.date ? new Date(product.date).toLocaleString() : ""));

    // Price formatting with naira sign
    let priceNum = product.price;
    if (typeof priceNum === "string") priceNum = priceNum.replace(/[^\d.]/g,"");
    safeSetText("product-price-value", Number(priceNum || 0).toLocaleString());

    // Rating
    const ratingEl = document.getElementById("product-rating");
    if (ratingEl) ratingEl.innerHTML = getStarRating(product.rating || product.likes || 0, true);

    safeSetText("product-description", product.description || product.summary || "");
    const stockText = (product.inStock !== false) ? "In Stock" : "Sold";
    safeSetText("stock-indicator", stockText);
    const stockClassList = safeClassList("stock-indicator");
    if (stockClassList) {
      stockClassList.value = "text-xs px-2 py-1 rounded font-medium " + (product.inStock !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500");
    }

    safeSetText("product-views", product.views ? `${product.views} views` : "");

    // Tags
    let tags = Array.isArray(product.tags) ? product.tags : [];
    safeSetHTML("product-tags", tags.map(t=>`<span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">${t}</span>`).join(""));

    // Seller
    const sName = product.seller || product.authorName || product.author || "Seller";
    safeSetText("seller-name", sName);
    const sellerAvatar = document.getElementById("seller-avatar");
    if (sellerAvatar) sellerAvatar.textContent = (typeof sName === "string" && sName[0]) ? sName[0].toUpperCase() : "?";
    safeSetText("seller-meta", product.sellerMeta || "");
    const sellerLink = document.getElementById("seller-profile-link");
    if (sellerLink) sellerLink.href = `mart.html?seller=${encodeURIComponent(sName)}`;

    // --- Images and Thumbnails ---
    let imgs = [];
    if (Array.isArray(product.images) && product.images.length > 0) imgs = product.images;
    else if (product.img) imgs = [product.img];
    else if (product.imageUrl) imgs = [product.imageUrl];
    else imgs = ["https://ui-avatars.com/api/?name=" + encodeURIComponent(product.title || 'Product') + "&background=eee&color=263159&rounded=true"];

    let mainImg = imgs[0];
    const mainImgEl = document.getElementById("product-main-img");
    if (mainImgEl) {
      mainImgEl.src = mainImg;
      mainImgEl.alt = product.title || "";
    }

    // Render thumbnails and handle selection
    let thumbsHtml = "";
    imgs.forEach((url, i) => {
      thumbsHtml += `<img src="${url}" alt="Thumb ${i+1}" 
        class="h-16 w-16 rounded border-2 border-gray-200 cursor-pointer object-cover thumb-img ${i===0?'ring-2 ring-blue-400':''}" 
        data-img-idx="${i}" />`;
    });
    safeSetHTML("product-thumbs", thumbsHtml);

    // Handle thumbnail selection: update main image and highlight
    document.querySelectorAll("#product-thumbs .thumb-img").forEach((thumb, idx) => {
      thumb.onclick = function() {
        const main = document.getElementById("product-main-img");
        if (main) main.src = imgs[idx];
        document.querySelectorAll("#product-thumbs .thumb-img").forEach(e => e.classList.remove("ring-2","ring-blue-400"));
        this.classList.add("ring-2","ring-blue-400");
      };
    });

    // Hide loader, show details
    const loaderCl = safeClassList("product-loading");
    if (loaderCl) loaderCl.add("hidden");
    const detailsCl = safeClassList("product-details");
    if (detailsCl) detailsCl.remove("hidden");
  } catch (e) {
    console.error("renderProduct error:", e, "product:", product);
    const loaderEl = document.getElementById("product-loading");
    if (loaderEl) loaderEl.textContent = "Failed to render product.";
  }
}

// --- Star Rating Helper ---
function getStarRating(rating, showValue) {
  let rate = parseFloat(rating);
  if (isNaN(rate)) rate = 0;
  let full = Math.floor(rate), half = rate % 1 >= 0.5 ? 1 : 0, empty = 5 - full - half;
  let stars = '';
  for(let i=0;i<full;i++) stars += '★';
  if(half) stars += '⯪';
  for(let i=0;i<empty;i++) stars += '☆';
  return `<span class="text-base">${stars}</span>${showValue?` <span class="text-xs text-gray-600 ml-1">(${rate.toFixed(1)})</span>`:""}`;
}

// --- Image preview logic ---
window.selectImg = function(url, el) {
  const main = document.getElementById("product-main-img");
  if (main) main.src = url;
  document.querySelectorAll("#product-thumbs img").forEach(e=>e.classList.remove("ring-2","ring-blue-400"));
  if (el) el.classList.add("ring-2","ring-blue-400");
};
// Lightbox
window.openLightbox = function() {
  let src = document.getElementById("product-main-img")?.src;
  const lb = document.getElementById("lightbox-img");
  if (lb && src) lb.src = src;
  document.getElementById("lightbox-modal")?.classList.remove("hidden");
}
window.closeLightbox = function() {
  document.getElementById("lightbox-modal")?.classList.add("hidden");
}

// --- Send Offer Modal Logic ---
window.openOfferModal = function(){
  document.getElementById('sendOfferModal')?.classList.remove('hidden');
  const opid = getProductId() || (currentProduct && (currentProduct._id||currentProduct.id));
  const offerInput = document.getElementById('offerProductId');
  if (offerInput) offerInput.value = opid || "";
  if (buyerProfile) {
    const u = buyerProfile;
    const buyerDetailsEl = document.getElementById('buyerDetails');
    if (buyerDetailsEl) buyerDetailsEl.innerHTML = `
      <strong>Your Details for Seller:</strong><br>
      Name: ${u.fullname || u.username}<br>
      Email: ${u.email || ''}<br>
      Phone: ${u.phone || ''}
    `;
  } else {
    const buyerDetailsEl = document.getElementById('buyerDetails');
    if (buyerDetailsEl) buyerDetailsEl.innerHTML = `<span class="block text-red-600">You must sign in for communication and offer follow-up.</span>`;
  }
}
window.closeOfferModal = function(){
  document.getElementById('sendOfferModal')?.classList.add('hidden');
  const f = document.getElementById('offerForm');
  if (f) f.reset();
  document.getElementById('offerResponse')?.classList.add('hidden');
}
document.getElementById('send-offer-btn')?.onclick = openOfferModal;
document.getElementById('offerForm')?.onsubmit = async function(e) {
  e.preventDefault();
  const productId = document.getElementById('offerProductId')?.value;
  const offerPrice = document.getElementById('offerPrice')?.value;
  const offerMessage = document.getElementById('offerMessage')?.value;
  const token = localStorage.getItem("token");
  let buyerDetails = "";
  if(buyerProfile){
    const u = buyerProfile;
    buyerDetails = {
      id: u._id,
      name: u.fullname || u.username,
      email: u.email,
      phone: u.phone
    };
  }
  const fullMessage = `
Offer from: ${buyerDetails.name || "Guest"}
Email: ${buyerDetails.email || "N/A"}
Phone: ${buyerDetails.phone || "N/A"}
Product: ${currentProduct?.title || ""}
---
${offerMessage || ""}
  `.trim();

  try {
    const res = await fetch(BACKEND + "/api/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": "Bearer " + token } : {})
      },
      body: JSON.stringify({
        productId,
        offerPrice,
        message: fullMessage,
        buyer: buyerDetails
      })
    });
    if (res.ok) {
      const respEl = document.getElementById('offerResponse');
      if (respEl) {
        respEl.textContent = "Offer sent successfully!";
        respEl.classList.remove('hidden');
      }
      document.getElementById('offerForm')?.reset();
      setTimeout(closeOfferModal, 1500);
    } else {
      throw new Error(`status ${res.status}`);
    }
  } catch (err) {
    console.error("Offer send error:", err);
    const respEl = document.getElementById('offerResponse');
    if (respEl) {
      respEl.textContent = "Could not send offer. Please try again.";
      respEl.classList.remove('hidden');
    }
  }
}

// --- Chat Seller Button ---
document.getElementById('chat-seller-btn')?.onclick = function(){
  if(!buyerProfile){
    alert("Sign in to chat with seller!");
    window.location.href = "/login";
    return;
  }
  alert("Chat feature coming soon!");
};

// --- Share Button ---
document.getElementById('share-btn')?.onclick = function(){
  if (navigator.share) {
    navigator.share({
      title: currentProduct?.title,
      url: window.location.href
    }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  }
};

// --- Chart Rendering ---
async function renderOffersChart(productId) {
  try {
    const offers = await fetchOffers(productId);
    if (!offers || !offers.length) return;
    document.getElementById('offers-chart-section')?.classList.remove('hidden');
    const sorted = offers.slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const labels = sorted.map(o=>new Date(o.createdAt).toLocaleDateString());
    const data = sorted.map(o=>parseInt(o.offerPrice,10));
    new Chart(document.getElementById('offersChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: "Offer Price (₦)",
          data,
          fill: true,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.1)",
          tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  } catch (e) {
    console.error("renderOffersChart error:", e);
  }
}

// --- Reviews Rendering ---
async function renderReviews(productId) {
  try {
    const reviews = await fetchReviews(productId);
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return console.warn("No reviews-list element found");
    reviewsList.innerHTML = "";
    if (reviews && reviews.length) {
      reviewsList.innerHTML = reviews.map(r=>`
        <div class="bg-white rounded-lg p-3 shadow flex gap-3 items-start">
          <div class="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-lg">
            ${r.avatar ? `<img src="${r.avatar}" class="w-full h-full object-cover rounded-full"/>` : (r.user && r.user[0] ? r.user[0].toUpperCase() : "U")}
          </div>
          <div class="flex-1">
            <div class="font-semibold text-sm">${r.username ||r.fullname || "User"} <span class="text-yellow-500">${getStarRating(r.rating)}</span></div>
            <div class="text-gray-700 text-sm">${r.comment}</div>
            <div class="text-xs text-gray-400 mt-1">${r.date ? new Date(r.date).toLocaleString() : ""}</div>
          </div>
        </div>
      `).join("");
    } else {
      reviewsList.innerHTML = `<div class="text-gray-500 text-center py-6">No reviews yet.</div>`;
    }
  } catch (e) {
    console.error("renderReviews error:", e);
  }
}

// --- Add Review Form Logic ---
function setupAddReview(productId) {
  const addReviewCard = document.getElementById("add-review-card");
  if (!addReviewCard) return;
  if (buyerProfile) {
    addReviewCard.classList.remove("hidden");
  } else {
    addReviewCard.classList.add("hidden");
    return;
  }
  // Star rating - interactive
  const ratingStars = document.getElementById("rating-stars");
  if (!ratingStars) return;
  ratingStars.innerHTML = "";
  let selectedRating = 0;
  for(let i=1;i<=5;i++) {
    let star = document.createElement("span");
    star.textContent = "★";
    star.className = "cursor-pointer text-2xl text-gray-300 hover:text-yellow-400";
    star.onmouseenter = ()=> {
      for(let j=0;j<5;j++) ratingStars.children[j].classList.toggle("text-yellow-400", j<i);
    };
    star.onmouseleave = ()=> {
      for(let j=0;j<5;j++) ratingStars.children[j].classList.toggle("text-yellow-400", j<selectedRating);
    };
    star.onclick = ()=> {
      selectedRating = i;
      for(let j=0;j<5;j++) ratingStars.children[j].classList.toggle("text-yellow-400", j<selectedRating);
    };
    ratingStars.appendChild(star);
  }
  // Submit review handler
  const reviewForm = document.getElementById("reviewForm");
  if (!reviewForm) return;
  reviewForm.onsubmit = async function(e) {
    e.preventDefault();
    if (selectedRating < 1) {
      alert("Please select a rating!");
      return;
    }
    const comment = document.getElementById("reviewMessage")?.value;
    const ok = await addReview(productId, selectedRating, comment);
    const resp = document.getElementById("reviewResponse");
    if (ok) {
      if (resp) { resp.textContent = "Review submitted!"; resp.classList.remove("hidden"); }
      this.reset();
      selectedRating = 0;
      for(let j=0;j<5;j++) ratingStars.children[j].classList.remove("text-yellow-400");
      await renderReviews(productId);
    } else {
      if (resp) { resp.textContent = "Failed to submit review."; resp.classList.remove("hidden"); }
    }
    setTimeout(()=>resp?.classList.add("hidden"), 2000);
  };
}

// --- Related Items ---
function renderRelatedItems(product, products) {
  try {
    let related = products.filter(p=>p._id !== product._id && p.category === product.category);
    if (related.length < 4) {
      const others = products.filter(p=>p._id !== product._id && !related.includes(p));
      for (let i=related.length; i<4 && others.length; i++) {
        const idx = Math.floor(Math.random()*others.length);
        related.push(others[idx]);
        others.splice(idx,1);
      }
    }
    const container = document.getElementById("related-items");
    if (!container) return;
    container.innerHTML = related.slice(0,4).map(p=>`
      <div class="bg-white rounded-xl shadow overflow-hidden hover:scale-105 transition">
        <a href="items.html?id=${p._id||p.id}" class="block">
          <img src="${(Array.isArray(p.images) && p.images[0]) || p.img || p.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.title || 'Product') + '&background=eee&color=263159&rounded=true'}" class="w-full h-40 object-cover"/>
          <div class="p-3">
            <div class="font-semibold text-blue-900 text-sm truncate">${p.title}</div>
            <div class="text-yellow-700 font-bold flex items-center gap-1"><span>&#8358;</span>${Number(p.price||0).toLocaleString()}</div>
          </div>
        </a>
      </div>
    `).join("");
  } catch (e) {
    console.error("renderRelatedItems error:", e);
  }
}

// --- Wishlist/Favorite Logic ---
async function fetchWishlist() {
  const token = localStorage.getItem("token");
  if (!token) {
    wishlistIds = [];
    return;
  }
  try {
    const res = await fetch(`${BACKEND}/api/blogger-dashboard/wishlist`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (res.ok) {
      const { wishlist } = await res.json();
      wishlistIds = (wishlist || []).map(item => item._id || item.id);
    } else {
      wishlistIds = [];
      console.warn("fetchWishlist returned", res.status);
    }
  } catch (e) {
    console.error("fetchWishlist error:", e);
    wishlistIds = [];
  }
}
function isWishlisted(id) {
  return wishlistIds.includes(id);
}
async function toggleWishlistServer(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sign in to use wishlist!");
    window.location.href = "/login";
    return;
  }
  try {
    if (isWishlisted(id)) {
      await fetch(`${BACKEND}/api/blogger-dashboard/wishlist/remove/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      wishlistIds = wishlistIds.filter(_id => _id !== id);
    } else {
      await fetch(`${BACKEND}/api/blogger-dashboard/wishlist/add/${id}`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
      wishlistIds.push(id);
    }
    updateFavoriteBtn(id);
  } catch (e) {
    console.error("toggleWishlistServer error:", e);
  }
}
function updateFavoriteBtn(id) {
  const icon = document.getElementById("favorite-icon");
  if (icon) icon.textContent = isWishlisted(id) ? "♥" : "♡";
}
document.getElementById("favorite-btn")?.onclick = async function() {
  if (!currentProduct) return;
  let id = currentProduct._id || currentProduct.id;
  await toggleWishlistServer(id);
};

// --- Report Modal ---
document.getElementById("report-btn")?.onclick = function() {
  document.getElementById("reportModal")?.classList.remove("hidden");
  document.getElementById("reportForm")?.reset();
  document.getElementById("reportResponse")?.classList.add("hidden");
}
window.closeReportModal = function() {
  document.getElementById("reportModal")?.classList.add("hidden");
}
document.getElementById("reportForm")?.onsubmit = async function(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sign in to report an item!");
    window.location.href = "/login";
    return;
  }
  const reason = document.getElementById("reportMessage")?.value;
  const productId = currentProduct?._id || currentProduct?.id;
  try {
    const res = await fetch(`${BACKEND}/api/blogger-dashboard/report/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        reason: reason,
        description: ""
      })
    });
    if (res.ok) {
      const resp = document.getElementById("reportResponse");
      if (resp) { resp.textContent = "Thank you. Your report was submitted!"; resp.classList.remove("hidden"); }
      setTimeout(closeReportModal, 1800);
    } else {
      const resp = document.getElementById("reportResponse");
      if (resp) { resp.textContent = "Failed to submit report."; resp.classList.remove("hidden"); }
    }
  } catch (e) {
    console.error("report submit error:", e);
    const resp = document.getElementById("reportResponse");
    if (resp) { resp.textContent = "Failed to submit report."; resp.classList.remove("hidden"); }
  }
};

// --- On Load ---
document.addEventListener("DOMContentLoaded", async function() {
  // Main load flow with trapping to avoid "keeps loading"
  try {
    await checkAuth();
    await fetchWishlist(); // Load wishlist from server!
    const productId = getQueryParam("id");
    if (!productId) {
      safeSetText("product-loading", "No product ID found!");
      safeClassList("product-details")?.add("hidden");
      return;
    }

    // Preload products list (non-fatal)
    allProducts = await fetchProducts().catch(e => {
      console.warn("fetchProducts failed during load:", e);
      return [];
    });

    const product = await fetchProduct(productId);
    if (!product) {
      safeSetText("product-loading", "Failed to load product. Please try again later.");
      safeClassList("product-details")?.add("hidden");
      return;
    }

    renderProduct(product);
    updateFavoriteBtn(product._id||product.id);
    renderOffersChart(product._id||product.id);
    await renderReviews(product._id||product.id);
    setupAddReview(product._id||product.id);
    renderRelatedItems(product, allProducts);
  } catch (e) {
    console.error("DOMContentLoaded main flow error:", e);
    safeSetText("product-loading", "An error occurred while loading this page.");
    safeClassList("product-details")?.add("hidden");
  }
});

// ========== ADD TO CART ==========
document.getElementById('add-to-cart-btn')?.onclick = async function() {
  if (!buyerProfile) {
    alert("Sign in to add to cart!");
    window.location.href = "/login";
    return;
  }
  const token = localStorage.getItem("token");
  const productId = getProductId();
  if (!productId) {
    alert("Could not determine product id. Please try again.");
    return;
  }
  try {
    const res = await fetch(BACKEND + "/api/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": "Bearer " + token } : {})
      },
      body: JSON.stringify({
        productId: String(productId),
        quantity: 1
      })
    });
    if (res.ok) {
      // Optionally parse server response for better UX
      const body = await res.json().catch(()=>null);
      alert(body && body.message ? body.message : "Item added to cart!");
    } else {
      const err = await res.text().catch(()=>"");
      console.error("Add to cart failed:", res.status, err);
      alert("Failed to add to cart.");
    }
  } catch (e) {
    console.error("Add to cart error:", e);
    alert("Failed to add to cart.");
  }
};

// ========== CHAT SELLER ==========
let chatSellerId = null;
document.getElementById('chat-seller-btn')?.onclick = async function(){
  if(!buyerProfile){
    alert("Sign in to chat with seller!");
    window.location.href = "/login";
    return;
  }
  chatSellerId = currentProduct?.sellerId || currentProduct?.seller || currentProduct?.authorId;
  openChatModal();
  await loadChatHistory();
};

function openChatModal() {
  document.getElementById("chatSellerModal")?.classList.remove("hidden");
  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) chatMessages.innerHTML = '<div class="text-gray-400 text-center my-4">Loading chat...</div>';
  document.getElementById("chatResponse")?.classList.add("hidden");
}
function closeChatModal() {
  document.getElementById("chatSellerModal")?.classList.add("hidden");
  const input = document.getElementById("chatInput");
  if (input) input.value = "";
}

// Fetch chat history with this seller from backend
async function loadChatHistory() {
  const token = localStorage.getItem("token");
  try {
    if (!chatSellerId) return renderChatMessages([]);
    const res = await fetch(BACKEND + `/api/massages/${chatSellerId}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const messages = res.ok ? await res.json() : [];
    renderChatMessages(messages);
  } catch (e) {
    console.error("loadChatHistory error:", e);
    renderChatMessages([]);
  }
}
function renderChatMessages(messages) {
  const box = document.getElementById("chatMessages");
  if (!box) return;
  if (!messages.length) {
    box.innerHTML = '<div class="text-gray-400 text-center my-4">No messages yet. Start the conversation!</div>';
    return;
  }
  box.innerHTML = messages.map(msg => `
    <div class="mb-2 flex ${msg.senderId === buyerProfile?._id ? 'justify-end' : 'justify-start'}">
      <div class="rounded px-3 py-2 ${msg.senderId === buyerProfile?._id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'} max-w-[80%]">
        <span class="block text-xs text-gray-100/90">${msg.senderName || ''}</span>
        ${msg.text}
        <div class="text-[10px] text-gray-200/80 text-right">${msg.date ? new Date(msg.date).toLocaleTimeString() : ''}</div>
      </div>
    </div>
  `).join("");
  box.scrollTop = box.scrollHeight;
}

// Send chat message to backend
document.getElementById("chatForm")?.onsubmit = async function(e) {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input?.value.trim();
  if (!text) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(BACKEND + "/api/massages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        sellerId: chatSellerId,
        text,
        productId: currentProduct?._id || currentProduct?.id
      })
    });
    if (res.ok) {
      if (input) input.value = "";
      await loadChatHistory();
      document.getElementById("chatResponse")?.classList.add("hidden");
    } else {
      document.getElementById("chatResponse").textContent = "Failed to send message.";
      document.getElementById("chatResponse").classList.remove("hidden");
    }
  } catch (e) {
    console.error("chat send error:", e);
    document.getElementById("chatResponse").textContent = "Failed to send message.";
    document.getElementById("chatResponse").classList.remove("hidden");
  }
};
