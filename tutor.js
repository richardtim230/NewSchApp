
const API_BASE = "https://examguide.onrender.com";
const tokenKey = "examguard_token"; // key used for storing token (adjust if different)

// -------------------- Helpers --------------------
function getToken() {
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
}

function signOutAndRedirect() {
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
  localStorage.removeItem("examguard_user");
  sessionStorage.removeItem("examguard_user");
  window.location.href = "login.html";
}

function resolveAvatar(url, name = "User") {
  if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ede9fe&color=3b82f6`;
  if (typeof url !== "string") return url;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  try { return new URL(url, location.origin).href; } catch { return url; }
}

function showToast(msg, type = "success", timeout = 3500) {
  const el = document.createElement("div");
  el.className = `eg-toast ${type === "error" ? "error" : "success"}`;
  el.textContent = msg;
  el.style.opacity = "0";
  document.body.appendChild(el);
  requestAnimationFrame(() => el.style.opacity = "0.98");
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

// Basic fetch wrapper that attaches Authorization header (Bearer) and supports cookies
async function fetchJSON(path, opts = {}) {
  const token = getToken();
  if (!token) {
    signOutAndRedirect();
    throw new Error("No auth token");
  }

  const headers = new Headers(opts.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!(opts.body instanceof FormData) && opts.method && opts.method.toUpperCase() !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers
  });

  if (response.status === 401) {
    signOutAndRedirect();
    throw new Error("unauthorized");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  return { ok: response.ok, status: response.status, data };
}

// -------------------- Global state --------------------
let __studentsList = [];
let __notificationsList = []; // notifications fetched from /api/tutors/notifications
let __activeRequest = null;    // { note, student }

// -------------------- Profile & UI updaters --------------------
function saveUserLocally(userObj, remember = false) {
  if (remember) localStorage.setItem("examguard_user", JSON.stringify(userObj));
  else sessionStorage.setItem("examguard_user", JSON.stringify(userObj));
}

function updateProfileUI(profile) {
  if (!profile) return;
  const name = profile.fullname || profile.username || "Tutor";
  const email = profile.email || "—";
  document.getElementById("sidebarTutorName")?.textContent = name;
  document.getElementById("navTutorName")?.textContent = name;
  document.getElementById("dashboardTutorName")?.textContent = name;
  document.getElementById("profileFullname")?.textContent = profile.fullname || "—";
  document.getElementById("profileEmail")?.textContent = email;
  document.getElementById("profilePhone")?.textContent = profile.phone || "—";
  document.getElementById("profileAbout")?.textContent = profile.about || "—";
  document.getElementById("settingsFullname")?.textContent = name;
  document.getElementById("settingsContact") && (document.getElementById("settingsContact").innerHTML = `${email}<br>${profile.phone || ""}`);
  document.getElementById("settingsAbout") && (document.getElementById("settingsAbout").textContent = profile.about || "");
  document.getElementById("settingsTutorId") && (document.getElementById("settingsTutorId").textContent = profile._id ? String(profile._id).slice(-6) : "—");
  document.getElementById("tutorId") && (document.getElementById("tutorId").textContent = profile._id ? `ID: ${String(profile._id).slice(-8)}` : "");

  const avatarUrl = profile.profilePic || profile.profilepic || profile.avatar || "";
  if (avatarUrl) {
    const resolved = resolveAvatar(avatarUrl, name);
    document.getElementById("sideProfileAvatar") && (document.getElementById("sideProfileAvatar").src = resolved);
    document.getElementById("profileAvatar") && (document.getElementById("profileAvatar").src = resolved);
    document.getElementById("profileCardAvatar") && (document.getElementById("profileCardAvatar").src = resolved);
    document.getElementById("settingsAvatar") && (document.getElementById("settingsAvatar").src = resolved);
  }

  // Specialties
  const specContainer = document.getElementById("tutorSpecialties");
  const specSettings = document.getElementById("settingsSpecialties");
  if (specContainer) specContainer.innerHTML = "";
  if (specSettings) specSettings.innerHTML = "";
  const specs = (profile.specialties && profile.specialties.length) ? profile.specialties : (profile.specialty ? [profile.specialty] : []);
  specs.slice(0, 8).forEach(s => {
    const span = document.createElement("span");
    span.className = "specialty-pill";
    span.textContent = s;
    specContainer && specContainer.appendChild(span);
    specSettings && specSettings.appendChild(span.cloneNode(true));
  });

  // Achievements
  const achList = document.getElementById("achievementsList");
  if (achList) {
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
  }

  // LinkedIn link
  const linkedin = (profile.socials && profile.socials.linkedin) || (profile.social && profile.social.linkedin) || "";
  if (linkedin) {
    const ln = document.getElementById("linkedinLink");
    if (ln) {
      ln.href = linkedin;
      ln.classList.remove("hidden");
    }
    const pln = document.getElementById("profileLinkedin");
    if (pln) { pln.textContent = linkedin; pln.href = linkedin; }
  } else {
    const pln = document.getElementById("profileLinkedin");
    if (pln) { pln.textContent = "—"; pln.href = "#"; }
  }
}

// -------------------- Populate UI pieces --------------------
function populateSummary(data) {
  if (!data) return;
  document.getElementById("cardStudentsCount") && (document.getElementById("cardStudentsCount").textContent = data.studentsCount ?? "—");
  document.getElementById("cardActiveSessions") && (document.getElementById("cardActiveSessions").textContent = data.activeSessions ?? "—");
  document.getElementById("cardTotalEarnings") && (document.getElementById("cardTotalEarnings").textContent = `₦${Number(data.totalEarnings || 0).toLocaleString()}`);
  document.getElementById("cardAvgRating") && (document.getElementById("cardAvgRating").innerHTML = `${data.avgRating ?? "—"} <i class="fa fa-star text-yellow-400"></i>`);
  document.getElementById("cardReviewsCount") && (document.getElementById("cardReviewsCount").textContent = `${data.reviewsCount ?? 0} reviews`);
  document.getElementById("cardStudentsTrend") && (document.getElementById("cardStudentsTrend").textContent = "Updated just now");
  document.getElementById("cardEarningsThisMonth") && (document.getElementById("cardEarningsThisMonth").textContent = `This month: ₦${(data.totalEarnings || 0).toLocaleString()}`);
}

// Students table: shows "Review Request" when unread tutor-request exists from that student
function populateStudents(students) {
  __studentsList = Array.isArray(students) ? students : [];
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!__studentsList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">No students found.</td></tr>`;
    return;
  }

  __studentsList.forEach(s => {
    // pending notifications where type === 'tutor-request' and from matches student
    const pendingNotes = (__notificationsList || []).filter(n =>
      String(n.type) === "tutor-request" && !n.read && String(n.from) === String(s._id || s.id)
    );
    const hasPending = pendingNotes.length > 0;
    const noteId = hasPending ? (pendingNotes[0]._id || pendingNotes[0].id) : null;

    const last = s.lastSession || "—";
    const status = s.status || "Active";
    const statusHtml = status === 'Active'
      ? '<span class="bg-green-100 text-green-700 px-2 rounded-full text-xs font-semibold">Active</span>'
      : '<span class="bg-gray-100 text-gray-500 px-2 rounded-full text-xs font-semibold">Inactive</span>';

    const actionBtn = hasPending
      ? `<button class="bg-amber-500 text-white px-3 py-1 rounded text-xs shadow hover:bg-amber-600" onclick="openStudentRequestFromRow('${noteId}','${s._id || s.id}')"><i class="fa fa-handshake"></i> Review Request</button>`
      : `<button class="bg-indigo-700 text-white px-3 py-1 rounded text-xs shadow hover:bg-indigo-800">Message</button>`;

    tbody.innerHTML += `
      <tr>
        <td class="px-4 py-3 font-bold text-indigo-900">${s.fullname || s.username || "Student"}</td>
        <td class="px-4 py-3">${s.email || s.phone || "—"}</td>
        <td class="px-4 py-3">${(s.meta && s.meta.subject) || (s.preferredSubject) || "—"}</td>
        <td class="px-4 py-3">${statusHtml}</td>
        <td class="px-4 py-3">${last}</td>
        <td class="px-4 py-3">${actionBtn}</td>
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
        <span class="mt-1 md:mt-0 ${sess.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} px-3 py-1 rounded-full font-semibold text-xs inline-block">${sess.status}</span>
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
    const date = new Date(m.createdAt || Date.now()).toLocaleString();
    const unread = !m.read;
    const avatarSrc = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(from)}&background=ede9fe&color=3b82f6`;
    return `
      <div class="flex items-center gap-4 py-3 ${unread ? 'bg-indigo-50' : 'bg-white'} hover:bg-indigo-100 px-2 transition cursor-pointer">
        <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover border-2 ${unread ? 'border-indigo-300' : 'border-transparent'}"/>
        <div class="flex-1">
          <div class="font-bold text-indigo-800 text-sm">${from}</div>
          <div class="text-gray-700 text-xs truncate">${m.text || m.message || ''}</div>
        </div>
        <div class="text-xs text-gray-400 font-semibold whitespace-nowrap">${date}</div>
        <span class="${unread ? 'inline-block w-2 h-2 bg-indigo-500 rounded-full ml-1' : 'hidden'}"></span>
      </div>
    `;
  }).join("");
  const unread = msgs.some(m => !m.read);
  document.getElementById("notifDot")?.classList.toggle("hidden", !unread);
}

