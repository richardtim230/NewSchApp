// SELLER DASHBOARD SCRIPT - FULLY BACKEND INTEGRATED, NO DEMO DATA, WITH IMAGE UPLOAD SUPPORT

const BACKEND = "https://examguard-jmvj.onrender.com";
const CLOUDINARY_UPLOAD_ENDPOINT = `${BACKEND}/api/images`;
let products = [];
let offersByProduct = {};
let userId = "";
let uploadedImageUrls = [];
let uploading = false;
let editingProductId = null;

function getToken() {
  return localStorage.token || sessionStorage.token || '';
}
function authHeader() {
  return {
    'Authorization': 'Bearer ' + getToken(),
    'Content-Type': 'application/json'
  };
}

async function checkAuth() {
  const overlay = document.getElementById('overlayLoader');
  try {
    const token = getToken();
    if (!token) throw new Error("No token");
    const res = await fetch(BACKEND + "/api/auth/me", { headers: authHeader() });
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    userId = data.user?._id || "";
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 300);
    await fetchProductsAndOffers();
  } catch {
    window.location.href = "mock.html";
  }
}

async function fetchProductsAndOffers() {
  await fetchProducts();
  await fetchSellerOffers();
  renderProducts();
}

async function fetchProducts() {
  const res = await fetch(BACKEND + "/api/blogger-dashboard/mylistings", { headers: authHeader() });
  if (!res.ok) {
    document.getElementById('productsList').innerHTML = `<div class="text-red-500 py-8 text-center">Failed to load products. Please refresh.</div>`;
    products = [];
    return;
  }
  const data = await res.json();
  products = (data || []).map(l => ({ ...l, id: l._id }));
}

async function fetchSellerOffers() {
  // Get all offers where sellerId is current user
  const res = await fetch(BACKEND + "/api/offers/seller", { headers: authHeader() });
  offersByProduct = {};
  if (!res.ok) return;
  const result = await res.json();
  const offers = result.offers || [];
  // Group by productId
  offers.forEach(offer => {
    if (!offersByProduct[offer.productId]) offersByProduct[offer.productId] = [];
    offersByProduct[offer.productId].push(offer);
  });
}

function statusBadge(status, approved) {
  let color = "bg-gray-200 text-gray-700";
  let label = "Pending Approval";
  if (approved === true && (status === "Active" || status === "Published")) {
    color = "bg-green-100 text-green-800";
    label = "Published";
  } else if (status === "Unpublished") {
    color = "bg-red-100 text-red-700";
    label = "Unpublished";
  }
  return `<span class="absolute top-2 right-2 px-2 py-1 rounded font-bold text-xs shadow ${color}">${label}</span>`;
}

function renderProducts() {
  const el = document.getElementById('productsList');
  if (!products.length) {
    el.innerHTML = `<div class="text-gray-500 text-center py-8">No products yet. Click "Add New" to list your first product!</div>`;
    return;
  }
  el.innerHTML = "";
  products.forEach(prod => {
    let imagesArr = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : [];
    if (!imagesArr.length && (prod.img || prod.imageUrl)) imagesArr = [prod.img || prod.imageUrl];
    const prodOffers = offersByProduct[prod._id] || [];
    let thumbsHtml = '';
    if (imagesArr.length) {
      thumbsHtml = `<div class="product-thumb-list">` +
        imagesArr.map(url => `<img src="${url}" alt="thumb" />`).join('') +
        `</div>`;
    }
    let mainImg = imagesArr[0] || '';
    el.innerHTML += `
      <div class="prod-card-gradient rounded-2xl shadow p-4 flex flex-col md:flex-row gap-4 items-center border border-yellow-200 relative group">
        <div class="relative w-full md:w-40 flex-shrink-0 flex flex-col items-center justify-center">
          <img src="${mainImg}" alt="${prod.title}" class="h-28 w-full object-contain bg-gray-100 rounded-lg shadow mb-2" />
          ${thumbsHtml}
          ${statusBadge(prod.status, prod.approved)}
        </div>
        <div class="flex-1 flex flex-col justify-between py-2">
          <div>
            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mb-2">${prod.category || ''}</span>
            <h3 class="font-bold text-lg md:text-xl text-blue-900 mb-1">${prod.title}</h3>
            <div class="text-sm text-gray-700 mb-2">${prod.desc || prod.description || ''}</div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xl font-bold text-yellow-600">₦${(prod.price || 0).toLocaleString()}</span>
            <span class="text-sm text-blue-900 font-semibold">${prod.orders || prod.sales || 0} Orders</span>
          </div>
          <div class="mt-3">
            ${renderOffersList(prodOffers)}
          </div>
        </div>
        <div class="absolute top-2 left-2 flex flex-col gap-2 opacity-80 group-hover:opacity-100">
          <button onclick="deleteProduct('${prod.id}')" class="bg-red-100 hover:bg-red-300 text-red-600 px-2 py-1 rounded text-xs font-bold shadow">Delete</button>
          <button onclick="editProduct('${prod.id}')" class="bg-blue-100 hover:bg-blue-300 text-blue-900 px-2 py-1 rounded text-xs font-bold shadow">Edit</button>
          <button onclick="unpublishProduct('${prod.id}')" class="bg-gray-100 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-bold shadow">Unpublish</button>
        </div>
      </div>
    `;
  });
}

