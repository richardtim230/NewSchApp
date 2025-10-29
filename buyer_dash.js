//  — All JavaScript for Buyer Dashboard (HTML and JS fully separated)

const BACKEND = "https://examguard-jmvj.onrender.com";
function getToken() { return localStorage.token || sessionStorage.token || ''; }
function authHeader() { return { 'Authorization': 'Bearer ' + getToken() }; }

// ==================== Notification Modal ====================
function showNotification({ message, type = "info", icon = "" }) {
  const modal = document.getElementById("notification-modal");
  const content = document.getElementById("notification-content");
  const text = document.getElementById("notification-text");
  const iconElem = document.getElementById("notification-icon");
  text.textContent = message || "";
  iconElem.innerHTML = icon || (type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️");
  content.className = "bg-white rounded-lg shadow-lg px-6 py-5 text-center max-w-sm w-full border " +
    (type === "success" ? "border-green-400" : type === "error" ? "border-red-400" : "border-blue-300");
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("notification-close-btn").onclick = function() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  };
  setTimeout(() => {
    if (!modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }, 2500);
}

// ==================== Tab Switching ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn-active'));
    this.classList.add('tab-btn-active');
    document.querySelectorAll('.dashboard-section').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-' + this.dataset.tab).classList.remove('hidden');
    if (this.dataset.tab === "cart") loadCart();
    if (this.dataset.tab === "wishlist") loadWishlist();
    if (this.dataset.tab === "offers") loadOffers();
    if (this.dataset.tab === "orders") loadOrders();
    if (this.dataset.tab === "messages") loadMessages();
    if (this.dataset.tab === "notifications") loadNotifications();
    if (this.dataset.tab === "help") {
      loadHelpUserProfile();
      fetchTickets();
      fetchFaqs();
      setTimeout(() => {
        const openTicketBtn = document.getElementById('openTicketBtn');
        if (openTicketBtn) openTicketBtn.onclick = function() { showCreateTicket(); };
      }, 0);
    }
  });
});

// ==================== Mobile Menu ====================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
mobileMenuBtn.onclick = function() {
  mobileMenu.classList.remove('translate-x-full');
  mobileMenuOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};
closeMobileMenuBtn.onclick = function() {
  mobileMenu.classList.add('translate-x-full');
  mobileMenuOverlay.classList.add('hidden');
  document.body.style.overflow = '';
};
mobileMenuOverlay.onclick = function() {
  mobileMenu.classList.add('translate-x-full');
  mobileMenuOverlay.classList.add('hidden');
  document.body.style.overflow = '';
};
document.getElementById('mobile-logout-btn').onclick = function() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  window.location.href = "/login";
};

