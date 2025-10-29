// ====== CONFIG ======
const API_BASE = "https://examguide.onrender.com/api";
const USER_API = API_BASE + "/auth/me";
const ANSWER_API = API_BASE + "/past-questions/save-answers";
const SUBMIT_API = API_BASE + "/past-questions/submit";
let token = localStorage.getItem("token") || "";
// === Ad Modal Logic ===
let adModalTimer = null, adModalCountdown = 10, adModalProceedCallback = null;
const SMARTLINK_URL = "https://nevillequery.com/aphb8wa4g?key=e33b11641a201e15c5c4c5343e791af6";

function showAdModal(proceedCallback) {
  adModalProceedCallback = proceedCallback;
  adModalCountdown = 10;
  document.getElementById("adIframe").src = SMARTLINK_URL;
  document.getElementById("adModal").style.display = "flex";
  document.getElementById("adCountdown").textContent = adModalCountdown;
  document.getElementById("adCancelBtn").style.display = "none";
  clearInterval(adModalTimer);
  adModalTimer = setInterval(() => {
    adModalCountdown--;
    document.getElementById("adCountdown").textContent = adModalCountdown;
    if (adModalCountdown <= 5) {
      document.getElementById("adCancelBtn").style.display = "block";
    }
    if (adModalCountdown <= 0) {
      closeAdModal(true);
    }
  }, 500);
}

function closeAdModal(proceed) {
  clearInterval(adModalTimer);
  document.getElementById("adModal").style.display = "none";
  document.getElementById("adIframe").src = "";
  if (proceed && typeof adModalProceedCallback === "function") {
    adModalProceedCallback();
    adModalProceedCallback = null;
  }
}

document.getElementById("adCancelBtn").onclick = function() {
  closeAdModal(false);
};
// ====== COURSE CODES MAP ======
const courseCodes = {
  "Mathematics": ["MTH101", "MTH102", "MTH105", "MTH201", "MTH202"],
  "Physics": ["PHY101", "PHY102", "PHY201", "PHY202", "PHY205"],
  "Chemistry": ["CHM101", "CHM102", "CHM201", "CHM202"],
  "Biology": ["BIO101", "BIO102", "BIO201", "BIO202"],
  "Computer Science": ["CSC101", "CSC102", "CSC201", "CSC202"]
};

// ====== USER/EXAM METADATA ======
let user = { _id: "", fullname: "Student", regNo: "", profilePic: "https://i.pravatar.cc/56", class: "" };
let exam = { subject: "Mathematics", year: "2024", courseCode: "MTH101", title: "Mathematics Practice", duration: 40*60, topic: "" };
let config = {};

// ====== STATE ======
let questions = [];
let answers = {};
let flags = {};
let currentQuestion = 0;
let timer = exam.duration;
let timerInterval;
let autosaveTimeout;
let startTime = 0;
let submitted = false;

// ====== MODAL NOTIFICATION SYSTEM ======
function showNotificationModal({ message, type = "info", icon = "" }) {
  const modal = document.getElementById("notificationModal");
  const text = document.getElementById("notificationText");
  const iconElem = document.getElementById("notificationIcon");
  text.textContent = message || "";
  iconElem.innerHTML = icon || (type === "success"
    ? "✅"
    : type === "error"
    ? "❌"
    : "ℹ️"
  );
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("notificationCloseBtn").onclick = function() {
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

// ====== CONFIRMATION MODAL SYSTEM ======
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


// ====== CONFIG FORM LOGIC ======
document.getElementById("subject").addEventListener("change", function() {
  const subject = this.value;
  const codeSelect = document.getElementById("courseCode");
  codeSelect.innerHTML = `<option value="">Select Course Code</option>`;
  if (subject && courseCodes[subject]) {
    courseCodes[subject].forEach(code => {
      codeSelect.innerHTML += `<option value="${code}">${code}</option>`;
    });
    codeSelect.disabled = false;
  } else {
    codeSelect.disabled = true;
  }
});

document.getElementById("practice-config-form").onsubmit = async function(e) {
  e.preventDefault();
  const subject = document.getElementById("subject").value;
  const courseCode = document.getElementById("courseCode").value;
  const year = document.getElementById("year").value;
  const count = document.getElementById("questions").value;
  const time = document.getElementById("time").value;
  const topic = document.getElementById("topic").value;
  if (!subject || !courseCode || !year || !count || !time) {
    showNotificationModal({ message: "Please fill out all required fields.", type: "error" });
    return;
  }
  const cfg = { subject, courseCode, year, count, time, topic };
  localStorage.setItem("tppConfig", JSON.stringify(cfg));

  // Re-initialize session
  parseConfig();
  await fetchUser();
  await fetchQuestions();
  startTime = Date.now();
  timerInterval && clearInterval(timerInterval);
  timer = exam.duration;
  timerInterval = setInterval(() => {
    if (!examInSession) return;
    timer--;
    updateTimer();
    if (timer <= 0) submitExam();
  }, 1000);
  setFooterState();

  // Hide the sidebar if on mobile
  if (window.innerWidth <= 900) {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
};

// ====== INIT ======
let examInSession = false;
window.onload = async function() {
  parseConfig();
  if (examInSession) {
    await fetchUser();
    await fetchQuestions();
    startTime = Date.now();
    updateTimer();
    timerInterval && clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!examInSession) return;
      timer--;
      updateTimer();
      if (timer <= 0) submitExam();
    }, 1000);
    setFooterState();
  } else {
    setFooterState();
  }
};

