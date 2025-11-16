// SOCKET.IO + persistent live backend platform logic

// ======= USER PROFILE/AUTH =======
function randomName() {
  const names = ["Ada", "Chris", "Zara", "Mummsi", "Tim", "Nia", "Jake", "Sage", "Ray", "Ruby", "Emir", "Deen", "Yemi", "Noah"];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(100 + Math.random() * 900);
}
function avatarUrl(seed) { return "https://api.dicebear.com/6.x/bottts/svg?seed=" + seed; }
let token = localStorage.getItem("token") || "";
if (!token) {
    alert("You must be logged in! Please login to use live coding platform.");
    window.location = '/mock.html'; // Or your login page.
    throw new Error("Not logged in");
}
const username = localStorage.getItem("livecoding-username") || randomName();
const avatar = localStorage.getItem("livecoding-avatar") || avatarUrl(Math.floor(Math.random() * 10000));
localStorage.setItem("livecoding-username", username);
localStorage.setItem("livecoding-avatar", avatar);

// ======= SOCKET.IO COLLAB =======
const socketEndpoint = "https://examguard-jmvj.onrender.com/liveclass";
const socket = io(socketEndpoint, { transports: ['websocket'], query: { token } });

let usersOnline = [];
let chatMessages = [];
let codeState = { html: "", css: "", js: "" };

socket.emit("user:join", { name: username, avatar });
socket.on("user:presence", users => {
  usersOnline = users;
  renderUserList();
});
socket.on("code:update", code => {
  codeState = code;
  loadCode(code.html, code.css, code.js, false);
});
socket.on("chat:message", msg => {
  chatMessages.push(msg);
  renderChat();
});
socket.on("file:uploaded", file => {
  // File UI here if needed
});

function emitCodeUpdate() { socket.emit("code:update", getCode()); }
function emitChat(text) { socket.emit("chat:message", { sender: username, text: text, avatar }); }

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
function loadCode(html, css, js, updatePreview=true) {
  htmlEditor.value = html ?? "";
  cssEditor.value = css ?? "";
  jsEditor.value = js ?? "";
  if(updatePreview) updateOutput();
}
function getCode() {
  return { html: htmlEditor.value, css: cssEditor.value, js: jsEditor.value };
}
htmlEditor.oninput = cssEditor.oninput = jsEditor.oninput = () => { emitCodeUpdate(); updateOutput(); };
document.getElementById('runBtn').onclick = () => { updateOutput(); showOutputStatus("Output updated!"); };

const outputPreview = document.getElementById('outputPreview');
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
  if(document.getElementById('fullscreenOutput').style.display=="flex"){
    document.getElementById('fullResultFrame').srcdoc = doc;
  }
}
function showOutputStatus(msg) {
  const el = document.getElementById('outputStatus');
  el.textContent = msg;
  setTimeout(()=>{el.textContent="Latest preview below"},2200);
}
document.getElementById('fullscreenBtn').onclick = () => {
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('fullscreenOutput').style.display="flex";
  document.getElementById('fullResultFrame').srcdoc = resultFrame.srcdoc;
};
document.getElementById('closeFullBtn').onclick = () => {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.getElementById('fullscreenOutput').style.display="none";
};
document.getElementById('modalBackdrop').onclick = (e) => {
  if(e.target===document.getElementById('modalBackdrop')){
    document.getElementById('modalBackdrop').classList.remove('show');
    document.getElementById('fullscreenOutput').style.display="none";
  }
};

function renderUserList(){
  const ul = document.getElementById('userList');
  ul.innerHTML = '';
  usersOnline.forEach(u=>{
    const li = document.createElement("li");
    li.className = "user-item"+(u.name==username?" self":"");
    li.innerHTML = `<img class="avatar" src="${u.avatar}" alt="avatar"/> <b>${u.name}</b> <span class="user-live"></span>`;
    ul.appendChild(li);
  });
}
function renderChat(){
  const box = document.getElementById('chatBox');
  box.innerHTML = '';
  chatMessages.forEach(c=>{
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<span class="chat-sender">${c.sender}</span> ${c.text}`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}
document.getElementById('chatForm').onsubmit = (e)=>{
  e.preventDefault();
  const chatInput = document.getElementById('chatInput');
  if(chatInput.value.trim()){
    emitChat(chatInput.value.trim());
    chatInput.value="";
  }
};

socket.on("code:update", code => { loadCode(code.html, code.css, code.js, true); });
socket.emit("code:update", getCode());

// ====== FILE UPLOAD (bonus feature) ======
async function uploadFile(file) {
  const url = "https://examguard-jmvj.onrender.com/api/liveclass/files/upload";
  const fd = new FormData();
  fd.append("file", file);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token },
    body: fd
  });
  return resp.json();
}

// ====== DEMO STARTER ======
loadCode(
`<h2 style="color:#2861e0;font-family:sans-serif;">Welcome to Live Coding!</h2>
<p style="color:#333;font-size:1.15em;">Collaborate, learn, and code live together.<br/>HTML, CSS, JS editors — try updating below!</p>
<div style="padding:1em;background:#e8f7fc;border-radius:13px;">
  <ul style="margin-left:2em;">
    <li>Type in the editors.</li>
    <li>Click <b>Run &amp; Update Output</b> to preview below.</li>
    <li>Open multiple browsers for multi-user effect.</li>
  </ul>
</div>
`,
`body { font-family: 'Inter', Arial, sans-serif; background:#e8f7fc; }
h2 { font-size:2em; margin-top:.2em; font-weight:900; color: #2861e0; }
p { color: #333955; font-size:1.14em; margin-bottom:1em;}
li { font-size:1em; margin-bottom:.6em;}
`,
`console.log("👩‍💻 Live Coding Platform — Edit HTML, CSS & JS");`
);