// ==================== Profile & Auth ====================
async function loadProfile() {
  try {
    const res = await fetch(BACKEND + "/api/auth/me", { headers: authHeader() });
    if (!res.ok) throw new Error("Unauthenticated");
    const data = await res.json();
    window.buyerProfile = data.user || data;
    document.getElementById("buyer-name").textContent = data.user?.fullname || data.user?.username || "Buyer";
    document.getElementById("buyer-email").textContent = data.user?.email || "";
    document.getElementById("buyer-avatar").src = data.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user?.fullname||"Buyer")}&background=FFCE45&color=263159&rounded=true`;
    document.getElementById("profile-avatar").src = data.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user?.fullname||"Buyer")}&background=FFCE45&color=263159&rounded=true`;
    document.getElementById("mobile-profile-avatar").src = data.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user?.fullname||"Buyer")}&background=FFCE45&color=263159&rounded=true`;
    document.getElementById("mobile-profile-name").textContent = data.user?.fullname || data.user?.username || "Buyer";
  } catch {
    window.location.href = "/login";
  }
}
document.getElementById('logout-btn').onclick = function() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  window.location.href = "/login";
};
document.getElementById('edit-profile-btn').onclick = function() {
  showNotification({message: "Profile editing coming soon!", type: "info"});
};

// ==================== Cart Logic ====================
async function updateCartQuantity(productId, newQty) {
  await fetch(BACKEND + "/api/cart/add", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity: newQty })
  });
  loadCart();
}

async function orderCartItems() {
  const res = await fetch(BACKEND + "/api/cart", { headers: authHeader() });
  const cart = await res.json();
  if (!cart.items || !cart.items.length) {
    showNotification({message: "No items to order!", type: "info"});
    return;
  }
  for (const item of cart.items) {
    if (item.productId) {
      const resp = await orderProduct(item.productId, item.quantity);
      if (!resp.ok) {
        const err = await resp.json();
        showNotification({message: "Order failed: " + (err.error || resp.statusText), type: "error"});
        return;
      }
    }
  }
  await fetch(BACKEND + "/api/cart/clear", {
    method: "POST",
    headers: authHeader()
  });
  showNotification({message: "Order(s) placed! Pending payment.", type: "success"});
  loadOrders();
  loadCart();
}

async function orderProduct(productId, quantity) {
  return await fetch(BACKEND + "/api/orders", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity })
  });
}

async function loadCart() {
  const cartItemsDiv = document.getElementById('cart-items');
  cartItemsDiv.classList.add('grid-cards');
  cartItemsDiv.innerHTML = '<div class="spinner mx-auto my-8"></div>';
  let total = 0;
  try {
    const res = await fetch(BACKEND + "/api/cart", { headers: authHeader() });
    const cart = await res.json();
    if (!cart.items || !cart.items.length) {
      cartItemsDiv.innerHTML = '<div class="text-gray-400 text-center my-6">Your cart is empty.</div>';
      document.getElementById('cart-total').textContent = "0";
      return;
    }
    cartItemsDiv.innerHTML = await Promise.all(cart.items.map(async item => {
      let product = {};
      try {
        const prodRes = await fetch(BACKEND + `/api/blogger-dashboard/public/listings/${item.productId}`, { headers: authHeader() });
        if (prodRes.ok) product = await prodRes.json();
      } catch (e) {}
      const title = product.title || item.title || "Product";
      const price = Number(product.price ?? item.price ?? 0);
      total += price * (item.quantity || 1);
      const image = (product.images?.[0] || product.img || item.image || 'https://ui-avatars.com/api/?name=Product&background=eee&color=263159&rounded=true');
      let seller = "Unknown";
      if (product.sellerId) {
        try {
          const sellerRes = await fetch(BACKEND + `/api/users/${product.sellerId}`);
          if (sellerRes.ok) {
            const sellerData = await sellerRes.json();
            seller = sellerData.user?.fullname || sellerData.user?.username || "Seller";
          }
        } catch (e) {}
      } else if (product.seller) {
        seller = product.seller;
      }
      return `
        <div class="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 rounded-xl p-4 shadow border border-gray-200">
          <div class="flex-shrink-0 w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="${image}" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 w-full flex flex-col gap-2 pl-0 sm:pl-4">
            <div class="flex items-center justify-between">
              <a href="sales/items.html?id=${item.productId}" class="font-semibold text-blue-800 text-lg hover:underline">${title}</a>
              <button class="px-3 py-1 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200" onclick="removeCartItem('${item.productId}')">Remove</button>
            </div>
            <div class="text-yellow-700 font-bold text-xl">&#8358;${price.toLocaleString()}</div>
            <div class="text-sm text-gray-700">Date Carted: ${item.addedAt ? new Date(item.addedAt).toLocaleDateString() : "-"}</div>
            <div class="text-sm text-gray-700">Seller: ${seller}</div>
            <div class="flex items-center gap-2 mt-2">
              <button class="bg-gray-200 p-2 rounded-full text-gray-900 font-bold text-xl" onclick="changeQty('${item.productId}', -1)">-</button>
              <span class="font-bold text-gray-700 px-2">Qty: x${item.quantity}</span>
              <button class="bg-gray-200 p-2 rounded-full text-gray-900 font-bold text-xl" onclick="changeQty('${item.productId}', 1)">+</button>
            </div>
          </div>
        </div>
      `;
    })).then(htmlArr => htmlArr.join(''));
    document.getElementById('cart-total').textContent = total.toLocaleString();
  } catch {
    cartItemsDiv.innerHTML = '<div class="text-red-500 text-center my-6">Failed to load cart.</div>';
    document.getElementById('cart-total').textContent = "0";
  }
}
window.changeQty = async function(productId, delta) {
  const res = await fetch(BACKEND + "/api/cart", { headers: authHeader() });
  const cart = await res.json();
  const item = cart.items.find(i => i.productId && i.productId === productId);
  if (!item) return;
  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) newQty = 1;
  await fetch(BACKEND + "/api/cart/update", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity: newQty })
  });
  loadCart();
};
window.removeCartItem = async function(productId) {
  await fetch(BACKEND + "/api/cart/remove", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ productId })
  });
  loadCart();
};
document.getElementById('pay-out-btn').onclick = async function() {
  await orderCartItems();
};

// ==================== Wishlist Logic ====================
async function loadWishlist() {
  const wishlistItemsDiv = document.getElementById('wishlist-items');
  wishlistItemsDiv.classList.add('grid-cards');
  wishlistItemsDiv.innerHTML = '<div class="spinner mx-auto my-8"></div>';
  try {
    const res = await fetch(BACKEND + "/api/blogger-dashboard/wishlist", { headers: authHeader() });
    const { wishlist } = await res.json();
    if (!wishlist || !wishlist.length) {
      wishlistItemsDiv.innerHTML = '<div class="text-gray-400 text-center my-6">No items in wishlist.</div>';
      return;
    }
    const itemsHtml = await Promise.all(wishlist.map(async id => {
      let item = {};
      try {
        const prodRes = await fetch(BACKEND + `/api/blogger-dashboard/public/listings/${id}`, { headers: authHeader() });
        if (prodRes.ok) item = await prodRes.json();
      } catch (e) {}
      if (!item || !item.title) return "";
      return `
        <div class="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 rounded-xl p-4 shadow border border-gray-200">
          <div class="flex-shrink-0 w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="${(item.images?.[0] || item.img || item.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.title || 'Product') + '&background=eee&color=263159&rounded=true')}" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 w-full flex flex-col gap-2 pl-0 sm:pl-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold text-blue-800 text-lg">${item.title || 'Product'}</div>
              <button class="px-3 py-1 bg-pink-100 text-pink-600 font-semibold rounded hover:bg-pink-200" onclick="removeWishlistItem('${item._id||item.id||id}')">Remove</button>
            </div>
            <div class="text-yellow-700 font-bold text-xl">&#8358;${Number(item.price||0).toLocaleString()}</div>
            <div class="flex mt-2">
              <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold" onclick="placeOrderFromWishlist('${item._id||item.id||id}')">Place Order</button>
            </div>
          </div>
        </div>
      `;
    }));
    const filteredHtml = itemsHtml.filter(Boolean).join('');
    wishlistItemsDiv.innerHTML = filteredHtml.length
      ? filteredHtml
      : '<div class="text-gray-400 text-center my-6">No items in wishlist.</div>';
  } catch (e) {
    wishlistItemsDiv.innerHTML = '<div class="text-red-500 text-center my-6">Failed to load wishlist.</div>';
  }
}
window.removeWishlistItem = async function(listingId) {
  try {
    const response = await fetch(BACKEND + `/api/blogger-dashboard/wishlist/remove/${listingId}`, { method: "DELETE", headers: authHeader() });
    if (response.ok) {
      showNotification({ message: "Item removed from wishlist.", type: "success" });
      loadWishlist();
    } else {
      showNotification({ message: "Failed to remove item from wishlist.", type: "error" });
    }
  } catch {
    showNotification({ message: "Failed to remove item from wishlist.", type: "error" });
  }
};
window.placeOrderFromWishlist = async function(listingId) {
  try {
    await orderProduct(listingId, 1);
    showNotification({ message: "Order placed! Pending payment.", type: "success" });
  } catch {
    showNotification({ message: "Failed to place order from wishlist.", type: "error" });
  }
};

// ==================== Offers Logic ====================
async function loadOffers() {
  const offersList = document.getElementById('offers-list');
  offersList.classList.add('grid-cards');
  offersList.innerHTML = '<div class="spinner mx-auto my-8"></div>';
  try {
    const res = await fetch(BACKEND + "/api/offers/mine", { headers: authHeader() });
    const { offers } = await res.json();
    if (!offers || !offers.length) {
      offersList.innerHTML = '<div class="text-gray-400 text-center my-6">No offers submitted yet.</div>';
      return;
    }
    offersList.innerHTML = await Promise.all(offers.map(async offer => {
      let prod = {};
      try {
        const prodRes = await fetch(BACKEND + `/api/blogger-dashboard/public/listings/${offer.productId}`, { headers: authHeader() });
        if (prodRes.ok) prod = await prodRes.json();
      } catch {}
      const orderBtnEnabled = offer.status === 'accepted';
      return `
      <div class="flex flex-col sm:flex-row gap-3 items-center bg-yellow-50 rounded-xl p-4 shadow border border-yellow-200">
        <div class="flex-shrink-0 w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
          <img src="${(prod.images?.[0] || prod.img || prod.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(prod.title || 'Product') + '&background=eee&color=263159&rounded=true')}" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 w-full flex flex-col gap-2 pl-0 sm:pl-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold text-blue-800 text-lg">${prod.title || offer.productTitle || 'Product'}</div>
              <div class="text-sm text-gray-700">Original price: <span class="text-yellow-700 font-bold">&#8358;${Number(prod.price||0).toLocaleString()}</span></div>
              <div class="text-sm text-blue-700">Offer price: <span class="text-yellow-700 font-bold">&#8358;${Number(offer.offerPrice||0).toLocaleString()}</span></div>
            </div>
            <button class="px-4 py-2 bg-green-600 text-white rounded font-semibold shadow ${orderBtnEnabled ? 'hover:bg-green-700' : 'opacity-60 cursor-not-allowed'}" ${orderBtnEnabled ? `onclick="orderOfferProduct('${offer.productId}', '${offer.offerPrice}', '${offer._id}')"` : 'disabled'}>
              Order
            </button>
          </div>
          <div class="flex gap-3 text-xs text-gray-600">
            <span>Date: ${offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : '-'}</span>
            <span>Status: <span class="${offer.status === 'accepted' ? 'text-green-700 font-bold' : offer.status === 'rejected' ? 'text-red-700 font-bold' : 'text-yellow-700 font-bold'}">${offer.status}</span></span>
          </div>
        </div>
      </div>
      `;
    })).then(htmlArr => htmlArr.join(''));
  } catch {
    offersList.innerHTML = '<div class="text-red-500 text-center my-6">Failed to load offers.</div>';
  }
}
window.orderOfferProduct = async function(productId, offerPrice, offerId) {
  try {
    await fetch(BACKEND + "/api/orders", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity: 1,
        price: offerPrice,
        offerId,
        status: "pending_payment"
      })
    });
    showNotification({message: "Order placed at agreed price! Pending payment.", type: "success"});
    loadOrders();
  } catch {
    showNotification({message: "Failed to place order.", type: "error"});
  }
}

// ==================== Orders Logic ====================
async function loadOrders() {
  document.getElementById('orders-list').innerHTML = '<div class="spinner mx-auto my-8"></div>';
  let total = 0;
  let pendingOrders = [];
  try {
    const res = await fetch(BACKEND + "/api/orders", { headers: authHeader() });
    const { orders } = await res.json();
    if (!orders || !orders.length) {
      document.getElementById('orders-list').innerHTML = '<div class="text-gray-400 text-center my-6">No orders yet.</div>';
      document.getElementById('orders-payment-section').innerHTML = "";
      return;
    }
    document.getElementById('orders-list').innerHTML = orders.map(order => {
      if (order.status === "pending_payment") {
        total += (order.price || 0) * (order.quantity || 1);
        pendingOrders.push(order);
      }
      return `
        <div class="bg-green-50 p-3 rounded shadow flex flex-col sm:flex-row gap-2 items-center">
          <div class="flex-1">
            <div class="font-semibold text-green-700">${order.productTitle || 'Product'}</div>
            <div class="text-gray-700">Qty: x${order.quantity || 1}</div>
            <div class="text-gray-700">Status: ${order.status || "pending_payment"}</div>
            <div class="text-yellow-700 font-bold">&#8358;${Number(order.price || 0).toLocaleString()}</div>
            <div class="text-xs text-gray-500">${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</div>
          </div>
          <div>
            <button class="px-3 py-1 bg-red-100 text-red-600 font-semibold rounded hover:bg-red-200"
              onclick="removeOrder('${order._id}')"
              ${order.status === 'paid' ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              Remove
            </button>
          </div>
        </div>
      `;
    }).join('');
    if (pendingOrders.length) {
      document.getElementById('orders-payment-section').innerHTML = `
        <button id="proceed-payment-btn" class="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-bold text-lg transition">
          Proceed to Payment (${total ? '&#8358;' + total.toLocaleString() : '₦0'})
        </button>
      `;
      document.getElementById('proceed-payment-btn').onclick = function() {
        window.location.href = "payment.html";
      };
    } else {
      document.getElementById('orders-payment-section').innerHTML = "";
    }
  } catch {
    document.getElementById('orders-list').innerHTML = '<div class="text-red-500 text-center my-6">Failed to load orders.</div>';
    document.getElementById('orders-payment-section').innerHTML = "";
  }
}
window.removeOrder = async function(orderId) {
  if (!confirm("Remove this order?")) return;
  await fetch(BACKEND + `/api/orders/${orderId}`, {
    method: "DELETE",
    headers: authHeader()
  });
  loadOrders();
};

// ==================== Messages/Chats ====================
async function loadMessages() {
  const messagesList = document.getElementById('messages-list');
  messagesList.innerHTML = '<div class="spinner mx-auto my-8"></div>';
  try {
    const res = await fetch(BACKEND + "/api/massages", { headers: authHeader() });
    const allMessages = await res.json();
    const grouped = {};
    allMessages.forEach(msg => {
      if (!msg.receiverId || !msg.senderId || !msg.productId) return;
      const otherId = msg.senderId === buyerProfile._id ? msg.receiverId : msg.senderId;
      const chatKey = otherId + "_" + msg.productId;
      if (!grouped[chatKey]) grouped[chatKey] = { sellerId: otherId, productId: msg.productId, messages: [] };
      grouped[chatKey].messages.push(msg);
    });
    if (!Object.keys(grouped).length) {
      messagesList.innerHTML = `<div class="text-gray-400 text-center my-6">No messages yet.</div>`;
      return;
    }
    messagesList.innerHTML = await Promise.all(Object.values(grouped).map(async chat => {
      const msgs = chat.messages;
      const sellerName = msgs.find(m => m.senderId !== buyerProfile._id)?.senderName || msgs[0].receiverName || "Seller";
      let productDetails = "";
      try {
        const prodRes = await fetch(BACKEND + `/api/blogger-dashboard/public/listings/${chat.productId}`, { headers: authHeader() });
        if (prodRes.ok) {
          const prod = await prodRes.json();
          productDetails = `
            <div class="flex items-center gap-3 mb-2">
              <img src="${(prod.images?.[0] || prod.img || prod.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(prod.title || 'Product') + '&background=eee&color=263159&rounded=true')}" class="w-9 h-9 rounded border" />
              <div>
                <div class="font-semibold text-blue-900 text-sm">${prod.title}</div>
                <div class="text-yellow-700 font-bold text-xs">&#8358;${Number(prod.price || 0).toLocaleString()}</div>
              </div>
            </div>
          `;
        }
      } catch {}
      return `
        <div class="bg-white rounded-xl shadow mb-6 overflow-hidden">
          <div class="px-4 py-3 border-b bg-blue-50 flex items-center gap-2">
            <div class="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-900">${sellerName[0]}</div>
            <div class="font-semibold text-blue-900">${sellerName}</div>
          </div>
          <div class="px-4 pt-3 pb-1">${productDetails}</div>
          <div class="p-3 bg-gray-50 min-h-[160px] max-h-[320px] overflow-y-auto whatsapp-chat">
            ${msgs.map(msg => `
              <div class="flex ${msg.senderId === buyerProfile._id ? 'justify-end' : 'justify-start'} mb-2">
                <div class="${msg.senderId === buyerProfile._id ? 'bg-green-100 text-green-900' : 'bg-gray-200 text-gray-900'} px-4 py-2 rounded-2xl max-w-[70%] shadow">
                  ${msg.text}
                  <div class="text-xs text-gray-500 text-right mt-1">${new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <form class="flex gap-2 p-2 border-t bg-white" onsubmit="return sendChatMessage('${chat.sellerId}', '${chat.productId}', this, event)">
            <input type="text" class="flex-1 border rounded px-3 py-2" name="chatBody" placeholder="Type a message..." required>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">Send</button>
          </form>
        </div>
      `;
    })).then(htmlArr => htmlArr.join(''));
  } catch (e) {
    messagesList.innerHTML = `<div class="text-red-500 text-center my-6">Failed to load messages.</div>`;
  }
}
window.sendChatMessage = async function(sellerId, productId, form, event) {
  if (event) event.preventDefault();
  const input = form.chatBody;
  const text = input.value.trim();
  if (!text) return false;
  try {
    await fetch(BACKEND + "/api/massages", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId,
        text,
        productId
      })
    });
    input.value = "";
    await loadMessages();
  } catch (e) {
    showNotification({message: "Failed to send message.", type: "error"});
  }
  return false;
}