function parseConfig() {
  // Read config from localStorage
  if (localStorage.getItem('tppConfig')) {
    config = JSON.parse(localStorage.getItem('tppConfig'));
  }
  // Only set examInSession = true if all required config is present and valid
  examInSession = !!(
    config.subject && config.year && config.courseCode && config.count && config.time
  );

  if (!examInSession) {
    document.getElementById('examCard').innerHTML = "<div class='text-gray-500 text-center py-14 text-lg'>No practice session is active.<br>Select your configuration on the left and click <b>Start Practice</b> to begin.</div>";
    document.getElementById('timer').textContent = "--:--:--";
    setFooterState();
    return;
  }
  exam.subject = config.subject;
  exam.year = config.year;
  exam.courseCode = config.courseCode;
  exam.title = `${config.subject} Practice`;
  exam.duration = (parseInt(config.time, 10) || 40) * 60;
  exam.topic = config.topic || "";
  timer = exam.duration;

  // Set form values (without triggering reload)
  document.getElementById("subject").value = config.subject;
  document.getElementById("subject").dispatchEvent(new Event("change"));
  document.getElementById("courseCode").value = config.courseCode;
  document.getElementById("year").value = config.year;
  document.getElementById("questions").value = config.count;
  document.getElementById("time").value = config.time;
  document.getElementById("topic").value = config.topic || "";

  // Update header info
  document.getElementById('examTitle').textContent = exam.title;
  document.getElementById('examMeta').textContent = `Subject: ${exam.subject} • Year: ${exam.year} • Code: ${exam.courseCode}`;
  document.getElementById("displayCourseCode").textContent = exam.courseCode;
}

