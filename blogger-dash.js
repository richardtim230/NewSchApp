const BACKEND = "https://examguard-jmvj.onrender.com";
const POSTS_API = BACKEND + "/api/posts";
const PROFILE_API = BACKEND + "/api/users/me";
const MESSAGES_API = BACKEND + "/api/messages";
const HELP_API = BACKEND + "/api/help";
function getToken() { return localStorage.token || sessionStorage.token || ''; }
function authHeader() { return { 'Authorization': 'Bearer ' + getToken() }; }

let posts = [];
let quill, quillInitialized = false, editingPostId = null;
let uploadedImages = [];

function showPostsLoading() {
  document.getElementById('myPostsList').innerHTML = `<div class="flex items-center justify-center py-12"><svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg></div>`;
}

async function fetchProfile() {
  try {
    const res = await fetch(PROFILE_API, { headers: { ...authHeader(), "Content-Type": "application/json" } });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) return;
    const d = await res.json();
    document.getElementById("profileName").value = d.user.fullname || "";
    document.getElementById("profileEmail").value = d.user.email || "";
    document.getElementById("profileBio").value = d.user.bio || "";
    document.getElementById("profileAvatar").src = d.user.profilePic ? d.user.profilePic : `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.fullname||"User")}&background=FFCE45&color=263159&rounded=true`;
    document.getElementById("notifyEmail").checked = !!d.user.notifyEmail;
    document.getElementById("notifySMS").checked = !!d.user.notifySMS;
    document.getElementById("notifyPush").checked = !!d.user.notifyPush;
  } catch {
    forceLogout();
  }
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    const res = await fetch(PROFILE_API, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        fullname: document.getElementById("profileName").value,
        email: document.getElementById("profileEmail").value,
        bio: document.getElementById("profileBio").value,
        notifyEmail: document.getElementById("notifyEmail").checked,
        notifySMS: document.getElementById("notifySMS").checked,
        notifyPush: document.getElementById("notifyPush").checked
      })
    });
    if (res.status === 401 || res.status === 403) return forceLogout();
  } catch {
    forceLogout();
  }
}

async function fetchPosts() {
  showPostsLoading();
  try {
    const res = await fetch(BACKEND + "/api/myposts", { headers: authHeader() });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) throw new Error("Failed to fetch posts.");
    posts = await res.json();
    renderMyPosts();
    document.getElementById('postsCount').textContent = posts.length;
    let totalEarnings = 0, totalRating = 0, totalRated = 0;
    let recent = [];
    posts.forEach(post => {
      totalEarnings += post.earnings || 0;
      if (post.rating) { totalRating += post.rating; totalRated++; }
      if (post.status === "Published" && post.date) recent.push(post);
    });
    document.getElementById('earningsTotal').textContent = "₦" + totalEarnings.toLocaleString();
    document.getElementById('avgRating').textContent = totalRated ? (totalRating/totalRated).toFixed(2) : "0.0";
    recent.sort((a,b) => new Date(b.date)-new Date(a.date));
    document.getElementById('recentActivity').innerHTML = recent.slice(0, 5).map(p => `<li>+₦${p.earnings||0} for "${p.title}" (${p.status||"Draft"})</li>`).join('');
  } catch (err) {
    document.getElementById('myPostsList').innerHTML = `<div class="text-red-500 text-center py-8">Could not load posts. Please try again.</div>`;
  }
}