// ==================== Notifications ====================
async function loadNotifications() {
  document.getElementById('notifications-list').innerHTML = '<div class="spinner mx-auto my-8"></div>';
  document.getElementById('notifications-list').innerHTML = '<div class="text-gray-400 text-center my-6">No notifications yet. (Coming soon)</div>';
}

// ==================== Help & Support Section (fully backend) ====================
// ExamGuard Seller Dashboard - Fully Backend-Supported Help & Support Section

let supportTab = "home";
let tickets = [];
let faqs = [];
let userName = "";

// Utility: time ago formatting
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff/60) + "m ago";
  if (diff < 86400) return Math.floor(diff/3600) + "h ago";
  return Math.floor(diff/86400) + "d ago";
}

// Fetch user profile for welcome message
async function loadHelpUserProfile() {
  try {
    const res = await fetch(BACKEND + "/api/auth/me", { headers: authHeader() });
    const data = await res.json();
    userName = data.user?.fullname || data.user?.username || "User";
    document.getElementById("help-user-name").textContent = userName;
  } catch { document.getElementById("help-user-name").textContent = "User"; }
}

// Fetch tickets from backend
async function fetchTickets() {
  try {
    const res = await fetch(BACKEND + "/api/support/tickets", { headers: authHeader() });
    tickets = (await res.json()).tickets || [];
    renderRecentMessage();
    renderSupportTab();
  } catch { tickets = []; }
}

