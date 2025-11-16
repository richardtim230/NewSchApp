<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Live Coding Platform</title>
  <link rel="icon" href="https://cdn.jsdelivr.net/npm/@mdi/svg/svg/code-tags.svg" type="image/svg+xml">
  <style>
    :root {
      --primary: #2861e0;
      --accent: #0b1a34;
      --background: #181c27;
      --surface: #222533;
      --highlight: #2ca296;
      --error: #ff5252;
      --text: #ebeef7;
      --text-light: #bfc7df;
      --editor-bg: #202539;
      --card-bg: #232741;
      --tab-bg: #181c27;
      --radius: 16px;
      --shadow: 0 2px 16px #0f1121c8;
      --secondary: #293072;
      --green: #22bf64;
      --yellow: #ffc74d;
      --blue: #22b0d6;
    }
    body {
      background: var(--background);
      color: var(--text);
      margin: 0;
      font-family: 'Inter', 'Roboto', Arial, sans-serif;
      min-height: 100vh;
    }
    .container {
      display: grid;
      grid-template-columns: minmax(230px, 320px) 1fr;
      min-height: 100vh;
      max-width: 1920px;
      margin: 0 auto;
      background: var(--background);
    }
    .sidebar {
      background: var(--surface);
      padding: 2rem 1.2rem 2rem 1.2rem;
      border-right: 1px solid #272b3d;
      display: flex;
      flex-direction: column;
      gap: 1.6rem;
      min-width: 220px;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 0.73rem;
    }
    .logo-circle {
      width: 46px; height: 46px; background: var(--primary);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px var(--primary);
    }
    .logo-circle img {
      width: 28px;
      filter: invert(1);
    }
    .title {
      font-size: 1.55rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      color: var(--text);
      text-shadow: 0 1px 8px #2861e055;
    }
    .user-list-section {
      margin-bottom: .4rem;
    }
    .section-label {
      font-weight: 700;
      font-size: 1.02rem;
      color: var(--highlight);
      margin-bottom: .3rem;
      margin-top: 1rem;
      letter-spacing: 0.05em;
    }
    .user-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: .8em;
    }
    .user-item {
      display: flex; align-items: center; gap: 0.6em;
      font-size: 1.02em; position: relative;
      padding: 0.15em 0.2em;
      border-radius: 7px;
      background: #22253b23;
    }
    .avatar {
      width: 28px; height: 28px;
      border-radius: 50%; background: #2ca29644; object-fit: cover;
      box-shadow: 0 2px 6px #146c676f;
      border: 1.3px solid #222;
    }
    .user-live {
      width: 8px; height: 8px;
      border-radius: 50%; background: var(--green); margin-left: 6px;
      box-shadow: 0 0 0 2px #222, 0 1px 3px var(--green);
      display:inline-block;
    }
    .user-item.self {
      background: #2ca29630;
      box-shadow: 0 2px 14px var(--primary);
    }
    .chat-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-bottom: 1.2rem;
    }
    .chat-box {
      flex: 1;
      background: #21263a;
      border-radius: 11px;
      padding: 0.8rem 0.6rem;
      font-size: 1.02em;
      min-height: 80px;
      max-height: 220px;
      overflow-y: auto;
      box-shadow: 0 2px 9px #2ca29618;
    }
    .chat-msg {
      margin-bottom: .55em;
      line-height: 1.32em;
      word-break: break-word;
    }
    .chat-sender {
      color: var(--highlight); font-weight: 700;
      margin-right: .35em;
    }
    .chat-form {
      display: flex; align-items: center; gap: 0.2em;
      margin-top: .45em;
    }
    .chat-form input {
      flex: 1;
      background: #1a1f2e;
      border: none;
      padding: .63em .83em;
      border-radius: 7px;
      font-size: 1em;
      color: var(--text); outline: none;
      box-shadow: 0 1px 5px #2861e011;
      margin-top: 0px;
    }
    .chat-form button {
      background: var(--primary); color: #fff;
      border: none; border-radius: 7px;
      padding: .53em 1em;
      margin-left: .13em;
      font-size: 1em; font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px var(--primary);
      transition: background .18s;
    }
    .chat-form button:hover {
      background: var(--highlight);
    }
    .main {
      background: var(--background);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      position: relative;
      overflow: hidden;
    }
    .tabs {
      display: flex; gap: .3em;
      margin: 1.2em 0 .7em 0;
    }
    .tab-btn {
      background: var(--tab-bg);
      color: var(--text-light);
      border: none;
      padding: .7em 1.7em;
      border-radius: var(--radius) var(--radius) 0 0;
      cursor: pointer;
      font-size: 1.1em;
      font-weight: 800;
      letter-spacing: .06em;
      transition: background .16s, color .16s;
      box-shadow: 0 4px 12px #2861e009;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
    }
    .tab-btn.active {
      background: var(--surface);
      color: var(--highlight);
      border-bottom: 3px solid var(--primary);
      box-shadow: 0 2px 16px #2861e025;
    }
    .editors-area {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .8em;
      padding: 0 1.3rem 1.2rem 1.5rem;
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      margin-bottom: 1.8em;
    }
    .editor-block {
      display: flex;
      flex-direction: column;
      background: var(--editor-bg);
      border-radius: 12px;
      box-shadow: 0 1.5px 7px #2861e030;
      padding: 0.7em 0.6em 0.44em 0.6em;
      min-width: 0;
      min-height: 180px;
    }
    .editor-label {
      font-weight: 700;
      color: #ffd74d;
      margin-bottom: .5em;
      font-size: 1.05em;
      letter-spacing: .05em;
      text-shadow: 0 1px 10px var(--primary);
      display: flex; align-items: center; gap: .7em;
    }
    .editor-label .lang {
      background: #232c54;
      padding: .16em .5em;
      border-radius: 6px;
      font-size: .88em;
      color: var(--text-light);
      font-weight: 700;
    }
    .editor {
      flex: 1;
      background: var(--editor-bg);
      font-family: 'Fira Mono', 'Menlo', 'Consolas', monospace;
      font-size: 1.01em;
      color: var(--text-light);
      border: none;
      outline: none;
      padding: .57em .61em;
      border-radius: 8px;
      resize: vertical;
      min-height: 120px;
      transition: box-shadow .13s;
      box-shadow: 0 1px 7px #2861e018;
    }
    .editor:focus {
      box-shadow: 0 2px 14px var(--primary);
      background: #242847;
      color: #fff;
    }
    .output-preview {
      border-radius: var(--radius);
      background: var(--main-bg, #fff);
      box-shadow: 0 2px 22px #2861e048;
      min-height: 180px;
      max-height: 410px;
      margin: 0 1.3rem 2.6em 1.5rem;
      padding: 0;
      overflow: auto;
      border: 0.2em solid var(--primary);
      z-index: 1;
    }
    .output-toolbar {
      display: flex; align-items: center; gap:.8em;
      background: var(--surface);
      border-radius: 0 0 10px 10px;
      padding: .5em 1em;
      margin-top: -7px;
      margin-bottom: 0;
      border-top: 1.3px solid #222;
    }
    .output-toolbar .run-btn {
      background: var(--highlight);
      color: #fff;
      font-weight: 700;
      border: none;
      border-radius: 7px;
      padding: .6em 1.3em;
      font-size: 1.01em;
      cursor: pointer;
      box-shadow: 0 2px 12px #2ca29677;
      transition: background .15s;
    }
    .output-toolbar .run-btn:hover,
    .output-toolbar .run-btn:focus {
      background: var(--primary);
    }
    .output-toolbar .status {
      font-size: .94em; color: var(--text-light); margin-left: 0.8em;
    }
    .output-toolbar .full-btn {
      background: var(--primary);
      color: #fff; border: none;
      border-radius: 6px;
      font-size: 1em; padding: .35em 1.1em;
      cursor: pointer;
      margin-left: .7em;
      font-weight: 700;
      box-shadow: 0 1px 7px #2861e018;
    }
    /* Modal styles */
    .modal-backdrop {
      display: none; position: fixed; top:0; left:0; right:0; bottom:0;
      width:100vw; height:100vh; z-index: 11111;
      background: #181c2790;
      align-items: center; justify-content: center;
    }
    .modal-backdrop.show { display: flex; }
    .custom-modal {
      background: var(--card-bg);
      border-radius: 20px;
      max-width: 650px;
      min-width: 250px;
      padding: 2.2rem 1.5rem 1.1rem 1.7rem;
      text-align: left;
      box-shadow: 0 8px 40px #2861e055, 0 1.5px 4px var(--primary);
      animation: modalIn .45s;
      color: #fff;
      position: relative;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95);}
      to { opacity: 1; transform: scale(1);}
    }
    .custom-modal .modal-title {
      font-size: 1.17rem;
      font-weight: 800;
      color: var(--highlight);
      margin-bottom: .43em;
      letter-spacing: .04em;
    }
    .custom-modal .modal-message {
      font-size: 1.01rem;
      margin-bottom: 1.2em;
      color: var(--text);
    }
    .custom-modal .modal-actions {
      margin-top: 1.3em;
      display: flex; gap: .9em; justify-content: flex-end;
    }
    .custom-modal .modal-btn {
      background: var(--primary);
      color: #fff; border: none; border-radius: 10px;
      font-size: 1.09em; font-weight: 700;
      padding: .7em 1.5em;
      cursor: pointer;
      transition: background .2s;
      min-width: 110px;
      box-shadow: 0 2px 10px var(--primary);
    }
    .custom-modal .close-modal {
      position: absolute; top: 14px; right: 14px;
      background: transparent;
      border: none;
      font-size: 1.6em; color: #bff; cursor: pointer;
      opacity: 0.85;
    }
    .custom-modal .close-modal:hover {
      opacity: 1;
      color: #fff;
    }
    .fullscreen-output {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #191b24f0;
      z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      padding: 2vw 0vw;
      animation: modalIn .34s;
    }
    .fullscreen-output .output-preview {
      max-width: 90vw; max-height: 87vh; min-width: 300px;
      min-height: 300px; margin: 0;
      box-shadow: 0 4px 42px var(--highlight), 0 2px 13px var(--primary);
      border: 3.5px solid var(--highlight);
      background: #fff;
    }
    /* Custom scroll for sidebar and output/code */
    ::-webkit-scrollbar {
      width: 8px; height: 7px; background: #272b3d; border-radius: 8px;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--primary); border-radius: 8px;
    }
    .editor::-webkit-scrollbar, .chat-box::-webkit-scrollbar {
      background: #232c54;
      width: 7px; height: 7px; border-radius: 8px;
    }
    .editor::-webkit-scrollbar-thumb, .chat-box::-webkit-scrollbar-thumb {
      background: #2ca29677;
      border-radius: 8px;
    }
    /* Responsive */
    @media (max-width: 1100px){
      .editors-area, .output-preview {
        padding: 0 .2rem 1rem .2rem;
      }
      .container {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position:sticky;
        top:0; left:0; right:0;
        min-width:unset;
        z-index: 99;
        flex-direction: row;
        gap:2vw;
      }
      .main {
        min-height:unset;
      }
    }
    @media (max-width:900px){
      .editors-area {
        grid-template-columns: 1fr;
      }
      .editor-block { margin-bottom: .6em;}
    }
    @media (max-width:600px){
      .sidebar { flex-direction:column; padding:.7rem .6rem;}
      .editors-area, .output-preview {
        margin-right:0;
        padding:0 .33rem 1rem .33rem;
      }
      .output-preview { max-height: 230px;}
      .tabs { font-size:.9em;}
    }
    @media (max-width:500px){
      .sidebar { padding:.3rem .1rem;}
      .logo-area { gap:.4em;}
      .title { font-size:1.08rem;}
      .editor-label { font-size:.94em;}
      .editor { font-size:.99em;}
      .output-toolbar .run-btn, .output-toolbar .full-btn { font-size:.98em; padding:.42em .73em;}
      .custom-modal { padding: .9rem .33rem .4rem .6rem; }
      .modal-title, .modal-message, .modal-actions .modal-btn { font-size:.97em; }
    }
  </style>
