const BACKEND = "https://examguide.onrender.com";

// --- Token and Auth Header ---
function getToken() {
  return localStorage.token || sessionStorage.token || '';
}
function authHeader() {
  return {
    'Authorization': 'Bearer ' + getToken(),
    'Content-Type': 'application/json'
  };
}

// --- Notification Modal ---
function showNotification(message, success = true) {
  let modal = document.getElementById('notificationModal');
  let content = document.getElementById('notificationModalContent');
  content.innerHTML = `<div class="font-bold text-lg ${success ? "text-green-700" : "text-red-600"}">${message}</div>`;
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('hidden'), 2400);
}
document.getElementById('closeNotificationModal')?.addEventListener('click', function() {
  document.getElementById('notificationModal').classList.add('hidden');
});

// --- Loader Spinner for Buttons ---
function setActionLoading(btn, loading=true) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loader-spin inline-block align-middle mr-1" style="width:16px;height:16px;border-width:3px;"></span>Processing...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.textContent || 'Action';
  }
}

// --- Cache for user info ---
const userCache = {};
async function getUserName(userId) {
  if (!userId) return 'Unknown';
  if (userCache[userId]) return userCache[userId];
  try {
    const res = await fetch(`${BACKEND}/api/users/${userId}`, {headers: authHeader()});
    const data = await res.json();
    let name = data?.user?.fullname || data?.user?.username || userId;
    userCache[userId] = name;
    return name;
  } catch {
    return userId;
  }
}

// --- Main Admin Auth Check ---
async function checkAdminAuth() {
  const overlay = document.getElementById('overlayLoader');
  try {
    const token = getToken();
    if (!token) throw new Error("No token");
    const res = await fetch(BACKEND + "/api/auth/me", { headers: authHeader() });
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    if (!data.user || (data.user.role !== "admin" && data.user.role !== "superadmin")) throw new Error("Not admin");
    overlay.style.opacity = "0";
    setTimeout(()=>{ overlay.style.display="none"; }, 300);
    loadPlatformStats();
    loadApprovals();
    loadUsers(1); // load first page
    loadEarnings();
    loadPoints();
    loadReports();
    loadActivity();
  } catch {
    window.location.href = "mock.html";
  }
}
document.getElementById('hamburger-btn')?.addEventListener('click', function() {
  const menu = document.getElementById('mobile-menu');
  menu.hidden = !menu.hidden;
});

// --- Platform Stats ---
async function loadPlatformStats() {
  try {
    const usersRes = await fetch(BACKEND + "/api/users/count", {headers: authHeader()});
    const postsRes = await fetch(BACKEND + "/api/posts/count", {headers: authHeader()});
    const listingsRes = await fetch(BACKEND + "/api/listings/count", {headers: authHeader()});
    let users = (await usersRes.json()).count || 0;
    let posts = (await postsRes.json()).count || 0;
    let listings = (await listingsRes.json()).count || 0;
    document.getElementById('statUsers').textContent = users;
    document.getElementById('statPending').textContent = posts + listings;
    document.getElementById('statPoints').textContent = (users * 20).toLocaleString();
    document.getElementById('statEarnings').textContent = "₦" + ((listings * 500) + (posts * 200)).toLocaleString();
  } catch {}
}

