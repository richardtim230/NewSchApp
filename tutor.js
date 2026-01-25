
const API_BASE = "https://examguide.onrender.com";
const tokenKey = "examguard_token"; // frontend login stores this
const userKey = "examguard_user";

function getToken() {
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
}

function saveUserLocally(userObj, remember=false) {
  if (remember) localStorage.setItem(userKey, JSON.stringify(userObj));
  else sessionStorage.setItem(userKey, JSON.stringify(userObj));
}

function signOutAndRedirect() {
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  sessionStorage.removeItem(userKey);
  window.location.href = "login.html";
}

async function fetchJSON(path, opts = {}) {
  const token = getToken();
  if (!token) {
    signOutAndRedirect();
    throw new Error("No auth token");
  }
  const headers = new Headers(opts.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (response.status === 401) {
    signOutAndRedirect();
    throw new Error("unauthorized");
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { ok: response.ok, status: response.status, data: await response.json() };
  }
  return { ok: response.ok, status: response.status, data: null };
}

async function initDashboard() {
  try {
    // Fetch profile: try /api/auth/me first (common), fallback to /api/tutors/me
    let profileResp = await fetchJSON("/api/auth/me", { method: "GET" }).catch(()=>null);
    if (!profileResp || !profileResp.ok) {
      profileResp = await fetchJSON("/api/tutors/me", { method: "GET" }).catch(()=>null);
    }
    const profile = profileResp?.data?.user || profileResp?.data || null;
    if (!profile) {
      // try local stored user (graceful)
      const local = localStorage.getItem(userKey) || sessionStorage.getItem(userKey);
      if (local) {
        const u = JSON.parse(local);
        updateProfileUI(u);
      } else {
        throw new Error("Could not load profile");
      }
    } else {
      // Save safe copy
      const safe = { id: profile._id || profile.id, username: profile.username || profile.email, fullname: profile.fullname, role: profile.role };
      saveUserLocally(safe, !!localStorage.getItem(tokenKey));
      updateProfileUI(profile);
    }

    // Parallel fetches for dashboard summary and other resources
    const [
      summaryRes, studentsRes, sessionsRes, messagesRes, assignmentsRes, earningsRes, notesRes, reviewsRes
    ] = await Promise.all([
      fetchJSON("/api/tutors/dashboard-summary", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/students", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/sessions", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/messages", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/assignments", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/earnings", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/notifications", { method: "GET" }).catch(()=>null),
      fetchJSON("/api/tutors/reviews", { method: "GET" }).catch(()=>null),
    ]);

    if (summaryRes && summaryRes.ok) populateSummary(summaryRes.data);
    if (studentsRes && studentsRes.ok) populateStudents(studentsRes.data);
    if (sessionsRes && sessionsRes.ok) populateSessions(sessionsRes.data);
    if (messagesRes && messagesRes.ok) populateMessages(messagesRes.data);
    if (assignmentsRes && assignmentsRes.ok) populateAssignments(assignmentsRes.data);
    if (earningsRes && earningsRes.ok) populateEarnings(earningsRes.data);
    if (notesRes && notesRes.ok) populateNotifications(notesRes.data);
    if (reviewsRes && reviewsRes.ok) populateReviews(reviewsRes.data);

    // Render charts using fetched data where possible
    renderCharts(summaryRes?.data, earningsRes?.data);

  } catch (err) {
    console.error("Dashboard init failed:", err);
    document.getElementById("overviewAnnouncement").textContent = "Could not load full dashboard. Some features may be limited.";
    // Still render with local/demo data
    renderCharts();
  }
}

function updateProfileUI(profile) {
  const name = profile.fullname || profile.username || "Tutor";
  document.getElementById("sidebarTutorName").textContent = name;
  document.getElementById("navTutorName").textContent = name;
  document.getElementById("dashboardTutorName").textContent = name;
  document.getElementById("profileFullname").textContent = profile.fullname || "—";
  document.getElementById("profileEmail").textContent = profile.email || "—";
  document.getElementById("profilePhone").textContent = profile.phone || "—";
  document.getElementById("profileAbout").textContent = profile.about || "";
  document.getElementById("settingsFullname").textContent = name;
  document.getElementById("settingsContact").innerHTML = `${profile.email || "—"}<br>${profile.phone || ""}`;
  document.getElementById("settingsAbout").textContent = profile.about || "";
  document.getElementById("settingsTutorId").textContent = profile._id ? String(profile._id).slice(-6) : "—";
  document.getElementById("tutorId").textContent = profile._id ? `ID: ${String(profile._id).slice(-8)}` : "";
  // Avatar
  const avatarUrl = profile.profilePic || profile.profilepic || profile.avatar || "";
  if (avatarUrl) {
    document.getElementById("sideProfileAvatar").src = avatarUrl;
    document.getElementById("profileAvatar").src = avatarUrl;
    document.getElementById("profileCardAvatar").src = avatarUrl;
    document.getElementById("settingsAvatar").src = avatarUrl;
  }
  // Specialties
  const specContainer = document.getElementById("tutorSpecialties");
  const specSettings = document.getElementById("settingsSpecialties");
  specContainer.innerHTML = "";
  specSettings.innerHTML = "";
  const specs = profile.specialties && profile.specialties.length ? profile.specialties : (profile.specialty ? [profile.specialty] : []);
  specs.slice(0, 8).forEach(s => {
    const span = document.createElement("span");
    span.className = "specialty-pill";
    span.textContent = s;
    specContainer.appendChild(span);
    const span2 = span.cloneNode(true);
    specSettings.appendChild(span2);
  });
  // Achievements
  const achList = document.getElementById("achievementsList");
  achList.innerHTML = "";
  const achs = profile.achievements && profile.achievements.length ? profile.achievements : [];
  if (achs.length) {
    achs.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      achList.appendChild(li);
    });
  } else {
    achList.innerHTML = "<li class='text-gray-500'>No achievements yet. Add from profile settings.</li>";
  }
  // Socials
  const linkedin = (profile.socials && profile.socials.linkedin) || (profile.social && profile.social.linkedin) || "";
  if (linkedin) {
    const ln = document.getElementById("linkedinLink");
    ln.href = linkedin;
    ln.classList.remove("hidden");
    document.getElementById("profileLinkedin").textContent = linkedin;
    document.getElementById("profileLinkedin").href = linkedin;
  } else {
    document.getElementById("profileLinkedin").textContent = "—";
    document.getElementById("profileLinkedin").href = "#";
  }
}