</head>
<body>
<div class="container">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="logo-area">
      <div class="logo-circle">
        <img src="https://cdn.jsdelivr.net/npm/@mdi/svg/svg/code-tags.svg" alt="Logo">
      </div>
      <span class="title">Live Coding Platform</span>
    </div>
    <div class="user-list-section">
      <div class="section-label">Live Users</div>
      <ul class="user-list" id="userList"></ul>
    </div>
    <div class="chat-section">
      <div class="section-label">Chat</div>
      <div class="chat-box" id="chatBox"></div>
      <form class="chat-form" id="chatForm" autocomplete="off">
        <input type="text" id="chatInput" placeholder="Type a message..." maxlength="180">
        <button type="submit">Send</button>
      </form>
    </div>
  </aside>
  <!-- MAIN AREA -->
  <main class="main">
    <div class="tabs">
      <button class="tab-btn active" data-tab="edit">Live Code</button>
      <button class="tab-btn" data-tab="about">About</button>
    </div>
    <!-- Tabs -->
    <div id="tab-edit" class="tab-content active">
      <div class="editors-area">
        <!-- HTML Editor -->
        <div class="editor-block">
          <div class="editor-label">HTML <span class="lang">html</span></div>
          <textarea class="editor" id="htmlEditor" spellcheck="false" autocomplete="off" placeholder="Type HTML here..."></textarea>
        </div>
        <!-- CSS Editor -->
        <div class="editor-block">
          <div class="editor-label">CSS <span class="lang">css</span></div>
          <textarea class="editor" id="cssEditor" spellcheck="false" autocomplete="off" placeholder="Type CSS here..."></textarea>
        </div>
        <!-- JS Editor -->
        <div class="editor-block">
          <div class="editor-label">JavaScript <span class="lang">js</span></div>
          <textarea class="editor" id="jsEditor" spellcheck="false" autocomplete="off" placeholder="Type JavaScript here..."></textarea>
        </div>
      </div>
      <div class="output-toolbar">
        <button class="run-btn" id="runBtn">Run & Update Output</button>
        <span class="status" id="outputStatus">Latest preview below</span>
        <button class="full-btn" id="fullscreenBtn" title="Full screen Output">Full Output</button>
      </div>
      <div class="output-preview" id="outputPreview">
        <iframe id="resultFrame" title="Live Output" sandbox="allow-scripts allow-same-origin" style="width:100%;height:100%;border:none;border-radius:10px;min-height:140px;max-height:400px;background: #fff;"></iframe>
      </div>
    </div>
    <div id="tab-about" class="tab-content" style="display:none;max-width:800px;margin:1rem auto 0 auto;padding:2rem 1rem 2.5rem 1rem;background:var(--card-bg);border-radius:var(--radius);box-shadow:0 4px 34px #2861e030;">
      <h2 style="color:var(--highlight);margin-bottom:.6em;font-size:1.19em;">About This Platform</h2>
      <p style="color:var(--text-light);font-size:1.05em;line-height:1.68em;">
        <b>Live Coding Platform</b> allows educators, students, or coding teams to conduct practical coding sessions live with multiple viewers. 
        As one user codes, all participants see changes instantly! It features a collaborative code editor (HTML, CSS, JS), live preview output, user listing, and integrated chat. 
        The UI is professionally themed, fully responsive, and suitable for showcases, lectures, peer coding, workshops, and interviews.
      </p>
      <ul style="color:var(--highlight);padding-left:1.1em;">
        <li>Live code sharing and team sync</li>
        <li>HTML, CSS, JS side-by-side editing</li>
        <li>Mobile and desktop friendly</li>
        <li>Live chat for discussions</li>
        <li>Instant preview and full-output mode</li>
        <li>Beautiful dark UI</li>
        <li>User avatars and live status</li>
      </ul>
      <p style="margin-top:.98em;color:var(--text-light)">
        <b>Note:</b> Real-time multi-user code sync requires a backend websocket server. 
        Plug a service such as <code>Socket.IO</code> or <code>ws</code> for full collab (stub code provided). 
      </p>
    </div>
  </main>