// --- Approvals Tab (Posts & Items) ---
async function loadApprovals() {
  try {
    const [itemsRes, postsRes] = await Promise.all([
      fetch(BACKEND + "/api/marketplace/listings-public", {headers: authHeader()}),
      fetch(BACKEND + "/api/blogger-dashboard/allposts", {headers: authHeader()})
    ]);
    const items = await itemsRes.json();
    const posts = await postsRes.json();

    // Get unique userIds
    let userIds = [
      ...new Set([
        ...items.map(i => i.seller),
        ...posts.map(p => p.authorId)
      ])
    ].filter(Boolean);

    let userNames = {};
    await Promise.all(userIds.map(async uid => {
      userNames[uid] = await getUserName(uid);
    }));

    // Map items
    const itemsAll = items.map(l => ({
      type: "Item",
      title: l.title,
      user: userNames[l.seller] || l.seller || "Unknown",
      img: l.img || l.imageUrl || "",
      submitted: l.date ? new Date(l.date).toLocaleDateString() : "",
      status: l.approved ? "Approved" : "Pending",
      id: l._id,
      dashboardId: l.seller,
      desc: l.description || ""
    }));

    // Map posts
    const postsAll = posts.map(p => ({
      type: "Post",
      title: p.title,
      user: userNames[p.authorId] || p.authorId || "Unknown",
      img: p.images && p.images.length ? p.images[0] : (p.imageUrl || ""),
      submitted: p.date ? new Date(p.date).toLocaleDateString() : "",
      status: p.status || "Unknown",
      id: p._id,
      dashboardId: p.authorId,
      desc: p.summary || ""
    }));

    const allItems = [...itemsAll, ...postsAll];
    document.getElementById('approvalsTable').innerHTML = allItems.length ?
      allItems.map(a =>
        `<tr>
          <td>${a.type}</td>
          <td>
            <img src="${a.img}" class="w-12 h-10 object-cover rounded shadow border border-yellow-100" alt="">
            <button onclick="viewApproval('${a.type}','${a.dashboardId}','${a.id}')" class="ml-1 text-xs text-blue-600 underline hover:text-yellow-600">View</button>
          </td>
          <td>${a.title}</td>
          <td>${a.user}</td>
          <td>${a.submitted}</td>
          <td><span class="bg-yellow-100 text-yellow-800 rounded-full px-2 py-1 text-xs">${a.status}</span></td>
          <td>
            <button data-original-text="Approve" class="action-btn bg-blue-900 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-400 hover:text-blue-900 transition"
              onclick="approveItem(this,'${a.type}','${a.dashboardId}','${a.id}')">Approve</button>
            <button data-original-text="Decline" class="action-btn bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200"
              onclick="declineItem(this,'${a.type}','${a.dashboardId}','${a.id}')">Decline</button>
          </td>
        </tr>`
      ).join('') :
      `<tr><td colspan="7" class="text-center text-yellow-400 py-4">No listings or posts found.</td></tr>`;
  } catch (e) {
    document.getElementById('approvalsTable').innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Failed to load approvals.</td></tr>`;
  }
}

// --- Approve/Decline Actions with Loader/Feedback ---
window.viewApproval = function(type,dashboardId,id) {
  document.getElementById('approvalModalContent').innerHTML = `<div class="text-lg font-bold">Approval for ${type} ID: ${id}</div>`;
  document.getElementById('approvalModal').classList.remove('hidden');
};
document.getElementById('closeApprovalModal')?.addEventListener('click', function() {
  document.getElementById('approvalModal').classList.add('hidden');
});
function closeApprovalModal() {
  document.getElementById('approvalModal').classList.add('hidden');
}
window.approveItem = async function(btn, type, dashboardId, id) {
  setActionLoading(btn, true);
  try {
    let res;
    if(type==="Item"){
      res = await fetch(BACKEND + `/api/marketplace/approve-listing/${dashboardId}/${id}`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ approved: true })
      });
    } else {
      res = await fetch(BACKEND + `/api/blogger-dashboard/approve-post/${dashboardId}/${id}`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ status: "Published" })
      });
    }
    if (res.ok) {
      showNotification("Action successful!", true);
      loadApprovals();
    } else {
      let msg = (await res.json()).message || "Action failed";
      showNotification(msg, false);
      setActionLoading(btn, false);
    }
  } catch(e) {
    showNotification("Network error", false);
    setActionLoading(btn, false);
  }
};
window.declineItem = async function(btn,type,dashboardId,id) {
  setActionLoading(btn, true);
  try {
    let res;
    if(type==="Item"){
      res = await fetch(BACKEND + `/api/marketplace/approve-listing/${dashboardId}/${id}`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ approved: false })
      });
    } else {
      res = await fetch(BACKEND + `/api/blogger-dashboard/approve-post/${dashboardId}/${id}`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ status: "Draft" })
      });
    }
    if (res.ok) {
      showNotification("Action successful!", true);
      loadApprovals();
    } else {
      let msg = (await res.json()).message || "Action failed";
      showNotification(msg, false);
      setActionLoading(btn, false);
    }
  } catch(e) {
    showNotification("Network error", false);
    setActionLoading(btn, false);
  }
};

// --- USERS TAB with PAGINATION ---
let usersCache = [];
let usersTotalPages = 1;
let usersCurrentPage = 1;
const USERS_PER_PAGE = 10;

async function loadUsers(page = 1) {
  try {
    const res = await fetch(BACKEND + `/api/users`, {headers: authHeader()});
    const users = await res.json();
    usersCache = users;
    usersTotalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
    usersCurrentPage = Math.min(Math.max(1, page), usersTotalPages);
    renderUsersPage(usersCurrentPage);
    renderUsersPagination();
  } catch (e) {
    document.getElementById('usersTable').innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Failed to load users.</td></tr>`;
    document.getElementById('usersPagination').innerHTML = "";
  }
}