function setFooterState() {
  const disabled = !examInSession || submitted;
  ["prevBtn", "nextBtn", "submitBtn", "saveNextBtn", "skipBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
  const grid = document.getElementById("questionNavGrid");
  if (grid && grid.querySelectorAll) {
    grid.querySelectorAll("button").forEach(btn => btn.disabled = disabled);
  }
  const timer = document.getElementById("timer");
  if (timer) timer.style.opacity = disabled ? "0.5" : "1";
}

async function fetchUser() {
  try {
    if (!token) throw new Error("No token");
    const resp = await fetch(USER_API, { headers: { "Authorization": "Bearer " + token } });
    if (!resp.ok) throw new Error("Failed to fetch user.");
    const data = await resp.json();
    user = {
      _id: data.user?._id,
      fullname: data.user?.fullname || data.user?.username || "Student",
      regNo: data.user?.studentId || "",
      profilePic: data.user?.profilePic || "https://i.pravatar.cc/56",
      class: data.user?.level || ""
    };
  } catch (err) {}
  document.getElementById('userAvatar').src = user.profilePic;
  document.getElementById('userFullname').textContent = user.fullname;
  document.getElementById('userMeta').textContent = `Class: ${user.class} | Reg. No: ${user.regNo}`;
}

async function fetchQuestions() {
  if (!examInSession) { setFooterState(); return; }
  try {
    const params = new URLSearchParams({
      subject: exam.subject,
      year: exam.year,
      courseCode: exam.courseCode,
      count: config.count,
      topic: exam.topic
    });
    const resp = await fetch(`${API_BASE}/past-questions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    questions = await resp.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      document.getElementById('examCard').innerHTML = "<div class='text-red-600 text-center py-10 text-lg font-bold'>No questions found for this course code and filter.</div>";
      examInSession = false;
      setFooterState();
      return;
    }
    answers = {};
    flags = {};
    currentQuestion = 0;
    renderQuestion();
    setFooterState();
  } catch (err) {
    document.getElementById('examCard').innerHTML = `<div class='text-red-600'>Failed to load questions: ${err.message}</div>`;
    examInSession = false;
    setFooterState();
  }
}

function updateTimer() {
  let h = String(Math.floor(timer / 3600)).padStart(2, '0');
  let m = String(Math.floor((timer % 3600) / 60)).padStart(2, '0');
  let s = String(timer % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${h}:${m}:${s}`;
  updateProgress();
}

function renderQuestion() {
  if (!questions.length) return;
  const q = questions[currentQuestion];
  document.getElementById("questionNumberTitle").textContent = `Q ${currentQuestion+1}/${questions.length}`;
  document.getElementById("statusBadge").textContent = answers[q._id] ? "Answered" : "Not Answered";
  document.getElementById("statusBadge").className = `px-2 py-0.5 text-xs rounded ${answers[q._id] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`;
  document.getElementById("displayCourseCode").textContent = exam.courseCode;
  const imgWrap = document.getElementById("questionImageContainer");
  const imgEl = document.getElementById("questionImage");
  if (q.image) {
    imgWrap.style.display = "block";
    imgEl.src = q.image.startsWith("/") ? q.image : `/uploads/questions/${q.image}`;
  } else {
    imgWrap.style.display = "none";
    imgEl.src = "";
  }
  document.getElementById("questionText").innerHTML = q.text || q.question || "";
  const form = document.getElementById("optionsForm");
  form.innerHTML = "";
  (q.options || q.choices || []).forEach((opt, idx) => {
    const label = document.createElement("label");
    label.className = "flex items-center p-3 rounded-xl border-2 border-gray-200 bg-blue-50/20 hover:border-blue-400 cursor-pointer gap-3 transition focus-ring";
    label.setAttribute("tabindex", "0");
    label.setAttribute("for", `option_${idx}`);
    label.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { selectOption(idx); e.preventDefault(); }};
    if (answers[q._id] === opt) label.classList.add("option-selected");
    const inp = document.createElement("input");
    inp.type = "radio";
    inp.name = "option";
    inp.id = `option_${idx}`;
    inp.value = opt;
    inp.disabled = false;
    inp.checked = answers[q._id] === opt;
    inp.className = "form-radio text-blue-600";
    inp.setAttribute("aria-checked", answers[q._id] === opt ? "true" : "false");
    inp.setAttribute("tabindex", "-1");
    inp.onclick = () => selectOption(idx);
    label.appendChild(inp);
    const spanLetter = document.createElement("span");
    spanLetter.className = "font-medium";
    spanLetter.innerHTML = String.fromCharCode(65 + idx) + ".";
    label.appendChild(spanLetter);
    const optText = document.createElement("span");
    optText.className = "mathjax";
    optText.innerHTML = opt;
    label.appendChild(optText);
    form.appendChild(label);
  });
  const flagBtn = document.getElementById("flagBtn");
  if (flags[q._id]) {
    flagBtn.classList.add("bg-yellow-300","border-yellow-500","text-yellow-900");
    flagBtn.setAttribute("aria-pressed", "true");
    flagBtn.innerHTML = '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v16M4 4h16l-2.5 5 2.5 5H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Flag';
  } else {
    flagBtn.classList.remove("bg-yellow-300","border-yellow-500","text-yellow-900");
    flagBtn.setAttribute("aria-pressed", "false");
    flagBtn.innerHTML = '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v16M4 4h16l-2.5 5 2.5 5H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Flag';
  }
  updateQuestionNavGrid();
  updateProgress();
  if (window.MathJax) MathJax.typesetPromise();
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(saveProgress, 7000);
  setFooterState();
}

function updateQuestionNavGrid() {
  const grid = document.getElementById("questionNavGrid");
  grid.innerHTML = "";
  questions.forEach((q, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "w-9 h-9 rounded-full border-2 text-sm font-bold focus-ring transition";
    btn.textContent = i + 1;
    btn.setAttribute("aria-label", `Go to question ${i + 1}`);
    btn.disabled = !examInSession || submitted;
    btn.onclick = () => goToQuestion(i);
    if (i === currentQuestion) {
      btn.classList.add("bg-blue-600","text-white","border-blue-400");
      btn.setAttribute("aria-current", "true");
    } else if (flags[q._id]) {
      btn.classList.add("bg-yellow-50","text-yellow-700","border-yellow-400");
    } else if (answers[q._id]) {
      btn.classList.add("bg-green-600","text-white","border-green-400");
    } else {
      btn.classList.add("bg-gray-100","text-gray-500","border-gray-300");
    }
    grid.appendChild(btn);
  });
}

function updateProgress() {
  let answeredCount = Object.keys(answers).filter(k=>answers[k]).length;
  document.getElementById('answeredCount').textContent = answeredCount;
  document.getElementById('totalQuestions').textContent = questions.length;
  document.getElementById('progressBar').style.width = `${100*answeredCount/questions.length}%`;
}

function selectOption(idx) {
  const q = questions[currentQuestion];
  let opts = q.options || q.choices || [];
  answers[q._id] = opts[idx];
  renderQuestion();
  saveProgress();
}

function flagQuestion() {
  const q = questions[currentQuestion];
  flags[q._id] = !flags[q._id];
  renderQuestion();
  saveProgress();
}

function prevQuestion() {
  if (!examInSession) return;
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (!examInSession) return;
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  }
}

function goToQuestion(idx) {
  if (!examInSession) return;
  currentQuestion = idx;
  renderQuestion();
}

function skipQuestion() {
  if (!examInSession) return;
  nextQuestion();
}

async function saveProgress() {
  if (!examInSession) return;
  document.getElementById('autoSave').textContent = "Saving...";
  try {
    const answersArray = questions.map(q => ({
      questionId: q._id,
      answer: answers[q._id] || null
    }));
    await fetch(ANSWER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId: user._id || "", // PATCH: Use ObjectId only!
        username: user.fullname,
        answers: answersArray,
        correctChoices: {},
        wrongChoices: {},
        totalCorrect: 0,
        totalWrong: 0,
        timeSpent: exam.duration - timer
      })
    });
    document.getElementById('autoSave').textContent = "Auto-saved";
  } catch (e) {
    document.getElementById('autoSave').textContent = "Save failed";
    showNotificationModal({ message: "Save failed!", type: "error" });
  }
}