</div>
<!-- MODAL output fullscreen -->
<div class="modal-backdrop" id="modalBackdrop">
  <div class="fullscreen-output" style="display:none;" id="fullscreenOutput">
    <div class="output-preview"><iframe id="fullResultFrame" sandbox="allow-scripts allow-same-origin" style="width:100%;height:100%;border:none;border-radius:10px;min-height:140px;max-height:87vh;background: #fff;"></iframe></div>
    <button class="custom-modal close-modal" style="top:18px;right:16px;position:absolute;font-size:2em;background:transparent;border:none;opacity:.84;" id="closeFullBtn" title="Close">&times;</button>
  </div>
</div>
<script>
/**
 * === LIVE CODING PLATFORM CLIENT LOGIC ===
 * All in one file!
 */

/* ========== USER / PRESENCE ========== */
// Random name/ avatar generator for demo purposes
function randomName() {
  const names = ["Ada", "Chris", "Zara", "Mummsi", "Tim", "Nia", "Jake", "Sage", "Ray", "Ruby", "Emir", "Deen", "Yemi", "Noah"];
  return names[Math.floor(Math.random()*names.length)] + Math.floor(100+Math.random()*900);
}
function avatarUrl(seed){
  return "https://api.dicebear.com/6.x/bottts/svg?seed="+seed;
}
const selfUser = {
  name: localStorage.getItem("livecoding-username") || randomName(),
  avatar: localStorage.getItem("livecoding-avatar") || avatarUrl(Math.floor(Math.random()*10000)),
};
localStorage.setItem("livecoding-username", selfUser.name);
localStorage.setItem("livecoding-avatar", selfUser.avatar);