function renderOffersList(offers) {
  if (!offers.length) return `<div class="text-xs text-gray-400">No offers yet.</div>`;
  return `
    <div class="rounded-xl bg-blue-50 border border-blue-200 mt-2 p-2">
      <div class="font-bold text-blue-900 text-xs mb-1">Offers:</div>
      <ul class="space-y-1">
        ${offers.map(offer => `
          <li class="offer-card-gradient p-2 rounded flex flex-col md:flex-row md:items-center md:justify-between text-xs border border-blue-100">
            <span>
              <b>₦${offer.offerPrice}</b> from ${offer.buyer?.name || "Unknown"} 
              <span class="text-gray-600">${offer.buyer?.email ? `(${offer.buyer.email})` : ''}</span>
              <br>
              <span class="text-gray-700">${offer.message ? offer.message.slice(0, 100) : ''}</span>
            </span>
            <span class="ml-2 mt-1 md:mt-0">
              <span class="inline-block px-2 py-1 rounded-full text-white ${offer.status === "pending" ? "bg-gray-400" : offer.status === "accepted" ? "bg-green-500" : "bg-red-400"}">${offer.status}</span>
              ${offer.status === "pending" ? `
                <button onclick="updateOfferStatus('${offer._id}','accepted')" class="bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded ml-1">Accept</button>
                <button onclick="updateOfferStatus('${offer._id}','rejected')" class="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded ml-1">Reject</button>
              ` : ''}
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

window.updateOfferStatus = async function (offerId, status) {
  if (!["accepted", "rejected"].includes(status)) return;
  try {
    await fetch(BACKEND + `/api/offers/${offerId}/status`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify({ status })
    });
    await fetchSellerOffers();
    renderProducts();
  } catch (err) {
    alert("Failed to update offer status.");
  }
};

function showConfirmModal(message, onYes, onNo) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmModalText").textContent = message;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  function cleanup() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    document.getElementById("confirmModalYes").onclick = null;
    document.getElementById("confirmModalNo").onclick = null;
  }
  document.getElementById("confirmModalYes").onclick = function() {
    cleanup();
    if (typeof onYes === "function") onYes();
  };
  document.getElementById("confirmModalNo").onclick = function() {
    cleanup();
    if (typeof onNo === "function") onNo();
  };
}

window.deleteProduct = function (id) {
  showConfirmModal(
    "Are you sure you want to delete this product?",
    async function() {
      try {
        await deleteProductFromBackend(id);
        await fetchProductsAndOffers();
      } catch (err) {
        alert("Failed to delete product.");
      }
    }
  );
};

window.editProduct = function (id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;
  document.getElementById('addProductModal').classList.remove('hidden');
  document.getElementById('addProductForm').reset();
  document.getElementById('prodTitle').value = prod.title;
  document.getElementById('prodCategory').value = prod.category || '';
  document.getElementById('prodPrice').value = prod.price || '';
  document.getElementById('prodDesc').value = prod.desc || prod.description || '';
  uploadedImageUrls = Array.isArray(prod.images) ? prod.images :
    (prod.img || prod.imageUrl ? [prod.img || prod.imageUrl] : []);
  renderImagePreviews(uploadedImageUrls);
  editingProductId = id;
};

window.unpublishProduct = async function (id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;
  try {
    await updateProductInBackend(id, { status: prod.status === "Unpublished" ? "Active" : "Unpublished" });
    await fetchProductsAndOffers();
  } catch (err) {
    alert("Could not update product status.");
  }
};

document.getElementById('addProductBtn').addEventListener('click', function () {
  document.getElementById('addProductModal').classList.remove('hidden');
  document.getElementById('addProductForm').reset();
  uploadedImageUrls = [];
  renderImagePreviews([]);
  editingProductId = null;
});
document.getElementById('closeAddModal').addEventListener('click', function () {
  document.getElementById('addProductModal').classList.add('hidden');
});

function renderImagePreviews(urls) {
  const previewDiv = document.getElementById('product-img-preview');
  previewDiv.innerHTML = '';
  (urls || []).forEach(url => {
    const thumb = document.createElement('div');
    thumb.className = "w-14 h-14 bg-gray-100 rounded flex items-center justify-center";
    const img = document.createElement('img');
    img.className = "max-w-full max-h-full rounded";
    img.src = url;
    thumb.appendChild(img);
    previewDiv.appendChild(thumb);
  });
}

