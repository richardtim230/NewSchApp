// Academic Tutor Chat JS (fully updated for requested features)
const PROFESSOR_AVATAR = "https://avatars.githubusercontent.com/u/645549?v=4";
const EMOJIS = ["😀","😁","😂","🤓","🤩","😉","😊","😍","🙌","💯","👍","👏","🙏","🎉","📝","📚","🤔","⚡","💡","🔥","😱","🥳","😇","🎓","😢","😭","🥺","👩‍🏫","🧑‍🔬","🔬"];
let messages = [];
let topics = []; // User's dynamic topics: [{id, name, icon, createdAt}]
let currentTopicId = null;
let user = null;
let sending = false, currentAttachment = null, loadingHistory = false;
let offset = 0, limit = 14, hasMore = true;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const chatContainer = document.getElementById('chatContainer');
const userInfoBar = document.getElementById('userInfoBar');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatFormDOM = document.getElementById('chatForm');
const attachBtn = document.getElementById('attachBtn');
const attachInput = document.getElementById('attachInput');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const typingIndicator = document.getElementById('typingIndicator');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const newConvBtn = document.getElementById('newConvBtn');
const topicsBar = document.getElementById('topicsBar');
const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');

// Utility Functions
function getTime(dateObj){if(!dateObj)dateObj=new Date();return dateObj.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
function setCookie(name,val){document.cookie=name+'='+val+';path=/';}
function getCookie(name){let v=(';'+document.cookie).split('; '+name+'=');return v.length===2?v.pop().split(';').shift():"";}
function showLogin(){loginScreen.style.display='flex';chatContainer.style.display='none';}
function showChat(){loginScreen.style.display='none';chatContainer.style.display='flex';}

// Session and Login
async function checkSession() {
  let token=getCookie('jwt_token')||localStorage.getItem('jwt_token');
  if(token){
    try{
      let res=await fetch('https://examguard-jmvj.onrender.com/api/auth/me',{headers:{'Authorization':'Bearer '+token}});
      let data=await res.json();
      if(data&&data.user){
        user=data.user;showChat();
        postLoginSetup();
        await loadTopics();
        await loadHistory();
        return true;
      }
    }catch(e){}
  }
  showLogin();return false;
}
loginForm.onsubmit=async function(e){
  e.preventDefault();
  let username=loginUsername.value.trim(),password=loginPassword.value;
  loginError.textContent="";
  try{
    let res=await fetch('https://examguard-jmvj.onrender.com/api/auth/login',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})
    });
    let data=await res.json();
    if(data.token){
      setCookie('jwt_token',data.token);localStorage.setItem('jwt_token',data.token);user={username};
      showChat();postLoginSetup();await loadTopics();await loadHistory();
    }else{loginError.textContent=data.message||"Login error";}
  }catch(e){loginError.textContent="Network error. Please try later.";}
}
function postLoginSetup(){
  userInfoBar.innerHTML=`<img src="${user.profilePic||PROFESSOR_AVATAR}" style="width:27px;height:27px;" class="profile-avatar" alt="Profile" title="${user.fullname||user.username||""}"> <span>${user.fullname||user.username||""}</span>`;
}

// Topics Section
async function loadTopics() {
  // Fetch topics via API, fallback to sample if new
  try {
    let token=getCookie('jwt_token')||localStorage.getItem('jwt_token');
    let res=await fetch('https://examguard-jmvj.onrender.com/api/ai-chat/topics',{headers:{'Authorization':'Bearer '+token}});
    let data=await res.json();
    topics = (data.topics && data.topics.length) ? data.topics : [{id:"general",name:"General",icon:"fa-book"}];
  } catch { topics = [{id:"general",name:"General",icon:"fa-book"}]; }
  if(!currentTopicId) currentTopicId = topics[0].id;
  renderTopicsBar();
}

function renderTopicsBar() {
  topicsBar.innerHTML = "";
  topics.forEach(topic => {
    let btn = document.createElement('button');
    btn.className = "topic-btn" + (topic.id === currentTopicId ? " active":"");
    btn.innerHTML = `<i class="fa ${topic.icon||"fa-book"}"></i> ${topic.name}`;
    btn.onclick = () => {
      if(currentTopicId!==topic.id){
        currentTopicId = topic.id;
        messages = []; offset = 0; hasMore = true;
        document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadHistory();
      }
    };
    btn.id = 'topic-'+topic.id;
    topicsBar.appendChild(btn);
  });
  // Add "New Topic" button
  let newBtn = document.createElement('button');
  newBtn.className = "new-topic-btn";
  newBtn.innerHTML = `<i class="fa fa-plus"></i> New Topic`;
  newBtn.onclick = createNewTopicModal;
  topicsBar.appendChild(newBtn);
  deleteHistoryBtn.style.display = "inline-block";
}