/* ========== SOCKET COLLAB (Stub - requires backend at 'wss://...' to work!) ========== */
const socketUrl = "wss://www.exmaguard-jmvj.onrender.com"; // <-- Replace with real backend!
let ws;
let usersOnline = [selfUser];
let chatMessages = [];
let isOwner = true; // If true, only you can edit (for demo); but in collab all can.

function connectSocket(){
  ws = new WebSocket(socketUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({type:"join", user:selfUser}));
  }
  ws.onmessage = (event)=>{
    const msg = JSON.parse(event.data);
    if(msg.type=="presence"){
      usersOnline = msg.users;
      renderUserList();
    }
    if(msg.type=="code"){
      if(msg.exclude!==selfUser.name){
        loadCode(msg.code.html, msg.code.css, msg.code.js, false);
      }
    }
    if(msg.type=="chat"){
      chatMessages.push(msg);
      renderChat();
    }
  }
  ws.onclose = ()=>{
    setTimeout(connectSocket, 2000); // Reconnect
  }
}
function emit(type, data){
  if(ws && ws.readyState==1){
    ws.send(JSON.stringify({type, ...data}));
  }
}

/* ========== UI LOGIC ========== */
// Tabs
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc=>tc.style.display='none');
    document.getElementById('tab-'+btn.dataset.tab).style.display = 'block';
  }
});

