
    const PROFESSOR_AVATAR = "https://avatars.githubusercontent.com/u/645549?v=4";
    const CHANNELS = [
      { id:"general", name:"General" },{ id:"math", name:"Math" },{ id:"physics", name:"Physics" },
      { id:"programming", name:"Programming" },{ id:"chemistry", name:"Chemistry" },
      { id:"biology", name:"Biology" },{ id:"assignments", name:"Assignments" },
    ];
    const EMOJIS = ["😀","😁","😂","🤓","🤩","😉","😊","😍","🙌","💯","👍","👏","🙏","🎉","📝","📚",
      "🤔","⚡","💡","🔥","😱","🥳","😇","🎓","😢","😭","🥺","👩‍🏫","🧑‍🔬","🔬"];
    let messages = [];
    let offset = 0, limit = 10, hasMore = true, sending = false, currentAttachment = null, loadingHistory = false, currentChannel = CHANNELS[0].id, user = null;
    // DOM
    const loginScreen = document.getElementById('loginScreen'), loginForm = document.getElementById('loginForm'), loginUsername = document.getElementById('loginUsername'),
      loginPassword = document.getElementById('loginPassword'), loginError = document.getElementById('loginError'), chatContainer = document.getElementById('chatContainer'),
      userInfoBar = document.getElementById('userInfoBar'), chatMessages = document.getElementById('chatMessages'),
      chatInput = document.getElementById('chatInput'), chatFormDOM = document.getElementById('chatForm'), attachBtn = document.getElementById('attachBtn'),
      attachInput = document.getElementById('attachInput'), emojiBtn = document.getElementById('emojiBtn'), emojiPicker = document.getElementById('emojiPicker'),
      typingIndicator = document.getElementById('typingIndicator'), loadMoreBtn = document.getElementById('loadMoreBtn'),
      topicPlusBtn = document.getElementById('topicPlusBtn'), topicDropdown = document.getElementById('topicDropdown'), selectedTopic = document.getElementById('selectedTopic');
    function getTime(dateObj){if(!dateObj)dateObj=new Date();return dateObj.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
    function setCookie(name,val){document.cookie=name+'='+val+';path=/';}
    function getCookie(name){let v=(';'+document.cookie).split('; '+name+'=');return v.length===2?v.pop().split(';').shift():"";}
    function showLogin(){loginScreen.style.display='flex';chatContainer.style.display='none';}
    function showChat(){loginScreen.style.display='none';chatContainer.style.display='flex';}
    async function checkSession(){
      let token=getCookie('jwt_token')||localStorage.getItem('jwt_token');
      if(token){
        try{
          let res=await fetch('https://examguard-jmvj.onrender.com/api/auth/me',{headers:{'Authorization':'Bearer '+token}});
          let data=await res.json();
          if(data&&data.user){
            user=data.user;showChat();postLoginSetup();renderTopicbar();loadHistory();
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
          showChat();postLoginSetup();renderTopicbar();loadHistory();
        }else{loginError.textContent=data.message||"Login error";}
      }catch(e){loginError.textContent="Network error. Please try later.";}
    }
    function postLoginSetup(){userInfoBar.innerHTML=`<img src="${user.profilePic||PROFESSOR_AVATAR}" style="width:27px;height:27px;" class="profile-avatar" alt="Profile" title="${user.fullname||user.username||''}"> ${user.fullname||user.username||''}`;}
    function renderTopicbar(){
      topicDropdown.innerHTML="";
      CHANNELS.forEach(chan=>{
        let btn=document.createElement('button');
        btn.className="topic-btn"+(chan.id===currentChannel?" active":"");
        btn.textContent=chan.name;
        btn.onclick=function(){
          if(currentChannel!==chan.id){
            currentChannel=chan.id;
            document.querySelectorAll('.topic-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            messages=[];offset=0;hasMore=true;loadHistory();
          }
          topicDropdown.classList.remove('show');
        };
        btn.id='topic-'+chan.id;topicDropdown.appendChild(btn);
      });
      selectedTopic.textContent=CHANNELS.find(c=>c.id===currentChannel).name;
    }
    topicPlusBtn.onclick=()=>topicDropdown.classList.toggle('show');
    document.addEventListener('mousedown',(e)=>{if(!topicDropdown.contains(e.target)&&e.target!==topicPlusBtn)topicDropdown.classList.remove('show');});
    EMOJIS.forEach(e=>{
      const span=document.createElement('span');span.textContent=e;
      span.onclick=()=>{chatInput.value+=e;chatInput.focus();emojiPicker.classList.remove('active');};
      emojiPicker.appendChild(span);
    });
    emojiBtn.onclick=()=>emojiPicker.classList.toggle('active');
    document.addEventListener('mousedown',(e)=>{if(!emojiPicker.contains(e.target)&&e.target!==emojiBtn)emojiPicker.classList.remove('active');});
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
    // ========== RICH HTML MARKDOWN (tables etc) ==========
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
      // Make continuous <li> as a single <ul>
      input=input.replace(/(<ul>(?:<li>[\s\S]+?<\/li>)+<\/ul>)/g,"$1");
      input=input.replace(/(?:<li>[\s\S]+?<\/li>)+/g, m => `<ul>${m}</ul>`);
      input=input.replace(/\n{2,}/g,'<br><br>');
      input=input.replace(/!\[(.*?)\]\((.*?)\)/g,'<img src="$2" alt="$1" style="max-width:90%;border-radius:5px;">');
      return `<div class='rich-block'>${input}</div>`;
    }
    // MESSAGE RENDER (tables, math, images)
    function renderMessages(scrollBottom=true){
      chatMessages.innerHTML='';
      messages.forEach(msg=>{
        let row=document.createElement('div');
        row.className='message-row '+(msg.role==='user'?'user':'prof');
        let avatar=document.createElement('img');
        avatar.className='message-avatar';
        avatar.src=msg.role==='user'?(user.profilePic||PROFESSOR_AVATAR):PROFESSOR_AVATAR;
        avatar.alt=msg.role==='user'?(user.username||'You'):'Professor';
        let bubble=document.createElement('div');bubble.className='message-bubble';
        let bubbleContent=msg.role==='prof'?markdownToRichHtml(msg.text||''):(msg.text||'');
        if(msg.attachment) bubbleContent+='<br>'+msg.attachment.preview;
        bubble.innerHTML=bubbleContent;
        let meta=document.createElement('div');meta.className='message-meta';
        meta.textContent=msg.time||'';
        if(msg.role==='user'){let statusEl=document.createElement('span');statusEl.className="message-status";
          statusEl.innerHTML='<i class="fa-solid fa-eye"></i>';meta.appendChild(statusEl);row.appendChild(meta);row.appendChild(bubble);row.appendChild(avatar);}
        else{row.appendChild(avatar);row.appendChild(bubble);row.appendChild(meta);}
        chatMessages.appendChild(row);
      });
      chatMessages.appendChild(typingIndicator);
      if(window.MathJax) MathJax.typesetPromise([chatMessages]);
      if(scrollBottom) chatMessages.scrollTop=chatMessages.scrollHeight;
    }
    // FIXED: Load HISTORY, prevent repeating user's messages upon reload
    async function loadHistory(isLoadMore = false) {
  if (loadingHistory || !hasMore) return;
  loadingHistory = true; loadMoreBtn.disabled = true;
  let token = getCookie('jwt_token') || localStorage.getItem('jwt_token');
  try {
    const res = await fetch(
      `https://examguard-jmvj.onrender.com/api/ai-chat/history?offset=${offset}&limit=${limit}&channel=${currentChannel}`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const data = await res.json();
    let newMessages = [];
    if (data.history && data.history.length > 0) {
      // Iterate in reverse to maintain correct chronological order
      data.history.slice().reverse().forEach(msg => {
        // Render ALL items in msg.messages in order (reliably maintains student's turn(s))
        if (msg.messages && Array.isArray(msg.messages)) {
          msg.messages.forEach(subMsg => {
            if (subMsg.role === 'user' || subMsg.role === 'student') {
              newMessages.push({
                role: 'user',
                text: subMsg.content || '',
                time: msg.date ? getTime(new Date(msg.date)) : ''
              });
            } else if (subMsg.role === 'professor' || subMsg.role === 'prof') {
              newMessages.push({
                role: 'prof',
                text: subMsg.content || '',
                time: msg.date ? getTime(new Date(msg.date)) : ''
              });
            }
          });
        }
        // Then ADD the top-level professorReply, if present (often the actual AI/professor response)
        if (msg.professorReply) {
          newMessages.push({
            role: 'prof',
            text: msg.professorReply,
            time: msg.date ? getTime(new Date(msg.date)) : ''
          });
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
    // SEND MESSAGE WITH CONTEXT
    chatFormDOM.addEventListener('submit',function(e){e.preventDefault();sendMessage();});
    chatInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
    loadMoreBtn.onclick=()=>loadHistory(true);
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
      let payload={messages:[...contextMsgs,{role:'user',content:text}],channel:currentChannel};
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