function populateSummary(data) {
  if (!data) return;
  document.getElementById("cardStudentsCount").textContent = data.studentsCount ?? "—";
  document.getElementById("cardActiveSessions").textContent = data.activeSessions ?? "—";
  document.getElementById("cardTotalEarnings").textContent = `₦${Number(data.totalEarnings || 0).toLocaleString()}`;
  document.getElementById("cardAvgRating").innerHTML = `${data.avgRating ?? "—"} <i class="fa fa-star text-yellow-400"></i>`;
  document.getElementById("cardReviewsCount").textContent = `${data.reviewsCount ?? 0} reviews`;
  document.getElementById("cardStudentsTrend").textContent = "Updated just now";
  document.getElementById("cardEarningsThisMonth").textContent = `This month: ₦${(data.totalEarnings || 0).toLocaleString()}`;
}

function populateStudents(students) {
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!students || !students.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">No students found.</td></tr>`;
    return;
  }
  students.forEach(s => {
    const last = s.lastSession || "—";
    const status = s.status || "Active";
    tbody.innerHTML += `
      <tr>
        <td class="px-4 py-3 font-bold text-indigo-900">${s.fullname || s.username || "Student"}</td>
        <td class="px-4 py-3">${s.email || s.phone || "—"}</td>
        <td class="px-4 py-3">${(s.meta && s.meta.subject) || "—"}</td>
        <td class="px-4 py-3">${status === 'Active' ? '<span class="bg-green-100 text-green-700 px-2 rounded-full text-xs font-semibold">Active</span>' : '<span class="bg-gray-100 text-gray-500 px-2 rounded-full text-xs font-semibold">Inactive</span>'}</td>
        <td class="px-4 py-3">${last}</td>
        <td class="px-4 py-3"><button class="bg-indigo-700 text-white px-4 py-1 rounded shadow text-xs hover:bg-indigo-800">Message</button></td>
      </tr>
    `;
  });
}