function populateAssignments(assignments) {
  const body = document.getElementById("assignmentsTableBody");
  const empty = document.getElementById("assignmentsEmptyMsg");
  if (!body) return;
  body.innerHTML = "";
  if (!assignments || !assignments.length) {
    empty && empty.classList.remove("hidden");
    return;
  }
  empty && empty.classList.add("hidden");
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
  document.getElementById("earnTotal") && (document.getElementById("earnTotal").textContent = `₦${Number(summary.total || 0).toLocaleString()}`);
  document.getElementById("earnPending") && (document.getElementById("earnPending").textContent = `₦${Number(summary.pending || 0).toLocaleString()}`);
  document.getElementById("earnWithdrawn") && (document.getElementById("earnWithdrawn").textContent = `₦${Number(summary.withdrawn || 0).toLocaleString()}`);
  const tbody = document.getElementById("earningsTableBody");
  if (!tbody) return;
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
  __notificationsList = Array.isArray(notes) ? notes : [];
  const list = document.getElementById("notificationList");
  if (list) {
    list.innerHTML = "";
    if (!__notificationsList.length) {
      list.innerHTML = "<li class='text-gray-500'>No notifications</li>";
    } else {
      __notificationsList.slice(0, 8).forEach(n => {
        const from = (n.from && (n.from.fullname || n.from.username)) || "";
        const text = n.title ? `${n.title} — ${n.message || ""}` : (n.message || "");
        list.innerHTML += `<li><strong>${from ? from + ":" : ""}</strong> ${text}</li>`;
      });
    }
  }
  const unread = __notificationsList.some(n => !n.read);
  document.getElementById("notifDot")?.classList.toggle("hidden", !unread);
  // Re-render students so request actions reflect latest notifications
  populateStudents(__studentsList);
}