// Fetch FAQs from backend
async function fetchFaqs(query = "") {
  try {
    const url = BACKEND + "/api/support/faqs" + (query ? "?q=" + encodeURIComponent(query) : "");
    const res = await fetch(url, { headers: authHeader() });
    faqs = (await res.json()).faqs || [];
    renderFaqs();
  } catch { faqs = []; renderFaqs(); }
}

// Recent ticket/message display
function renderRecentMessage() {
  const ticket = tickets[0];
  if (!ticket) {
    document.getElementById("recent-ticket-title").textContent = "No recent tickets";
    document.getElementById("recent-ticket-msg").textContent = "Start a chat or create a ticket!";
    document.getElementById("recent-ticket-meta").textContent = "";
    return;
  }
  document.getElementById("recent-ticket-title").textContent = ticket.title;
  const lastMsg = ticket.messages && ticket.messages.length ? ticket.messages[ticket.messages.length-1] : null;
  document.getElementById("recent-ticket-msg").textContent = lastMsg ? (lastMsg.text.slice(0,60).replace(/\n/g, ' ') + (lastMsg.text.length>60?"...":"")) : "No recent message.";
  document.getElementById("recent-ticket-meta").textContent = lastMsg ? (lastMsg.from==="support"?"Support":"You") + " • " + timeAgo(new Date(lastMsg.createdAt).getTime()) : "";
}
// Support Tab Content rendering
function renderSupportTab() {
  const content = document.getElementById("supportTabContent");
  if (supportTab === "home") {
    content.innerHTML = `
      <div class="text-gray-600 text-center mt-12">
        <div class="text-lg font-semibold mb-2">Welcome to ExamGuard Help Center</div>
        <div>You can browse FAQs, create tickets, or chat with support.</div>
      </div>
    `;
  } else if (supportTab === "tickets") {
    content.innerHTML = tickets.length
      ? tickets.map(t => `
        <div class="bg-orange-50 rounded-lg p-4 mb-4 shadow border border-orange-200">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-orange-700 font-semibold">${t.title}</span>
            <span class="ml-auto text-xs bg-green-200 text-green-800 rounded-full px-2 py-0.5">${t.status}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">Ticket ID: ${t._id || t.id || 'N/A'}</div>
          <button class="view-convo-btn text-blue-600 hover:underline text-xs font-semibold" data-ticket-id="${t._id || t.id}">View Conversation</button>
        </div>
      `).join('') : '<div class="text-gray-400 text-center my-6">No tickets yet.</div>' +
      `<button onclick="showCreateTicket()" class="w-full py-3 bg-orange-600 text-white font-bold rounded-lg mt-4">Create New Ticket</button>`;

    content.querySelectorAll('.view-convo-btn').forEach(btn => {
      btn.onclick = function() {
        const ticketId = this.getAttribute('data-ticket-id');
        if (ticketId) {
          window._pendingSupportModalId = ticketId;
          switchSupportTab('messages');
        }
      };
    });
  } else if (supportTab === "messages") {
    content.innerHTML = tickets.length
      ? tickets.map(t => `
        <div class="bg-gray-50 rounded-lg p-4 text-center mb-4">
          <div class="text-lg font-semibold text-gray-700 mb-1">${t.title}</div>
          <div class="text-gray-500 mb-4">${t.status}</div>
          <button class="view-convo-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" data-ticket-id="${t._id || t.id}">View Conversation</button>
        </div>
      `).join('') : '<div class="text-gray-400 text-center my-6">No messages yet.</div>';

    content.querySelectorAll('.view-convo-btn').forEach(btn => {
      btn.onclick = function() {
        const ticketId = this.getAttribute('data-ticket-id');
        if (ticketId) {
          window._pendingSupportModalId = ticketId;
          switchSupportTab('messages');
        }
      };
    });
  } else if (supportTab === "faqs") {
    renderFaqs();
  }
  setTimeout(() => {
    const openTicketBtn = document.getElementById('openTicketBtn');
    if (openTicketBtn) openTicketBtn.onclick = function() { showCreateTicket(); };
  }, 0);

  // After rendering: if a modal is pending, open it now and clear the flag
  if (window._pendingSupportModalId) {
    showSupportChat(window._pendingSupportModalId);
    window._pendingSupportModalId = null;
  }
}