function renderUsersPage(page) {
  const startIdx = (page - 1) * USERS_PER_PAGE;
  const pagedUsers = usersCache.slice(startIdx, startIdx + USERS_PER_PAGE);
  document.getElementById('usersTable').innerHTML = pagedUsers.map(u =>
    `<tr>
      <td><img src="${u.profilePic || 'https://randomuser.me/api/portraits/men/23.jpg'}" class="w-10 h-10 rounded-full border-2 border-yellow-100" alt=""></td>
      <td>${u.fullname || u.username}</td>
      <td>${u.role}</td>
      <td><span class="${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'} rounded-full px-2 py-1 text-xs">${u.active ? "Active" : "Banned"}</span></td>
      <td>${u.verified ? "Yes" : "No"}</td>
      <td>${u.points || 0}</td>
      <td>
        <button onclick="verifyUser('${u._id}')" class="bg-yellow-400 text-blue-900 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-900 hover:text-yellow-400 transition">Verify</button>
        <button onclick="banUser('${u._id}')" class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200">Ban</button>
      </td>
    </tr>`
  ).join('');
}
function renderUsersPagination() {
  let html = `<div class="flex gap-2 justify-center py-2">`;
  for (let i = 1; i <= usersTotalPages; i++) {
    html += `<button class="px-3 py-1 rounded ${i === usersCurrentPage ? 'bg-yellow-400 text-blue-900' : 'bg-blue-900 text-white'}" onclick="loadUsers(${i})">${i}</button>`;
  }
  html += `</div>`;
  document.getElementById('usersPagination').innerHTML = html;
}

// --- User actions ---
window.verifyUser = async function(id) {
  await fetch(BACKEND+`/api/users/${id}/verify`,{method:"PATCH",headers:authHeader()});
  loadUsers(usersCurrentPage);
};
window.banUser = async function(id) {
  await fetch(BACKEND+`/api/users/${id}/ban`,{method:"PATCH",headers:authHeader()});
  loadUsers(usersCurrentPage);
};
window.viewUser = function(id) {
  document.getElementById('userModalContent').innerHTML = `<div class="text-lg font-bold">User ID: ${id}</div>`;
  document.getElementById('userModal').classList.remove('hidden');
};
document.getElementById('closeUserModal')?.addEventListener('click', function() {
  document.getElementById('userModal').classList.add('hidden');
});

// --- Earnings tab (unchanged, could paginate) ---
async function loadEarnings() {
  try {
    const res = await fetch(BACKEND + "/api/blogger-dashboard", {headers: authHeader()});
    const dashboards = [await res.json()];
    let rows = [];
    dashboards.forEach(dash => {
      (dash.commissions || []).forEach(e => {
        rows.push(`<tr>
          <td>${dash.user}</td>
          <td>${e.type}</td>
          <td>₦${e.amount.toLocaleString()}</td>
          <td><span class="bg-green-100 text-green-700 rounded-full px-2 py-1 text-xs">${e.status}</span></td>
          <td>${e.date}</td>
          <td>
            <button class="bg-blue-900 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-400 hover:text-blue-900 transition">Pay</button>
          </td>
        </tr>`);
      });
    });
    document.getElementById('earningsTable').innerHTML = rows.join('');
  } catch (e) {
    document.getElementById('earningsTable').innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-4">Failed to load earnings.</td></tr>`;
  }
}