function populateReviews(reviews) {
  console.log("reviews loaded:", reviews && reviews.length ? reviews.length : 0);
}

// -------------------- Charts --------------------
function renderCharts(summary = null, earningsPayload = null) {
  const months = Array.from({length:6},(_,i)=> {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('default',{month:'short'});
  });

  const studentsTarget = summary?.studentsCount ?? 27;
  const studentsData = [Math.max(0, studentsTarget-10), Math.max(0, studentsTarget-6), Math.max(0, studentsTarget-4), Math.max(0, studentsTarget-2), Math.max(0, studentsTarget-1), studentsTarget];

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
  const sElem = document.getElementById("studentsChart");
  if (sElem) {
    const sCtx = sElem.getContext("2d");
    if (window._studentsChart) window._studentsChart.destroy();
    window._studentsChart = new Chart(sCtx, {
      type: "line",
      data: { labels: months, datasets: [{ label: "Students", data: studentsData, borderColor: "#6366f1", backgroundColor: "#6366f122", tension: 0.38, fill: true, pointRadius: 5, pointBackgroundColor: "#512fcf" }] },
      options: { responsive:true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero:true } } }
    });
  }

  // Earnings chart
  const eElem = document.getElementById("earningsChart");
  if (eElem) {
    const eCtx = eElem.getContext("2d");
    if (window._earningsChart) window._earningsChart.destroy();
    window._earningsChart = new Chart(eCtx, {
      type: "line",
      data: { labels: months, datasets: [{ label: "Earnings (₦)", data: earningsData, borderColor: "#14b8a6", backgroundColor: "#14b8a632", tension: 0.38, fill: true, pointRadius: 5, pointBackgroundColor: "#22d3ee" }] },
      options: { responsive:true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero:true, ticks: { callback: v => `₦${v.toLocaleString()}` } } } }
    });
  }
}