// Render FAQs/help articles
function renderFaqs() {
  const content = document.getElementById("supportTabContent");
  if (!faqs.length) {
    content.innerHTML = '<div class="text-gray-400 text-center my-6">No help articles found.</div>';
    return;
  }
  content.innerHTML = `
    <div class="text-lg font-semibold text-gray-800 mb-2">Help Articles</div>
    <ul class="space-y-2 text-sm text-blue-800">
      ${faqs.map(faq => `
        <li><a href="#" onclick="showHelpArticle('${faq.id}');return false;" class="hover:underline">${faq.title}</a></li>
      `).join('')}
    </ul>
  `;
}

// Tab switching
function switchSupportTab(tab) {
  supportTab = tab;
  document.querySelectorAll('nav button[id^="support-tab-"]').forEach(b => b.classList.remove('text-orange-600','font-bold'));
  document.getElementById(`support-tab-${tab}`).classList.add('text-orange-600','font-bold');
  if (tab === "faqs") fetchFaqs();
  else renderSupportTab();
}

// Show support chat modal (redesigned to match example)
// Replace your current window.showSupportChat with the following:

window.showSupportChat = async function(ticketId) {
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  let fullTicket = ticket;
  try {
    const res = await fetch(BACKEND + `/api/support/tickets/${ticketId}`, { headers: authHeader() });
    fullTicket = (await res.json()).ticket || ticket;
  } catch {}

  // Remove any existing modal
  document.querySelectorAll('.support-chat-modal').forEach(m => m.remove());

  // Create modal container
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 support-chat-modal";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto flex flex-col fade-in relative" style="max-height:90vh;">
      <div class="flex items-center gap-3 px-5 py-4 border-b bg-[#F8F8F8]">
        <div class="flex items-center gap-2">
          <div class="bg-orange-600 rounded-full h-10 w-10 flex items-center justify-center text-white font-extrabold text-xl">
            <span>A</span>
          </div>
          <div>
            <div class="font-semibold text-gray-900 leading-none">ExamGuard Team</div>
            <div class="text-xs text-gray-500 leading-none">The team can also help</div>
          </div>
        </div>
        <button class="ml-auto text-gray-500 text-2xl hover:text-gray-800 font-bold" title="Close" onclick="this.closest('.fixed').remove();">&times;</button>
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-2" style="background: #F7F7F9;">
        <div class="flex justify-center mb-2">
          <div class="rounded-full bg-white border px-4 py-1 text-sm font-semibold text-orange-700 shadow-sm flex items-center gap-2">
            <svg fill="none" stroke="orange" stroke-width="2" viewBox="0 0 24 24" class="w-4 h-4"><path d="M18.364 5.636l-1.414-1.414A9 9 0 105.636 18.364l1.414 1.414A9 9 0 1018.364 5.636z"></path></svg>
            ${fullTicket.title}
          </div>
        </div>
        <div class="space-y-4">
          ${(fullTicket.messages||[]).map(m => `
            <div class="flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="${m.from === 'user'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-900 border'} px-4 py-2 rounded-2xl max-w-[90%] shadow-md" style="word-break:break-word;">
                ${m.text.replace(/\n/g,"<br/>")}
                <div class="text-xs mt-1 ${m.from === 'user' ? 'text-orange-100' : 'text-gray-400'} text-right">
                  ${m.from === 'user' ? 'You' : 'Support'} • ${timeAgo(new Date(m.createdAt).getTime())}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="flex items-center justify-center mt-6">
          <span class="inline-block text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-600 font-semibold">${fullTicket.status.charAt(0).toUpperCase() + fullTicket.status.slice(1)}</span>
        </div>
      </div>
      <form class="flex gap-2 border-t p-4 bg-white" onsubmit="return sendSupportMessage('${fullTicket.id}',this,event)">
        <input type="text" class="flex-1 border rounded px-3 py-2" name="chatBody" placeholder="Type a message..." required ${fullTicket.status === 'resolved' ? 'disabled' : ''}>
        <button type="submit" class="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700" ${fullTicket.status === 'resolved' ? 'disabled' : ''}>Send</button>
      </form>
      ${fullTicket.status === 'resolved'
        ? `<div class="px-5 py-3 text-center text-gray-500 text-sm border-t bg-gray-50">Your conversation has ended</div>`
        : ''}
    </div>
  `;
  document.body.appendChild(modal);
};
// Send a support message (to backend)
window.sendSupportMessage = async function(ticketId, form, event) {
  if (event) event.preventDefault();
  const input = form.chatBody;
  if (!input.value.trim()) return false;
  try {
    await fetch(BACKEND + `/api/support/tickets/${ticketId}/message`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.value.trim() })
    });
    input.value = "";
    document.querySelectorAll('.fixed .fade-in').forEach(e => e.closest('.fixed').remove());
    await fetchTickets();
    showSupportChat(ticketId);
  } catch {}
  return false;
};

