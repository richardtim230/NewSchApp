// ======= GET USER FROM BACKEND =======
let token = localStorage.getItem("token") || "";
if (!token) {
  alert("You must be logged in! Please login to use live coding platform.");
  window.location = '/mock.html'; // Or your login page.
  throw new Error("Not logged in");
}
// Get full user info from /api/auth/me
let currentUser = { name: "", avatar: "", role: "" };
async function fetchUserDetails() {
  try {
    const resp = await fetch("https://examguard-jmvj.onrender.com/api/auth/me", {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await resp.json();
    if (data.user) {
      currentUser = {
        name: data.user.fullname || data.user.username || "Anonymous",
        avatar: data.user.profilePic || "",
        role: data.user.role || ""
      };
      // Fallback avatar if none
      if (!currentUser.avatar) {
        currentUser.avatar = "https://api.dicebear.com/6.x/bottts/svg?seed=" + Math.floor(Math.random() * 100000);
      }
      localStorage.setItem("livecoding-username", currentUser.name);
      localStorage.setItem("livecoding-avatar", currentUser.avatar);
    }
  } catch (e) {
    alert("Authentication problem, please log in again.");
    window.location = '/mock.html';
  }
}
await fetchUserDetails();

// ======= SOCKET.IO COLLAB =======
const socketEndpoint = "https://examguard-jmvj.onrender.com/liveclass";
const socket = io(socketEndpoint, { transports: ['websocket'], query: { token } });

// Live state
let usersOnline = [];
let chatMessages = [];
let codeState = { html: "", css: "", js: "" };

// Join with real user info after fetch
socket.emit("user:join", { name: currentUser.name, avatar: currentUser.avatar, role: currentUser.role });

// Presence
socket.on("user:presence", users => {
  usersOnline = users;
  renderUserList();
});

// Live coding sync
socket.on("code:update", code => {
  codeState = code;
  if (!skipNextCodeUpdate) {
    loadCode(code.html, code.css, code.js, true);
  }
  skipNextCodeUpdate = false;
});

// Live chat
socket.on("chat:message", msg => {
  chatMessages.push(msg);
  renderChat();
});

// ====== UI & Editor Logic ======
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
    document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
  }
});

const htmlEditor = document.getElementById('htmlEditor');
const cssEditor = document.getElementById('cssEditor');
const jsEditor = document.getElementById('jsEditor');

let skipNextCodeUpdate = false;
function loadCode(html, css, js, updatePreview = true) {
  skipNextCodeUpdate = true; // Don't rebroadcast this change as a code update
  htmlEditor.value = html ?? "";
  cssEditor.value = css ?? "";
  jsEditor.value = js ?? "";
  if (updatePreview) updateOutput();
}
function getCode() {
  return { html: htmlEditor.value, css: cssEditor.value, js: jsEditor.value };
}

htmlEditor.oninput = cssEditor.oninput = jsEditor.oninput = () => {
  socket.emit("code:update", getCode());
  updateOutput();
};
document.getElementById('runBtn').onclick = () => { updateOutput(); showOutputStatus("Output updated!"); };

const resultFrame = document.getElementById('resultFrame');
function updateOutput() {
  const code = getCode();
  const doc = `
    <!DOCTYPE html>
    <html lang="en"><head>
      <meta charset="UTF-8">
      <title>Live Output</title>
      <style>${code.css}</style>
    </head>
    <body>
    ${code.html}
    <script>${code.js}<\/script>
    </body></html>
  `;
  resultFrame.srcdoc = doc;
  if (document.getElementById('fullscreenOutput').style.display == "flex") {
    document.getElementById('fullResultFrame').srcdoc = doc;
  }
}
function showOutputStatus(msg) {
  const el = document.getElementById('outputStatus');
  el.textContent = msg;
  setTimeout(() => { el.textContent = "Latest preview below" }, 2200);
}

// Fullscreen output modal
document.getElementById('fullscreenBtn').onclick = () => {
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('fullscreenOutput').style.display = "flex";
  document.getElementById('fullResultFrame').srcdoc = resultFrame.srcdoc;
};
document.getElementById('closeFullBtn').onclick = () => {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.getElementById('fullscreenOutput').style.display = "none";
};
document.getElementById('modalBackdrop').onclick = (e) => {
  if (e.target === document.getElementById('modalBackdrop')) {
    document.getElementById('modalBackdrop').classList.remove('show');
    document.getElementById('fullscreenOutput').style.display = "none";
  }
};

// Render live users
function renderUserList() {
  const ul = document.getElementById('userList');
  ul.innerHTML = '';
  usersOnline.forEach(u => {
    const li = document.createElement("li");
    li.className = "user-item" + (u.name == currentUser.name ? " self" : "");
    li.innerHTML = `<img class="avatar" src="${u.avatar}" alt="avatar"/> <b>${u.name}</b> <span class="user-live"></span>`;
    ul.appendChild(li);
  });
}

// Render chat messages live
function renderChat() {
  const box = document.getElementById('chatBox');
  box.innerHTML = '';
  chatMessages.forEach(c => {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<span class="chat-sender">${c.sender}</span> ${c.text}`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

document.getElementById('chatForm').onsubmit = (e) => {
  e.preventDefault();
  const chatInput = document.getElementById('chatInput');
  if (chatInput.value.trim()) {
    socket.emit("chat:message", {
      sender: currentUser.name,
      text: chatInput.value.trim(),
      avatar: currentUser.avatar
    });
    chatInput.value = "";
  }
};

// Initial code load
socket.emit("code:update", getCode());

// Starter code for first use
loadCode(
  `<h2 style="color:#2861e0;font-family:sans-serif;">Welcome to Live Coding!</h2>
<p style="color:#333;font-size:1.15em;">Collaborate, learn, and code live together.<br/>HTML, CSS, JS editors — try updating below!</p>
<div style="padding:1em;background:#e8f7fc;border-radius:13px;">
  <ul style="margin-left:2em;"><li>Type in the editors.</li><li>Click <b>Run &amp; Update Output</b> to preview below.</li><li>Open multiple browsers for multi-user effect.</li></ul>
</div>`,
  `body { font-family: 'Inter', Arial, sans-serif; background:#e8f7fc; } h2 { font-size:2em; margin-top:.2em; font-weight:900; color: #2861e0; } p { color: #333955; font-size:1.14em; margin-bottom:1em;} li { font-size:1em; margin-bottom:.6em;}`,
  `console.log("👩‍💻 Live Coding Platform — Edit HTML, CSS & JS");`
);