// -------------------- Student Request Modal Flow --------------------
async function openStudentRequestFromRow(notificationId, studentId) {
  try {
    let note = (__notificationsList || []).find(n => String(n._id || n.id) === String(notificationId));
    if (!note) {
      const nt = await fetchJSON("/api/tutors/notifications", { method: "GET" }).catch(()=>null);
      if (nt && nt.ok) __notificationsList = nt.data;
      note = (__notificationsList || []).find(n => String(n._id || n.id) === String(notificationId));
      if (!note) throw new Error("Notification not found");
    }

    let student = (__studentsList || []).find(s => String(s._id || s.id) === String(studentId));
    if (!student) {
      const st = await fetchJSON(`/api/users/${studentId}`, { method: "GET" }).catch(()=>null);
      if (st && st.ok) student = st.data;
    }

    __activeRequest = { note, student };

    document.getElementById("reqModalAvatar").src = resolveAvatar(student?.profilePic || student?.avatar || "", student?.fullname || student?.username || "Student");
    document.getElementById("reqModalName").textContent = student?.fullname || student?.username || "Student";
    document.getElementById("reqModalId").textContent = student?. _id || student?.id ? `ID: ${String(student._id || student.id).slice(-8)}` : "ID: —";
    document.getElementById("reqModalInstitution").textContent = student?.academics?.institution || student?.school || student?.meta?.institution || "—";
    document.getElementById("reqModalProgram").textContent = student?.academics?.program || student?.program || student?.meta?.program || "—";
    document.getElementById("reqModalLevel").textContent = student?.academics?.level || student?.level || student?.meta?.level || "—";
    document.getElementById("reqModalGPA").textContent = student?.academics?.gpa || student?.gpa || student?.meta?.gpa || "—";

    const preferred = (student?.preferredSubjects || student?.specialties || student?.meta?.subjects || []).slice(0, 12);
    const subjectsEl = document.getElementById("reqModalSubjects");
    subjectsEl.innerHTML = preferred.length ? preferred.map(s => `<span class="specialty-pill">${s}</span>`).join(' ') : "—";

    document.getElementById("reqModalMessage").textContent = note?.message || note?.data?.message || "No message provided.";

    // Show modal
    const modal = document.getElementById("studentRequestModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    }

    document.getElementById("acceptReqBtn") && (document.getElementById("acceptReqBtn").disabled = false);
    document.getElementById("rejectReqBtn") && (document.getElementById("rejectReqBtn").disabled = false);
  } catch (err) {
    console.error("openStudentRequestFromRow error:", err);
    showToast("Unable to load request details", "error");
  }
}

function closeStudentRequestModal() {
  const modal = document.getElementById("studentRequestModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }
  __activeRequest = null;
}

async function handleAcceptRequest() {
  if (!__activeRequest) return;
  const note = __activeRequest.note;
  const student = __activeRequest.student;
  try {
    document.getElementById("acceptReqBtn").disabled = true;
    // mark notification as read
    await fetchJSON(`/api/tutors/notifications/${note._id || note.id}/read`, { method: "PATCH" });
    // message the student
    const msgText = `Hi ${student?.fullname || ''}, I accepted your tutoring request. Please reply to schedule a session.`;
    await fetchJSON("/api/tutors/messages", { method: "POST", body: JSON.stringify({ to: student._id || student.id, text: msgText }) });

    await refreshNotificationsAndStudents();
    closeStudentRequestModal();
    showToast("Request accepted — student notified", "success");
  } catch (err) {
    console.error("handleAcceptRequest error:", err);
    showToast("Failed to accept request", "error");
    document.getElementById("acceptReqBtn") && (document.getElementById("acceptReqBtn").disabled = false);
  }
}

async function handleRejectRequest() {
  if (!__activeRequest) return;
  const note = __activeRequest.note;
  const student = __activeRequest.student;
  try {
    document.getElementById("rejectReqBtn").disabled = true;
    await fetchJSON(`/api/tutors/notifications/${note._id || note.id}/read`, { method: "PATCH" });
    const msgText = `Hello ${student?.fullname || ''}, thank you for your request. I'm unable to take this at the moment. Please try other tutors.`;
    await fetchJSON("/api/tutors/messages", { method: "POST", body: JSON.stringify({ to: student._id || student.id, text: msgText }) });

    await refreshNotificationsAndStudents();
    closeStudentRequestModal();
    showToast("Request rejected — student notified", "success");
  } catch (err) {
    console.error("handleRejectRequest error:", err);
    showToast("Failed to reject request", "error");
    document.getElementById("rejectReqBtn") && (document.getElementById("rejectReqBtn").disabled = false);
  }
}

async function refreshNotificationsAndStudents() {
  try {
    const notesRes = await fetchJSON("/api/tutors/notifications", { method: "GET" });
    if (notesRes && notesRes.ok) __notificationsList = notesRes.data || [];
  } catch (e) {
    console.warn("refreshNotificationsAndStudents: couldn't refresh notifications", e);
  }
  try {
    const studs = await fetchJSON("/api/tutors/students", { method: "GET" });
    if (studs && studs.ok) __studentsList = studs.data || [];
  } catch (e) {
    console.warn("refreshNotificationsAndStudents: couldn't refresh students", e);
  }
  populateNotifications(__notificationsList);
  populateStudents(__studentsList);
}

// -------------------- Navigation & misc --------------------
function toggleMobileSidebar(open) {
  const sidebar = document.getElementById("tutorSidebar");
  const overlay = document.getElementById("navMobileOverlay");
  if (!sidebar || !overlay) return;
  if (open) { sidebar.classList.remove("-translate-x-full"); overlay.classList.remove("hidden"); }
  else { sidebar.classList.add("-translate-x-full"); overlay.classList.add("hidden"); }
}

const sectionIDs = ["overview","students","sessions","messages","tasks","earnings","settings"];
function showSection(section) {
  sectionIDs.forEach(id => {
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

function switchProfileTab(tab) {
  document.getElementById('profileTabContent')?.classList.add('hidden');
  document.getElementById('securityTabContent')?.classList.add('hidden');
  document.getElementById('notifsTabContent')?.classList.add('hidden');
  document.getElementById('profileTabBtn') && (document.getElementById('profileTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold");
  document.getElementById('securityTabBtn') && (document.getElementById('securityTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold");
  document.getElementById('notifTabBtn') && (document.getElementById('notifTabBtn').className = "tabBtn bg-gray-100 text-gray-600 px-6 py-2 rounded-t-lg font-semibold");
  if (tab === "profile") {
    document.getElementById('profileTabContent')?.classList.remove('hidden');
    document.getElementById('profileTabBtn') && (document.getElementById('profileTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500");
  }
  if (tab === "security") {
    document.getElementById('securityTabContent')?.classList.remove('hidden');
    document.getElementById('securityTabBtn') && (document.getElementById('securityTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500");
  }
  if (tab === "notifs") {
    document.getElementById('notifsTabContent')?.classList.remove('hidden');
    document.getElementById('notifTabBtn') && (document.getElementById('notifTabBtn').className = "tabBtn bg-indigo-100 text-indigo-800 px-6 py-2 rounded-t-lg font-bold border-b-2 border-indigo-500");
  }
}

// -------------------- Initialization --------------------
async function initDashboard() {
  try {
    // Profile
    let profileResp = await fetchJSON("/api/auth/me", { method: "GET" }).catch(()=>null);
    if (!profileResp || !profileResp.ok) profileResp = await fetchJSON("/api/tutors/me", { method: "GET" }).catch(()=>null);
    const profile = profileResp?.data?.user || profileResp?.data || null;
    if (profile) {
      const safe = { id: profile._id || profile.id, username: profile.username || profile.email, fullname: profile.fullname, role: profile.role };
      saveUserLocally(safe, !!localStorage.getItem(tokenKey));
      updateProfileUI(profile);
    } else {
      // Try to use locally stored user if token is present
      const local = localStorage.getItem("examguard_user") || sessionStorage.getItem("examguard_user");
      if (local) updateProfileUI(JSON.parse(local));
    }

    // Parallel resource fetches
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

    if (notesRes && notesRes.ok) {
      __notificationsList = notesRes.data || [];
      populateNotifications(__notificationsList);
    }

    if (studentsRes && studentsRes.ok) {
      __studentsList = studentsRes.data || [];
      populateStudents(__studentsList);
    }

    if (summaryRes && summaryRes.ok) populateSummary(summaryRes.data);
    if (sessionsRes && sessionsRes.ok) populateSessions(sessionsRes.data);
    if (messagesRes && messagesRes.ok) populateMessages(messagesRes.data);
    if (assignmentsRes && assignmentsRes.ok) populateAssignments(assignmentsRes.data);
    if (earningsRes && earningsRes.ok) populateEarnings(earningsRes.data);
    if (reviewsRes && reviewsRes.ok) populateReviews(reviewsRes.data);

    renderCharts(summaryRes?.data, earningsRes?.data);
  } catch (err) {
    console.error("initDashboard failed:", err);
    const el = document.getElementById("overviewAnnouncement");
    if (el) el.textContent = "Could not load full dashboard. Some features may be limited.";
    renderCharts();
  }
}

// -------------------- Event wiring --------------------
document.addEventListener("DOMContentLoaded", () => {
  showSection("overview");
  initDashboard();

  // close modal on backdrop click
  const modal = document.getElementById("studentRequestModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeStudentRequestModal();
    });
  }

  // close modal on Escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeStudentRequestModal();
  });
});