function renderMyPosts() {
  const el = document.getElementById('myPostsList');
  if (!posts.length) {
    el.innerHTML = `<div class="text-gray-500 text-center py-8">No posts yet. Click "New Post" to start blogging!</div>`;
    return;
  }
  el.innerHTML = "";
  posts.forEach(post => {
    let images = Array.isArray(post.images) && post.images.length ? post.images : (post.imageUrl ? [post.imageUrl] : []);
    let imageHtml = images.length
      ? `<img src="${images[0]}" alt="${post.title}" class="rounded-lg w-24 h-24 object-cover mr-3">`
      : '';
    el.innerHTML += `
    <div class="rounded-xl border border-gray-200 shadow p-4 flex flex-col md:flex-row gap-4 items-center bg-white">
      ${imageHtml}
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">${post.status || "Draft"}</span>
          <span class="text-xs text-gray-400">${post.date ? new Date(post.date).toLocaleDateString() : ""}</span>
          <span class="ml-auto text-xs text-gray-600">${post.views || 0} views</span>
        </div>
        <div class="font-bold text-lg md:text-xl text-blue-900 mb-1">${post.title}</div>
        <div class="prose prose-sm text-gray-700 mb-2 line-clamp-2" style="max-width:100%">${post.content.replace(/<[^>]+>/g, '').substring(0, 120) + "..."}</div>
        <div class="flex items-center gap-4 mt-2">
          <button onclick="editPost('${post._id}')" class="text-indigo-600 font-semibold hover:underline">Edit</button>
          <button onclick="deletePost('${post._id}')" class="text-red-500 font-semibold hover:underline">Delete</button>
          <button onclick="previewPost('${post._id}')" class="text-blue-600 font-semibold hover:underline">Preview</button>
          <span class="ml-auto text-xs text-yellow-600 font-bold">₦${post.earnings || 0} earned</span>
          <span class="text-xs text-indigo-600 font-bold">${post.comments ? post.comments.length : 0} comments</span>
        </div>
      </div>
    </div>
    `;
  });
  document.getElementById('postsCount').textContent = posts.length;
}

function initEditor() {
  if(quillInitialized) return;
  quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }, { 'font': [] }, { 'size': [] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'align': [] }, { 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['blockquote', 'code-block'],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        ['link', 'image', 'video'],
        [{ 'formula': [] }, { 'table': [] }],
        ['clean']
      ]
    }
  });
  quillInitialized = true;
}
setTimeout(initEditor, 50);

function tabSwitch(tabName) {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('tab-btn-active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-btn-active');
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.getElementById('tab-' + tabName).classList.remove('hidden');
  if(tabName === 'editor') setTimeout(initEditor, 50);
  if(tabName === 'settings') fetchProfile();
  if(tabName === 'myposts') fetchPosts();
  if(tabName === 'earnings') fetchPosts();
  if(tabName === 'messages') fetchMessages();
  if(tabName === 'postlinks') renderPostLinks();
}

document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', function() { tabSwitch(this.dataset.tab); });
});
document.getElementById('toEditorBtn').onclick = () => { tabSwitch('editor'); clearEditor(); };
document.getElementById('trashBtn').onclick = () => { clearEditor(); };

function clearEditor() {
  document.getElementById('postTitle').value = "";
  document.getElementById('postTopic').value = "";
  document.getElementById('postSubject').value = "";
  document.getElementById('postCategory').value = "";
  if (quill) quill.setContents([{ insert: '\n' }]);
  editingPostId = null;
  uploadedImages = [];
  document.getElementById("imageUpload").value = "";
  document.getElementById("imagePreview").innerHTML = "";
}

document.getElementById("imageUpload").addEventListener("change", async function(evt) {
  const files = Array.from(evt.target.files);
  if (files.length > 3) {
    alert("You can upload a maximum of 3 images per post.");
    evt.target.value = "";
    return;
  }
  let html = "";
  uploadedImages = [];
  for (const file of files) {
    if (file.size > 5*1024*1024) {
      alert("Each image must be less than 5MB.");
      evt.target.value = "";
      html = "";
      uploadedImages = [];
      return;
    }
    try {
      html += `<span class="w-14 h-14 flex items-center justify-center border rounded">Uploading...</span>`;
      document.getElementById("imagePreview").innerHTML = html;
      const imageUrl = await uploadImageToCloudinary(file);
      html += `<img src="${imageUrl}" class="w-14 h-14 rounded border object-cover" title="${file.name}">`;
      uploadedImages.push(imageUrl);
      document.getElementById("imagePreview").innerHTML = html;
    } catch (err) {
      alert("Image upload failed: " + err.message);
      return;
    }
  }
});