async function saveAnswer() {
  if (!examInSession) return;
  await saveProgress();
  nextQuestion();
}

async function submitExam() {
  if (!examInSession || submitted) return;
  // Show ad modal first, then continue with confirmation and submission
  showAdModal(() => {
    // After ad finishes, show confirmation modal
    showConfirmModal(
      "Are you sure you want to submit your practice session? You won't be able to change your answers afterwards.",
      async function onConfirm() {
        showNotificationModal({ message: "Submitting your practice...", type: "info" });
        clearInterval(timerInterval);
        document.getElementById("submitBtn").disabled = true;
        try {
          const answersArray = questions.map(q => ({
            questionId: q._id,
            answer: answers[q._id] || null
          }));
          const payload = {
            userId: user._id || "", // PATCH: Use ObjectId only!
            username: user.fullname,
            answers: answersArray,
            questionIds: questions.map(q=>q._id),
            timeSpent: exam.duration - timer
          };
          const resp = await fetch(SUBMIT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
          });
          const result = await resp.json();
          localStorage.setItem("practiceResult", JSON.stringify(result));
          localStorage.setItem("practiceQuestions", JSON.stringify(questions));
          localStorage.setItem("practiceAnswers", JSON.stringify(answers));
          window.location.href = "practice-result.html";
        } catch (e) {
          showNotificationModal({ message: "Error submitting exam!", type: "error" });
          document.getElementById("examCard").innerHTML = "<div class='text-red-600 text-center py-16 text-xl'>Error submitting exam.</div>";
        }
      },
      function onCancel() {
        // Do nothing, just close the modal
      }
    );
  });
}

function showFeedback(result) {
  // Hide exam card, show feedback section
  document.getElementById("examCard").style.display = "none";
  const box = document.getElementById("feedbackBox");
  box.style.display = "";
  let percent = Math.round((result.score / (result.total || 1)) * 100);
  let badge = percent >= 70
    ? `<span class="feedback-badge feedback-success">Great job! 🎉</span>`
    : `<span class="feedback-badge feedback-fail">Keep Practicing!</span>`;
  let feedbackList = (result.feedback||[]).length
    ? `<div class="feedback-title">Review:</div><ul class="feedback-list list-disc">${result.feedback.map(f=>`<li>${f}</li>`).join('')}</ul>`
    : "";
  box.innerHTML = `
    <div class="feedback-outer">
      <div class="feedback-title">Session Completed</div>
      <div class="feedback-score">${result.score} / ${result.total}</div>
      <div class="font-semibold text-indigo-600 mb-2">Your Score</div>
      ${badge}
      ${feedbackList}
      <button onclick="window.location.reload()" class="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">Retake Practice</button>
    </div>
  `;
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (e.target.matches('input,textarea')) return;
  if (!examInSession) return;
  if (e.key === "p" || e.key === "P") prevQuestion();
  if (e.key === "x" || e.key === "X") nextQuestion();
  if (e.key === "n" || e.key === "N") saveAnswer();
  if (e.key === "k" || e.key === "K") skipQuestion();
});
// Sidebar toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

sidebarToggleBtn.addEventListener('click', function() {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});
// Hide sidebar when clicking overlay
sidebarOverlay.addEventListener('click', closeSidebar);

// Optional: Hide sidebar on resize to desktop
window.addEventListener('resize', function() {
  if (window.innerWidth >= 900) {
    closeSidebar();
  }
});