// Create ticket modal
window.showCreateTicket = function() {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto p-0 fade-in">
      <div class="bg-gradient-to-r from-orange-600 to-red-500 px-6 py-4 flex items-center gap-2">
        <img src="/logo.png" class="h-8 w-8 rounded-full border shadow bg-white" alt="ExamGuard Logo" />
        <div class="text-white font-bold text-lg flex-1">Create Support Ticket</div>
        <button class="text-white text-2xl leading-none font-bold" onclick="this.closest('.fixed').remove();">&times;</button>
      </div>
      <form class="p-6 flex flex-col gap-4" onsubmit="return submitNewTicket(this, event)">
        <input type="text" name="title" class="border rounded px-3 py-2" placeholder="Ticket Title (e.g. Payment Issue)" required>
        <textarea name="message" class="border rounded px-3 py-2" placeholder="Describe your issue..." required></textarea>
        <button type="submit" class="w-full py-3 bg-orange-600 text-white font-bold rounded-lg">Submit Ticket</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
};

// Submit new ticket (to backend)
window.submitNewTicket = async function(form, event) {
  if (event) event.preventDefault();
  const title = form.title.value.trim();
  const message = form.message.value.trim();
  if (!title || !message) return false;
  try {
    await fetch(BACKEND + "/api/support/tickets", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ title, message })
    });
    form.closest('.fixed').remove();
    await fetchTickets();
    switchSupportTab('tickets');
  } catch {}
  return false;
};