// --- Points tab ---
async function loadPoints() {
  try {
    const res = await fetch(BACKEND + "/api/users", {headers: authHeader()});
    const users = await res.json();
    let rows = [];
    users.forEach(u => {
      (u.rewardHistory?.admin || []).forEach(r =>
        rows.push(`<tr>
          <td>${u.fullname || u.username}</td>
          <td>Admin</td>
          <td>${r.points}</td>
          <td>${new Date(r.date).toLocaleDateString()}</td>
          <td>${r.reason}</td>
          <td>
            <button onclick="revokePoints('${u._id}','${r._id}')" class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200">Revoke</button>
          </td>
        </tr>`)
      );
    });
    document.getElementById('pointsTable').innerHTML = rows.join('');
  } catch (e) {
    document.getElementById('pointsTable').innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-4">Failed to load points.</td></tr>`;
  }
}

// --- Reports tab (sample fetch, replace with real endpoint) ---
async function loadReports() {
  try {
    const res = await fetch(BACKEND + "/api/reports", {headers: authHeader()});
    const reports = await res.json();
    if (!Array.isArray(reports) || reports.length === 0) {
      document.getElementById('reportsTable').innerHTML = `<tr><td colspan="7" class="text-center text-yellow-400 py-4">No reports found.</td></tr>`;
      return;
    }
    document.getElementById('reportsTable').innerHTML = reports.map(r =>
      `<tr>
        <td>${r.reporter}</td>
        <td>${r.type}</td>
        <td>${r.target}</td>
        <td>${r.reason}</td>
        <td>${r.date}</td>
        <td>${r.status}</td>
        <td>
          <button class="bg-blue-900 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-400 hover:text-blue-900 transition">Review</button>
        </td>
      </tr>`
    ).join('');
  } catch (e) {
    document.getElementById('reportsTable').innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Failed to load reports.</td></tr>`;
  }
}

// --- Activity tab (sample fetch, replace with real endpoint) ---
async function loadActivity() {
  try {
    const res = await fetch(BACKEND + "/api/activity", {headers: authHeader()});
    const activity = await res.json();
    if (!Array.isArray(activity) || activity.length === 0) {
      document.getElementById('activityTable').innerHTML = `<tr><td colspan="5" class="text-center text-yellow-400 py-4">No activity found.</td></tr>`;
      return;
    }
    document.getElementById('activityTable').innerHTML = activity.map(a =>
      `<tr>
        <td>${a.time}</td>
        <td>${a.user}</td>
        <td>${a.action}</td>
        <td>${a.type}</td>
        <td>${a.details}</td>
      </tr>`
    ).join('');
  } catch (e) {
    document.getElementById('activityTable').innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Failed to load activity.</td></tr>`;
  }
}

// --- Points revoke (unchanged) ---
window.revokePoints = async function(userId, rewardId) {
  alert("Revoke points not implemented on backend.");
  loadPoints();
};

// --- Tab switching ---
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('tab-btn-active'));
    this.classList.add('tab-btn-active');
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-' + this.dataset.tab).classList.remove('hidden');
  });
});

// --- Help tab ---
document.getElementById('helpForm')?.addEventListener('submit', function(e){
  e.preventDefault();
  const helpInput = document.getElementById('helpInput');
  if (helpInput.value.trim()) {
    const box = document.querySelector('#tab-help .h-32');
    box.innerHTML += `<div class="mb-1"><span class="font-semibold text-blue-900">You:</span> ${helpInput.value}</div>`;
    box.scrollTop = box.scrollHeight;
    helpInput.value = "";
  }
});

// --- Load everything ---
window.addEventListener('DOMContentLoaded', checkAdminAuth);