async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(BACKEND + "/api/images", {
    method: "POST",
    body: formData,
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  if (!res.ok) throw new Error("Cloud upload failed");
  const data = await res.json();
  return data.url;
}

async function convertBase64ImagesToCloudinary(html) {
  const imgRegex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/g;
  const matches = Array.from(html.matchAll(imgRegex));
  let newHtml = html;
  for (const match of matches) {
    const base64 = match[1];
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], "inline-image.png", { type: blob.type });
    const imageUrl = await uploadImageToCloudinary(file);
    newHtml = newHtml.replace(base64, imageUrl);
  }
  return newHtml;
}

document.getElementById('postEditorForm').onsubmit = async function(e){
  e.preventDefault();
  let content = quill.root.innerHTML;
  content = await convertBase64ImagesToCloudinary(content);
  const title = document.getElementById('postTitle').value;
  const topic = document.getElementById('postTopic').value;
  const subject = document.getElementById('postSubject').value;
  const category = document.getElementById('postCategory').value;
  const saveBtn = document.getElementById('saveDraftBtn');
  const draftSpinner = document.getElementById('draftSpinner');
  saveBtn.disabled = true;
  draftSpinner.classList.remove('hidden');
  try {
    let body = {
      title,
      topic,
      subject,
      category,
      content,
      status: "Draft",
      images: uploadedImages
    };
    let method = editingPostId ? "PUT" : "POST";
    let url = editingPostId
      ? `${POSTS_API}/${editingPostId}`
      : `${POSTS_API}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + getToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) throw new Error(editingPostId ? "Could not update post." : "Could not create post.");
    await fetchPosts();
    tabSwitch('myposts');
    clearEditor();
  } catch (err) {
    alert("There was an error saving your post.");
  } finally {
    saveBtn.disabled = false;
    draftSpinner.classList.add('hidden');
  }
};

document.getElementById('publishBtn').onclick = async function() {
  const publishBtn = this;
  const publishSpinner = document.getElementById('publishSpinner');
  publishBtn.disabled = true;
  publishSpinner.classList.remove('hidden');
  let content = quill.root.innerHTML;
  content = await convertBase64ImagesToCloudinary(content);
  const title = document.getElementById('postTitle').value;
  const topic = document.getElementById('postTopic').value;
  const subject = document.getElementById('postSubject').value;
  const category = document.getElementById('postCategory').value;
  try {
    let body = {
      title,
      category,
      content,
      topic,
      subject,
      status: "Published",
      images: uploadedImages
    };
    let method = editingPostId ? "PUT" : "POST";
    let url = editingPostId
      ? `${POSTS_API}/${editingPostId}`
      : `${POSTS_API}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + getToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) throw new Error("Publish failed.");
    await fetchPosts();
    tabSwitch('myposts');
    clearEditor();
  } catch (err) {
    alert("There was an error publishing your post.");
  } finally {
    publishBtn.disabled = false;
    publishSpinner.classList.add('hidden');
  }
};

window.editPost = async function(id) {
  const res = await fetch(`${POSTS_API}/${id}`, { headers: authHeader() });
  if (!res.ok) {
    alert("Could not fetch post details");
    return;
  }
  const post = await res.json();
  tabSwitch('editor');
  setTimeout(() => {
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postTopic').value = post.topic;
    document.getElementById('postSubject').value = post.subject;
    document.getElementById('postCategory').value = post.category || "";
    if (quill) quill.root.innerHTML = post.content || ""; // preserves paragraphs, spacing, rich designs
    editingPostId = id;
    let html = "";
    if (Array.isArray(post.images) && post.images.length) {
      uploadedImages = post.images;
      post.images.forEach(img => {
        html += `<img src="${img}" class="w-14 h-14 rounded border object-cover">`;
      });
      document.getElementById("imagePreview").innerHTML = html;
    } else {
      uploadedImages = [];
      document.getElementById("imagePreview").innerHTML = "";
    }
  }, 100);
};

window.deletePost = async function(id) {
  if (!id) {
    alert("Missing post ID!");
    return;
  }
  if(!confirm("Are you sure you want to delete this post?")) return;
  try {
    const res = await fetch(`${POSTS_API}/${id}`, {
      method: 'DELETE',
      headers: authHeader()
    });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) {
      const data = await res.json();
      console.error("Delete failed:", data);
      alert(data.error || "Delete failed.");
      return;
    }
    await fetchPosts();
  } catch (err) {
    alert("Delete failed: " + (err.message || err));
  }
};

