
const API_BASE = "https://examguide.onrender.com/api";
let currentProfile = {};

async function autoFillProfile() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const resp = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    currentProfile = data.user || data || {};
    document.getElementById("fullname").value = currentProfile.fullname || "";
    document.getElementById("email").value = currentProfile.email || "";
    document.getElementById("phone").value = currentProfile.phone || "";
  } catch {
    document.getElementById("settingsMsg").textContent = "Unable to load profile. Please log in again.";
    document.getElementById("settingsMsg").className = "text-center mt-4 text-base text-red-600";
  }
}
autoFillProfile();

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
  document.getElementById('idDocInfo').textContent = file ? file.name : "";
});
document.getElementById('proofOfAddress').addEventListener('change', function() {
  const file = this.files[0];
  document.getElementById('addrDocInfo').textContent = file ? file.name : "";
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
    msg.textContent = "Session expired. Please log in.";
    msg.classList.add("text-red-600");
    return;
  }
  const acctName = document.getElementById('accountName').value.trim().toLowerCase();
  const profileName = (document.getElementById('fullname').value || "").trim().toLowerCase();
  if (acctName !== profileName) {
    msg.textContent = "Account Name must match your profile name!";
    msg.classList.add("text-red-600");
    document.getElementById('accountName').focus();
    return;
  }
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
      msg.textContent = "Account settings saved and submitted for verification!";
      msg.className = "text-center mt-4 text-base text-green-600";
    } else {
      msg.textContent = data.error || "Failed to save settings. Try again.";
      msg.className = "text-center mt-4 text-base text-red-600";
    }
  } catch (err) {
    msg.textContent = "Network error. Please try again.";
    msg.className = "text-center mt-4 text-base text-red-600";
  }
};