function populateSessions(sessions) {
  const container = document.getElementById("sessionsList");
  if (!container) return;
  container.innerHTML = "";
  if (!sessions || !sessions.length) {
    container.innerHTML = `<div class="text-center py-10 text-gray-400">No sessions yet.</div>`;
    return;
  }
  container.innerHTML = sessions.map(sess => {
    const when = new Date(sess.date).toLocaleString();
    const studName = (sess.student && (sess.student.fullname || sess.student.username)) || (sess.student) || "Student";
    const statusClass = sess.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";
    return `
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b py-3 last:border-none">
        <div class="mb-1 md:mb-0">
          <span class="font-bold text-indigo-800 text-base">${sess.title || "Session"}</span>
          <span class="ml-3 text-xs ${statusClass} px-3 py-1 rounded-full font-semibold">${when}</span>
          <span class="ml-3 text-xs text-gray-600"><i class="fa-solid fa-user"></i> ${studName}</span>
        </div>
        <span class="mt-1 md:mt-0 ${sess.status==='Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} px-3 py-1 rounded-full font-semibold text-xs inline-block">${sess.status || 'Scheduled'}</span>
      </div>
    `;
  }).join("");
}

function populateMessages(msgs) {
  const inbox = document.getElementById("messagesInbox");
  if (!inbox) return;
  inbox.innerHTML = "";
  if (!msgs || !msgs.length) {
    inbox.innerHTML = `<div class="py-8 text-center text-gray-400">No messages yet.</div>`;
    return;
  }
  inbox.innerHTML = msgs.map(m => {
    const from = (m.from && (m.from.fullname || m.from.username)) || (m.from) || "Sender";
    const avatar = (m.from && m.from.profilePic) || m.avatar || '';
    const date = new Date(m.createdAt || m.createdAt || Date.now()).toLocaleString();
    const unread = !m.read;
    return `
      <div class="flex items-center gap-4 py-3 ${unread ? 'bg-indigo-50' : 'bg-white'} hover:bg-indigo-100 px-2 transition cursor-pointer">
        <img src="${avatar || 'https://ui-avatars.com/api/?name=${encodeURIComponent(from)}&background=ede9fe&color=3b82f6&size=64'}" class="w-10 h-10 rounded-full object-cover border-2 ${unread ? 'border-indigo-400' : 'border-gray-100'}"/>
        <div class="flex-1">
          <div class="font-bold text-indigo-800 text-sm">${from}</div>
          <div class="text-gray-700 text-xs truncate">${m.text || m.message || ''}</div>
        </div>
        <div class="text-xs text-gray-400 font-semibold whitespace-nowrap">${date}</div>
        <span class="${unread ? 'inline-block w-2 h-2 bg-indigo-500 rounded-full ml-1' : 'hidden'}"></span>
      </div>
    `;
  }).join("");
  // show notif dot if there are unread
  const unread = msgs.some(m => !m.read);
  document.getElementById("notifDot").classList.toggle("hidden", !unread);
}