document.addEventListener("DOMContentLoaded", function() {
  const prodImageFileInput = document.getElementById('prodImageFile');
  const productImgPreviewDiv = document.getElementById('product-img-preview');
  uploadedImageUrls = [];
  uploading = false;

  if (prodImageFileInput) {
    prodImageFileInput.addEventListener('change', async function(event) {
      // Reset previews and URLs on every new selection
      uploadedImageUrls = [];
      productImgPreviewDiv.innerHTML = '';
      const files = Array.from(event.target.files).slice(0, 8);
      if (!files.length) return;
      uploading = true;
      // Upload all files in parallel (faster)
      await Promise.all(files.map(async (file) => {
        // Show thumbnail preview while uploading
        const thumb = document.createElement('div');
        thumb.className = "w-14 h-14 bg-gray-100 rounded flex items-center justify-center relative";
        const img = document.createElement('img');
        img.className = "max-w-full max-h-full rounded";
        img.src = URL.createObjectURL(file);
        thumb.appendChild(img);
        // Loading spinner
        const spinner = document.createElement('span');
        spinner.className = "absolute top-1 right-1 bg-yellow-300 rounded-full w-3 h-3 animate-pulse";
        thumb.appendChild(spinner);
        productImgPreviewDiv.appendChild(thumb);

        // Upload to cloudinary via backend
        const fd = new FormData();
        fd.append('image', file);
        try {
          const res = await fetch(CLOUDINARY_UPLOAD_ENDPOINT, {
            method: 'POST',
            body: fd
          });
          const data = await res.json();
          if (data.url) {
            uploadedImageUrls.push(data.url);
            img.src = data.url; // replace preview with real
            spinner.remove();
          } else {
            thumb.style.opacity = "0.5";
            spinner.remove();
            thumb.title = "Upload failed";
          }
        } catch (e) {
          thumb.style.opacity = "0.5";
          spinner.remove();
          thumb.title = "Upload failed";
        }
      }));
      uploading = false;
    });
  }
});

document.getElementById('addProductForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (uploading) {
    alert("Please wait for images to finish uploading.");
    return;
  }
  if (!uploadedImageUrls.length) {
    alert("Please upload at least one product image.");
    return;
  }
  const prod = {
    title: document.getElementById('prodTitle').value,
    category: document.getElementById('prodCategory').value,
    price: Number(document.getElementById('prodPrice').value),
    description: document.getElementById('prodDesc').value,
    images: uploadedImageUrls,
    img: uploadedImageUrls[0] || '',
    status: "Active",
    sales: 0
  };
  try {
    if (editingProductId) {
      await updateProductInBackend(editingProductId, prod);
    } else {
      await addProductToBackend(prod);
    }
    await fetchProductsAndOffers();
    document.getElementById('addProductModal').classList.add('hidden');
    this.reset();
    uploadedImageUrls = [];
    renderImagePreviews([]);
    editingProductId = null;
  } catch (err) {
    alert("Error saving product: " + err.message);
  }
});

async function addProductToBackend(prod) {
  const res = await fetch(BACKEND + "/api/blogger-dashboard/listings", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(prod)
  });
  if (!res.ok) throw new Error("Could not add product");
  return await res.json();
}
async function updateProductInBackend(id, prod) {
  const res = await fetch(BACKEND + `/api/blogger-dashboard/listings/${id}`, {
    method: "PATCH",
    headers: authHeader(),
    body: JSON.stringify(prod)
  });
  if (!res.ok) throw new Error("Could not update product");
  return await res.json();
}
async function deleteProductFromBackend(id) {
  const res = await fetch(BACKEND + `/api/blogger-dashboard/listings/${id}`, {
    method: "DELETE",
    headers: authHeader()
  });
  if (!res.ok) throw new Error("Could not delete product");
}

document.getElementById('point-badge').textContent = 72;
document.getElementById('point-badge-mobile').textContent = 72;
document.getElementById('rewardTotal').textContent = 72;

function tabSwitch(tabName) {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('tab-btn-active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-btn-active');
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.getElementById('tab-' + tabName).classList.remove('hidden');
}
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', function () {
    tabSwitch(this.dataset.tab);
    if (this.dataset.tab === 'products') fetchProductsAndOffers();
  });
});
document.getElementById('hamburger-btn').addEventListener('click', function () {
  const menu = document.getElementById('mobile-menu');
  menu.hidden = !menu.hidden;
});
document.getElementById('helpForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const helpInput = document.getElementById('helpInput');
  if (helpInput.value.trim()) {
    const box = document.querySelector('#tab-help .h-32');
    box.innerHTML += `<div class="mb-1"><span class="font-semibold text-blue-900">You:</span> ${helpInput.value}</div>`;
    box.scrollTop = box.scrollHeight;
    helpInput.value = "";
  }
});

window.addEventListener('DOMContentLoaded', checkAuth);