// Help Search
document.getElementById("helpSearchForm").onsubmit = function(e) {
  e.preventDefault();
  const query = document.getElementById("helpSearchInput").value.trim();
  fetchFaqs(query);
};

// Show Help Article
window.showHelpArticle = async function(articleId) {
  let article = { title: "", content: "" };
  try {
    const res = await fetch(BACKEND + `/api/support/faqs/${articleId}`, { headers: authHeader() });
    article = (await res.json()).faq || article;
  } catch {}
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-auto p-0 fade-in">
      <div class="bg-gradient-to-r from-orange-600 to-red-500 px-6 py-4 flex items-center gap-2">
        <img src="/logo.png" class="h-8 w-8 rounded-full border shadow bg-white" alt="ExamGuard Logo" />
        <div class="text-white font-bold text-lg flex-1">${article.title}</div>
        <button class="text-white text-2xl leading-none font-bold" onclick="this.closest('.fixed').remove();">&times;</button>
      </div>
      <div class="p-6 text-gray-700">
        <div class="font-bold mb-2">${article.title}</div>
        <div>${article.content || "No content for this article."}</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// On load
document.addEventListener('DOMContentLoaded', function() {
  loadHelpUserProfile();
  fetchTickets();
  fetchFaqs();
});

// ==================== On Load ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  loadCart();
  loadMessages();
  // The Help section's own logic will be called on tab switch or its own DOMContentLoaded handler
});