function populateAssignments(assignments) {
  const body = document.getElementById("assignmentsTableBody");
  const empty = document.getElementById("assignmentsEmptyMsg");
  body.innerHTML = "";
  if (!assignments || !assignments.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  assignments.forEach(a => {
    const assignedTo = Array.isArray(a.assignedTo) ? (a.assignedTo.map(x => x.fullname || x.username || x || '').join(", ")) : (a.assignedTo || "All");
    const submissions = a.submissionsCount || 0;
    const due = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : (a.dueDate || "—");
    const status = a.status || "Pending";
    body.innerHTML += `
      <tr>
        <td class="py-3 px-3 font-bold text-indigo-900">${a.title}</td>
        <td class="py-3 px-3">${a.subject}</td>
        <td class="py-3 px-3">${due}</td>
        <td class="py-3 px-3">${assignedTo}</td>
        <td class="py-3 px-3 text-center">${submissions}</td>
        <td class="py-3 px-3">${renderAssignStatusPill(status)}</td>
        <td class="py-3 px-3">
          <button class="bg-green-500 text-white px-3 py-1 rounded text-xs shadow hover:bg-green-600 mr-1"><i class="fa fa-eye"></i> View</button>
          <button class="bg-indigo-600 text-white px-3 py-1 rounded text-xs shadow hover:bg-indigo-800"><i class="fa fa-edit"></i> Edit</button>
        </td>
      </tr>
    `;
  });
}

function renderAssignStatusPill(status) {
  switch(status) {
    case "Pending": return '<span class="bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-full text-xs">Pending</span>';
    case "Published": return '<span class="bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full text-xs">Published</span>';
    case "Graded": return '<span class="bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full text-xs">Graded</span>';
    case "Overdue": return '<span class="bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-full text-xs">Overdue</span>';
    default: return `<span class="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full text-xs">${status}</span>`;
  }
}

function populateEarnings(payload) {
  if (!payload) return;
  const earnings = payload.earnings || payload || [];
  const summary = payload.summary || {};
  document.getElementById("earnTotal").textContent = `₦${Number(summary.total || 0).toLocaleString()}`;
  document.getElementById("earnPending").textContent = `₦${Number(summary.pending || 0).toLocaleString()}`;
  document.getElementById("earnWithdrawn").textContent = `₦${Number(summary.withdrawn || 0).toLocaleString()}`;
  const tbody = document.getElementById("earningsTableBody");
  tbody.innerHTML = "";
  (earnings || []).slice(0, 8).forEach(e => {
    const date = new Date(e.date || e.createdAt || Date.now()).toLocaleDateString();
    const amount = Number(e.amount || 0);
    const type = (e.status && e.status.toLowerCase().includes("withdraw")) ? "Debit" : "Credit";
    tbody.innerHTML += `
      <tr>
        <td class="px-4 py-3">${date}</td>
        <td class="px-4 py-3">${e.source || e.meta?.source || "Tutoring"}</td>
        <td class="px-4 py-3">${type == "Credit" ? '<span class="bg-green-100 text-green-700 px-2 rounded-full text-xs font-semibold">Credit</span>' : '<span class="bg-red-100 text-red-700 px-2 rounded-full text-xs font-semibold">Debit</span>'}</td>
        <td class="px-4 py-3 text-right font-bold">₦${amount.toLocaleString()}</td>
      </tr>
    `;
  });
}

function populateNotifications(notes) {
  const list = document.getElementById("notificationList");
  if (!list) return;
  list.innerHTML = "";
  if (!notes || !notes.length) {
    list.innerHTML = "<li class='text-gray-500'>No notifications</li>";
    return;
  }
  notes.slice(0, 8).forEach(n => {
    const from = (n.from && (n.from.fullname || n.from.username)) || "";
    const text = n.title ? `${n.title} — ${n.message || ""}` : (n.message || "");
    list.innerHTML += `<li><strong>${from ? from + ":" : ""}</strong> ${text}</li>`;
  });
  // Show notif dot if any unread
  const unread = notes.some(n => !n.read);
  document.getElementById("notifDot").classList.toggle("hidden", !unread);
}

function populateReviews(reviews) {
  // summary or list; we already use summary from dashboard-summary for avg rating
  // optionally populate a reviews list somewhere if available
  console.log("reviews loaded:", reviews && reviews.length ? reviews.length : 0);
}

// Charts: use provided summary and earnings to synthesize plausible series.
// If not provided, charts will show demo data.
function renderCharts(summary = null, earningsPayload = null) {
  const months = Array.from({length:6},(_,i)=> {
    const d = new Date();
    d.setMonth(d.getMonth() - (5-i));
    return d.toLocaleString('default',{month:'short'});
  });

  // Students: if summary.studentsCount available, create a monotonic series to that number
  const studentsTarget = summary?.studentsCount ?? 27;
  const studentsData = [Math.max(0, studentsTarget-10), Math.max(0, studentsTarget-6), Math.max(0, studentsTarget-4), Math.max(0, studentsTarget-2), Math.max(0, studentsTarget-1), studentsTarget];

  // Earnings: if earningsPayload.summary.total available, create ramp
  const total = Number(summary?.totalEarnings ?? (earningsPayload?.summary?.total ?? 234000));
  const base = Math.max(0, Math.round(total * 0.4));
  const earningsData = [
    Math.round(base * 0.8),
    Math.round(base * 1.0),
    Math.round(base * 1.2),
    Math.round(base * 1.6),
    Math.round(base * 2.0),
    total
  ];

  // Students chart
  const sCtx = document.getElementById("studentsChart").getContext("2d");
  if (window._studentsChart) window._studentsChart.destroy();
  window._studentsChart = new Chart(sCtx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Students",
        data: studentsData,
        borderColor: "#6366f1",
        backgroundColor: "#6366f122",
        tension: 0.38,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#512fcf"
      }]
    },
    options: { responsive:true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero:true } } }
  });

  // Earnings chart
  const eCtx = document.getElementById("earningsChart").getContext("2d");
  if (window._earningsChart) window._earningsChart.destroy();
  window._earningsChart = new Chart(eCtx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Earnings (₦)",
        data: earningsData,
        borderColor: "#14b8a6",
        backgroundColor: "#14b8a632",
        tension: 0.38,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#22d3ee"
      }]
    },
    options: {
      responsive:true,
      plugins: { legend: { display:false } },
      scales: { y: { beginAtZero:true, ticks: {callback:v=> `₦${v.toLocaleString()}`}}}
    }
  });
}