// Editors
const htmlEditor = document.getElementById('htmlEditor');
const cssEditor = document.getElementById('cssEditor');
const jsEditor = document.getElementById('jsEditor');

function loadCode(html, css, js, updatePreview=true){
  htmlEditor.value = html;
  cssEditor.value = css;
  jsEditor.value = js;
  if(updatePreview) updateOutput();
}
function getCode(){
  return {
    html: htmlEditor.value,
    css: cssEditor.value,
    js: jsEditor.value,
  };
}
// Editor change broadcast
function onEditorChange(){
  if(isOwner){
    emit("code",{code:getCode(), exclude:selfUser.name});
  }
  updateOutput();
}
htmlEditor.oninput = cssEditor.oninput = jsEditor.oninput = ()=>{onEditorChange();};
document.getElementById('runBtn').onclick = ()=>{updateOutput(); showOutputStatus("Output updated!");};

// Output
const outputPreview = document.getElementById('outputPreview');
const resultFrame = document.getElementById('resultFrame');
function updateOutput(){
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
  // Fullscreen output sync
  if(document.getElementById('fullscreenOutput').style.display=="flex"){
    document.getElementById('fullResultFrame').srcdoc = doc;
  }
}
function showOutputStatus(msg){
  const el = document.getElementById('outputStatus');
  el.textContent = msg;
  setTimeout(()=>{el.textContent="Latest preview below"},2200);
}

// Fullscreen output modal
document.getElementById('fullscreenBtn').onclick = ()=>{
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('fullscreenOutput').style.display="flex";
  document.getElementById('fullResultFrame').srcdoc = resultFrame.srcdoc;
};
document.getElementById('closeFullBtn').onclick = ()=>{
  document.getElementById('modalBackdrop').classList.remove('show');
  document.getElementById('fullscreenOutput').style.display="none";
};
document.getElementById('modalBackdrop').onclick = (e)=>{
  if(e.target===document.getElementById('modalBackdrop')){
    document.getElementById('modalBackdrop').classList.remove('show');
    document.getElementById('fullscreenOutput').style.display="none";
  }
};

/* ========== USER LIST LOGIC ========== */
function renderUserList(){
  const ul = document.getElementById('userList');
  ul.innerHTML = '';
  usersOnline.forEach(u=>{
    const li = document.createElement("li");
    li.className = "user-item"+(u.name==selfUser.name?" self":"");
    li.innerHTML = `<img class="avatar" src="${u.avatar}" alt="avatar"/> <b>${u.name}</b> <span class="user-live"></span>`;
    ul.appendChild(li);
  });
}
renderUserList();

/* ========== CHAT LOGIC ========== */
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
// Chat send
document.getElementById('chatForm').onsubmit = (e)=>{
  e.preventDefault();
  const chatInput = document.getElementById('chatInput');
  if(chatInput.value.trim()){
    // If socket connected, send
    emit("chat",{sender:selfUser.name, text:chatInput.value.trim()});
    chatMessages.push({sender:selfUser.name, text:chatInput.value.trim()});
    renderChat();
    chatInput.value="";
  }
};

/* ========== INITIAL DEMO CODE ========== */
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

/* ========== AUTO SOCKET INIT FOR COLLAB (Stub only!) ========== */
// Comment below until backend is ready:
 connectSocket();

</script>
</body>
</html>