// Create Topic Modal/Prompt
function createNewTopicModal() {
  const topicName = prompt("Enter a new topic name");
  if(topicName && topicName.length>=2){
    let icon = "fa-book";
    // Could show a modal with icon choices
    addNewTopic(topicName,icon);
  }
}
async function addNewTopic(name,icon) {
  try {
    let token=getCookie('jwt_token')||localStorage.getItem('jwt_token');
    let res = await fetch('https://examguard-jmvj.onrender.com/api/ai-chat/topics',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({name,icon})
    });
    let topic = await res.json();
    if(topic && topic.id){
      topics.push(topic);
      currentTopicId = topic.id;
      renderTopicsBar();
      messages = []; offset = 0; hasMore = true;
      loadHistory();
    }
  }catch(e){alert("Can't create topic right now.");}
}

// Load Chat History
async function loadHistory(isLoadMore = false) {
  if(loadingHistory || !hasMore) return;
  loadingHistory = true; loadMoreBtn.disabled = true;
  let token = getCookie('jwt_token') || localStorage.getItem('jwt_token');
  try {
    const res = await fetch(
      `https://examguard-jmvj.onrender.com/api/ai-chat/history?offset=${offset}&limit=${limit}&topic=${currentTopicId}`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const data = await res.json();
    let newMessages = [];
    if (data.history && data.history.length > 0) {
      data.history.slice().reverse().forEach(msg => {
        // Flatten all user/prof/professor messages in order
        if (msg.messages && Array.isArray(msg.messages)) {
          msg.messages.forEach(subMsg => {
            if (subMsg.role === 'user' || subMsg.role === 'student') {
              newMessages.push({ role: 'user', text: subMsg.content || '', time: msg.date ? getTime(new Date(msg.date)) : '' });
            } else if (subMsg.role === 'professor' || subMsg.role === 'prof') {
              newMessages.push({ role: 'prof', text: subMsg.content || '', time: msg.date ? getTime(new Date(msg.date)) : '' });
            }
          });
        }
        if (msg.professorReply) {
          newMessages.push({ role: 'prof', text: msg.professorReply, time: msg.date ? getTime(new Date(msg.date)) : '' });
        }
      });
      if (isLoadMore) {
        messages = [...newMessages, ...messages];
        offset += data.history.length;
      } else {
        messages = newMessages;
        offset = data.history.length;
      }
      hasMore = data.hasMore;
      loadMoreBtn.style.display = hasMore ? "block" : "none";
    } else {
      hasMore = false;
      loadMoreBtn.style.display = "none";
    }
    renderMessages(!isLoadMore);
  } catch (e) {
    loadMoreBtn.style.display = "none";
  }
  loadMoreBtn.disabled = false; loadingHistory = false;
}

// Message Rendering + Actions (copy, edit, resend, delete)
function markdownToRichHtml(input) {
  input=input.replace(/(?:\|\s*([$a-zA-Z0-9^_{}\\().\-+/* ]+)\s*)+\|/g,function(row){
    let cells=row.trim().split('|').filter(e=>e.trim().length>0);
    if(cells.length<2)return row;
    return '<tr>'+cells.map(c=>'<td>'+c.trim()+'</td>').join('')+'</tr>';
  });
  input=input.replace(/(<tr>.*<\/tr>)+/g,function(rows){return '<table>'+rows+'</table>';});
  input=input.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
  input=input.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>');
  input=input.replace(/(?:^|\n)[-—•] (.+)/g,'<li>$1</li>');
  input=input.replace(/(?:^|\n)(\d+)\. (.+)/g,'<li>$2</li>');
  input=input.replace(/(<ul>(?:<li>[\s\S]+?<\/li>)+<\/ul>)/g,"$1");
  input=input.replace(/(?:<li>[\s\S]+?<\/li>)+/g, m => `<ul>${m}</ul>`);
  input=input.replace(/\n{2,}/g,'<br><br>');
  input=input.replace(/!\[(.*?)\]\((.*?)\)/g,'<img src="$2" alt="$1" style="max-width:90%;border-radius:5px;">');
  return `<div class='rich-block'>${input}</div>`;
}

function renderMessages(scrollBottom=true) {
  chatMessages.innerHTML='';
  messages.forEach((msg, idx) => {
    let row = document.createElement('div');
    row.className = 'message-row ' + (msg.role==='user'?'user':'prof');
    let avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = msg.role==='user'?(user.profilePic||PROFESSOR_AVATAR):PROFESSOR_AVATAR;
    avatar.alt = msg.role==='user'?(user.username||'You'):'Professor';
    let bubble = document.createElement('div'); bubble.className='message-bubble';
    let bubbleContent = msg.role==='prof'?markdownToRichHtml(msg.text||''):(msg.text||'');
    if (msg.attachment) bubbleContent += '<br>' + msg.attachment.preview;
    bubble.innerHTML = bubbleContent;

    // Actions bar
    let actions = document.createElement('div');
    actions.className = 'message-actions';
    // Copy
    let copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.title = "Copy";
    copyBtn.innerHTML = '<i class="fa fa-copy"></i>';
    copyBtn.onclick = () => navigator.clipboard.writeText(msg.text);
    actions.appendChild(copyBtn);
    // Edit+Resend (only user)
    if (msg.role==='user') {
      let editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.title = "Edit and Resend";
      editBtn.innerHTML = '<i class="fa fa-edit"></i>';
      editBtn.onclick = () => {
        chatInput.value = msg.text;
        chatInput.focus();
      };
      actions.appendChild(editBtn);
    }
    // Delete message
    let deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.title = "Delete";
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.onclick = () => deleteMessage(idx);
    actions.appendChild(deleteBtn);

    bubble.appendChild(actions);
    let meta = document.createElement('div'); meta.className='message-meta';
    meta.textContent = msg.time||'';
    if(msg.role==='user'){
      let statusEl=document.createElement('span');
      statusEl.className="message-status";
      statusEl.innerHTML='<i class="fa-solid fa-eye"></i>';
      meta.appendChild(statusEl);
      row.appendChild(meta); row.appendChild(bubble); row.appendChild(avatar);
    } else {
      row.appendChild(avatar); row.appendChild(bubble); row.appendChild(meta);
    }
    chatMessages.appendChild(row);
  });
  chatMessages.appendChild(typingIndicator);
  if(window.MathJax) MathJax.typesetPromise([chatMessages]);
  if(scrollBottom) chatMessages.scrollTop=chatMessages.scrollHeight;
}

// Delete single message
function deleteMessage(idx) {
  if (confirm('Delete this message?')) {
    // Optionally call a backend delete per message if persisted
    messages.splice(idx,1); renderMessages();
  }
}

// Delete all history for current topic
deleteHistoryBtn.onclick = async function() {
  if (confirm('Delete all history for this topic?')) {
    let token = getCookie('jwt_token') || localStorage.getItem('jwt_token');
    try {
      await fetch('https://examguard-jmvj.onrender.com/api/ai-chat/history', {
        method:'DELETE',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({topic:currentTopicId})
      });
      messages = []; offset = 0; hasMore = false; renderMessages();
    }catch(e){alert('Could not delete history now.');}
  }
};

// Load more
loadMoreBtn.onclick = () => loadHistory(true);

// Emoji Picker
EMOJIS.forEach(e=>{
  const span=document.createElement('span');
  span.textContent=e;
  span.onclick=()=>{chatInput.value+=e;chatInput.focus();emojiPicker.classList.remove('active');};
  emojiPicker.appendChild(span);
});
emojiBtn.onclick=()=>emojiPicker.classList.toggle('active');
document.addEventListener('mousedown',(e)=>{if(!emojiPicker.contains(e.target)&&e.target!==emojiBtn)emojiPicker.classList.remove('active');});

// Attachments
attachBtn.onclick=()=>attachInput.click();
attachInput.onchange=function(){
  const file=this.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    if(file.type.startsWith('image/')){currentAttachment={name:file.name,type:file.type,data:e.target.result.split(',')[1],preview:`<img src="${e.target.result}" alt="attachment" class="attach-preview">`};}
    chatInput.value=chatInput.value.trim()?chatInput.value:`[Attachment: ${file.name}] `;chatInput.focus();
  };
  reader.readAsDataURL(file);
};

// New Conversation button
newConvBtn.onclick = async function() {
  // Optionally ask for new topic name
  createNewTopicModal();
};

// Send message
chatFormDOM.addEventListener('submit',function(e){e.preventDefault();sendMessage();});
chatInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
async function sendMessage(){
  if(sending)return;
  let text=chatInput.value.trim();
  if(!text&&!currentAttachment)return;
  sending=true;
  let nowTime=getTime();
  messages.push({role:'user',text:text,time:nowTime,status:'sent',attachment:currentAttachment});
  renderMessages(true);
  chatInput.value='';typingIndicator.style.display='block';
  let token=getCookie('jwt_token')||localStorage.getItem('jwt_token');
  let contextMsgs=messages.filter(m=>m.role==='user'||m.role==='prof').slice(-10).map(m=>({role:m.role==='prof'?'professor':'user',content:m.text}));
  let payload={messages:[...contextMsgs,{role:'user',content:text}],topic:currentTopicId};
  if(currentAttachment){payload.image={mimeType:currentAttachment.type,data:currentAttachment.data,fileName:currentAttachment.name};}
  try{
    const resp=await fetch('https://examguard-jmvj.onrender.com/api/ai-chat/send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload)});
    const data=await resp.json();
    let profMsg={role:'prof',text:(data.reply||''),time:getTime()};
    messages.push(profMsg);typingIndicator.style.display='none';renderMessages(true);
  }catch(e){
    messages.push({role:'prof',text:'<span style="color:red;">Error contacting Academic Tutor.</span>',time:getTime()});
    typingIndicator.style.display='none';renderMessages(true);
  }
  sending=false;currentAttachment=null;attachInput.value='';
}
checkSession();
