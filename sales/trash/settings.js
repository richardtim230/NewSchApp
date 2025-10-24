const API_BASE = "https://examguide.onrender.com/api";
let currentProfile = {};

function showSpinner() {
  document.getElementById('spinner-overlay')?.style?.setProperty('display', 'flex');
}
function hideSpinner() {
  document.getElementById('spinner-overlay')?.style?.setProperty('display', 'none');
}

function showToast(message, type = "success") {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-base font-semibold transition-opacity duration-300';
  toast.classList.add(type === "success" ? 'bg-indigo-700' : 'bg-red-600');
  toast.classList.remove(type === "success" ? 'bg-red-600' : 'bg-indigo-700');
  toast.textContent = message;
  toast.style.opacity = 1;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => { toast.classList.add('hidden'); }, 350);
  }, 2600);
}

async function autoFillProfile() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    showSpinner();
    const resp = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    currentProfile = data.user || data || {};
    document.getElementById("fullname").value = currentProfile.fullname || "";
    document.getElementById("email").value = currentProfile.email || "";
    document.getElementById("phone").value = currentProfile.phone || "";
    // Try fetching account settings as well to fill the rest
    await autoFillAccountSettings(token);
  } catch {
    document.getElementById("settingsMsg").textContent = "Unable to load profile. Please log in again.";
    document.getElementById("settingsMsg").className = "text-center mt-4 text-base text-red-600";
  } finally {
    hideSpinner();
  }
}
autoFillProfile();

async function autoFillAccountSettings(token) {
  try {
    const resp = await fetch(`${API_BASE}/account-settings`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data && data.settings) {
      document.getElementById('bank').value = data.settings.bank || "";
      document.getElementById('accountName').value = data.settings.accountName || "";
      document.getElementById('accountNumber').value = data.settings.accountNumber || "";
      document.getElementById('idType').value = data.settings.idType || "";
      // Don't prefill file inputs for security reasons
    }
  } catch { }
}

async function uploadToCloudinary(file) {
  if (!file) return "";
  const formData = new FormData();
  formData.append("image", file);
  const resp = await fetch(`${API_BASE}/images`, {
    method: "POST",
    body: formData
  });
  const data = await resp.json();
  if (resp.ok && data.url) return data.url;
  throw new Error(data.error || "Failed to upload image");
}

document.getElementById('idDocument').addEventListener('change', function() {
  const file = this.files[0];
  document.getElementById('idDocInfo').textContent = file ? `${file.name} (${Math.round(file.size/1024)} KB)` : "";
});
document.getElementById('proofOfAddress').addEventListener('change', function() {
  const file = this.files[0];
  document.getElementById('addrDocInfo').textContent = file ? `${file.name} (${Math.round(file.size/1024)} KB)` : "";
});

document.getElementById('accountName').addEventListener('input', function() {
  const acctName = this.value.trim().toLowerCase();
  const profileName = (document.getElementById('fullname').value || "").trim().toLowerCase();
  const check = document.getElementById('acctNameCheck');
  if (!acctName) { check.textContent = ""; return; }
  if (profileName && acctName !== profileName) {
    check.textContent = "Account Name must match your profile name!";
    check.className = "text-xs font-semibold text-red-600";
  } else {
    check.textContent = "Match!";
    check.className = "text-xs font-semibold text-green-600";
  }
});

document.getElementById('settingsForm').onsubmit = async function(e) {
  e.preventDefault();
  const msg = document.getElementById('settingsMsg');
  msg.textContent = "";
  msg.className = "text-center mt-4 text-base";
  const token = localStorage.getItem('token');
  if (!token) {
    showToast("Session expired. Please log in.", "error");
    msg.textContent = "Session expired. Please log in.";
    msg.classList.add("text-red-600");
    return;
  }
  const acctName = document.getElementById('accountName').value.trim().toLowerCase();
  const profileName = (document.getElementById('fullname').value || "").trim().toLowerCase();
  if (acctName !== profileName) {
    showToast("Account Name must match your profile name!", "error");
    msg.textContent = "Account Name must match your profile name!";
    msg.classList.add("text-red-600");
    document.getElementById('accountName').focus();
    return;
  }

  showSpinner();
  msg.textContent = "Uploading documents...";
  msg.className = "text-center mt-4 text-base text-blue-700";

  // Upload files to Cloudinary
  let idDocumentUrl = "";
  let proofOfAddressUrl = "";
  try {
    const idFile = document.getElementById('idDocument').files[0];
    const addrFile = document.getElementById('proofOfAddress').files[0];
    if (idFile) idDocumentUrl = await uploadToCloudinary(idFile);
    if (addrFile) proofOfAddressUrl = await uploadToCloudinary(addrFile);
  } catch (err) {
    hideSpinner();
    showToast("Failed to upload documents: " + (err.message || "Unknown error"), "error");
    msg.textContent = "Failed to upload documents: " + (err.message || "Unknown error");
    msg.className = "text-center mt-4 text-base text-red-600";
    return;
  }

  // Now send all data to /api/account-settings
  msg.textContent = "Saving...";
  msg.className = "text-center mt-4 text-base text-blue-700";
  try {
    const payload = {
      fullname: document.getElementById('fullname').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      bank: document.getElementById('bank').value,
      accountName: document.getElementById('accountName').value,
      accountNumber: document.getElementById('accountNumber').value,
      idType: document.getElementById('idType').value,
      idDocument: idDocumentUrl,
      proofOfAddress: proofOfAddressUrl
    };
    const resp = await fetch(`${API_BASE}/account-settings`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      hideSpinner();
      showToast("Account settings saved and submitted for verification!", "success");
      msg.textContent = "Account settings saved and submitted for verification!";
      msg.className = "text-center mt-4 text-base text-green-600";
    } else {
      hideSpinner();
      showToast(data.error || "Failed to save settings. Try again.", "error");
      msg.textContent = data.error || "Failed to save settings. Try again.";
      msg.className = "text-center mt-4 text-base text-red-600";
    }
  } catch (err) {
    hideSpinner();
    showToast("Network error. Please try again.", "error");
    msg.textContent = "Network error. Please try again.";
    msg.className = "text-center mt-4 text-base text-red-600";
  }
};