window.previewPost = function(id) {
  const post = posts.find(p => p._id === id);
  if (!post) return;
  showPreviewModal(post.title, post.content, post.images || (post.imageUrl ? [post.imageUrl] : []));
};

function showPreviewModal(title, content, images) {
  document.getElementById('previewModalTitle').innerText = title;
  document.getElementById('previewModalContent').innerHTML = content;
  let html = '';
  if (Array.isArray(images)) {
    images.forEach(img => {
      html += `<img src="${img}" class="w-24 h-24 object-cover rounded border" />`;
    });
  }
  document.getElementById('previewImages').innerHTML = html;
  document.getElementById('previewModal').classList.remove('hidden');
}
document.getElementById('closePreviewModal').onclick = function() {
  document.getElementById('previewModal').classList.add('hidden');
};
document.getElementById('previewBtn').onclick = function() {
  const title = document.getElementById('postTitle').value || "Untitled Preview";
  const content = quill.root.innerHTML;
  let html = '';
  if (uploadedImages.length) {
    uploadedImages.forEach(img => {
      html += `<img src="${img}" class="w-24 h-24 object-cover rounded border" />`;
    });
  }
  document.getElementById('previewModalTitle').innerText = title;
  document.getElementById('previewModalContent').innerHTML = content;
  document.getElementById('previewImages').innerHTML = html;
  document.getElementById('previewModal').classList.remove('hidden');
};
document.getElementById('hamburger-btn').addEventListener('click', function() {
  const menu = document.getElementById('mobile-menu');
  menu.hidden = !menu.hidden;
});
document.getElementById('settingsForm').onsubmit = saveProfile;

async function fetchMessages() {
  try {
    const res = await fetch(MESSAGES_API, { headers: authHeader() });
    if (res.status === 401 || res.status === 403) return forceLogout();
    if (!res.ok) throw new Error("Failed to fetch messages");
    const data = await res.json();
    document.getElementById('messagesList').innerHTML = data.map(msg => `<div class="flex items-center gap-2"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(msg.from||'User')}&background=FFCE45&color=263159&rounded=true" class="w-8 h-8 rounded-full"> <span class="font-bold text-blue-900">${msg.from||'User'}:</span> <span>${msg.msg}</span></div>`).join('');
  } catch { document.getElementById('messagesList').innerHTML = ""; }
}

document.getElementById('blogMsgForm').onsubmit = async function(e){
  e.preventDefault();
  const msgText = document.getElementById('msgText').value;
  if (!msgText.trim()) return;
  try {
    const res = await fetch(MESSAGES_API, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ msg: msgText, date: new Date().toISOString(), from: document.getElementById("profileName").value || "Me" })
    });
    if (res.status === 401 || res.status === 403) return forceLogout();
    fetchMessages();
    this.reset();
  } catch {}
};

document.getElementById('helpForm').addEventListener('submit', function(e){
  e.preventDefault();
  const helpInput = document.getElementById('helpInput');
  if (helpInput.value.trim()) {
    const box = document.getElementById('helpBox');
    box.innerHTML += `<div class="mb-1"><span class="font-semibold text-blue-900">You:</span> ${helpInput.value}</div>`;
    box.scrollTop = box.scrollHeight;
    helpInput.value = "";
  }
});

function renderPostLinks() {
  const el = document.getElementById('postsLinkList');
  if (!posts.length) {
    el.innerHTML = `<div class="text-gray-400 py-6">No posts to display.</div>`;
    return;
  }
  el.innerHTML = posts.map(post => {
    const slug = (post.title || "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + post._id;
    return `<li>
      <a class="text-blue-700 hover:underline font-semibold" target="_blank"
        href="blog-details.html?id=${post._id}">${post.title}</a>
      <span class="text-xs text-gray-500 ml-2">${post.status || ""}</span>
    </li>`;
  }).join('');
}

function forceLogout() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location = "mock-icthallb";
}

document.addEventListener('DOMContentLoaded', () => {
  fetchProfile();
  fetchPosts();
});