// Utils & navigation
function toggleMobileSidebar(open) {
  const sidebar = document.getElementById("tutorSidebar");
  const overlay = document.getElementById("navMobileOverlay");
  if (open) { sidebar.classList.remove("-translate-x-full"); overlay.classList.remove("hidden"); }
  else { sidebar.classList.add("-translate-x-full"); overlay.classList.add("hidden"); }
}

const sectionIDs = ["overview","students","sessions","messages","tasks","earnings","settings"];
function showSection(section) {
  sectionIDs.forEach(id=>{
    const sec = document.getElementById("section-" + id);
    if (sec) sec.classList.toggle("hidden", id !== section);
  });
  // highlight sidebar button
  const btns = document.querySelectorAll("#tutorSidebar nav button");
  btns.forEach(btn => {
    const text = (btn.textContent || "").trim().toLowerCase();
    if (text.includes(section)) btn.classList.add("sidebar-active"); else btn.classList.remove("sidebar-active");
  });
  toggleMobileSidebar(false);
}

function logoutTutor() {
  signOutAndRedirect();
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  showSection("overview");
  initDashboard();
});

// Profile tab switcher (kept from original)
function switchProfileTab(tab) {
  document.getElementById('profileTabContent').classList.add('hidden');
  document.getElementById('securityTabContent').classList.add('hidden');
  document.getElementById('notifsTabContent').classList.add('hidden');
  document.getElementById('profileTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold";
  document.getElementById('securityTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold";
  document.getElementById('notifTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold";
  if (tab==="profile") {
    document.getElementById('profileTabContent').classList.remove('hidden');
    document.getElementById('profileTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500";
  }
  if (tab==="security") {
    document.getElementById('securityTabContent').classList.remove('hidden');
    document.getElementById('securityTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500";
  }
  if (tab==="notifs") {
    document.getElementById('notifsTabContent').classList.remove('hidden');
    document.getElementById('notifTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500";
  }
}
