(function() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        localStorage.setItem('pendingReferral', ref);
    }
})();

const facultySelect = document.getElementById('reg-faculty');
const deptSelect = document.getElementById('reg-department');
let facultyList = [];
let departmentList = [];

function showSelectSpinner(selectElem, text = "Loading...") {
    selectElem.innerHTML = `<option value="" disabled selected>${text} &#x21bb;</option>`;
    selectElem.disabled = true;
}

async function fetchFaculties() {
    showSelectSpinner(facultySelect, "Loading faculties");
    facultyList = [];
    try {
        const res = await fetch('https://examguide.onrender.com/api/faculties');
        facultyList = await res.json();
        facultySelect.innerHTML = `<option value="">Select Faculty</option>`;
        facultyList.forEach(fac => {
            const opt = document.createElement("option");
            opt.value = fac._id;
            opt.textContent = fac.name;
            facultySelect.appendChild(opt);
        });
        facultySelect.disabled = false;
    } catch (err) {
        facultySelect.innerHTML = `<option value="" disabled selected>Error loading faculties</option>`;
        facultySelect.disabled = true;
    }
}

async function fetchDepartments(facultyId) {
    showSelectSpinner(deptSelect, "Loading departments");
    departmentList = [];
    if (!facultyId) {
        deptSelect.innerHTML = `<option value="">Select Department</option>`;
        deptSelect.disabled = true;
        return;
    }
    try {
        const res = await fetch(`https://examguide.onrender.com/api/departments?faculty=${facultyId}`);
        departmentList = await res.json();
        deptSelect.innerHTML = `<option value="">Select Department</option>`;
        departmentList.forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept._id;
            opt.textContent = dept.name;
            deptSelect.appendChild(opt);
        });
        deptSelect.disabled = false;
    } catch (err) {
        deptSelect.innerHTML = `<option value="" disabled selected>Error loading departments</option>`;
        deptSelect.disabled = true;
    }
}

facultySelect.addEventListener('change', function() {
    fetchDepartments(this.value);
});

const tabBtns = document.querySelectorAll('.tab-btn');
const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm')
};
const messageBox = document.getElementById('messageBox');

document.addEventListener('DOMContentLoaded', function() {
    fetchFaculties();
    showSelectSpinner(deptSelect, "Select faculty first");
    deptSelect.disabled = true;

    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'register') {
        tabBtns.forEach(b => b.classList.remove('active'));
        forms.login.classList.remove('active');
        forms.register.classList.add('active');
        tabBtns.forEach(btn => { if (btn.dataset.tab === 'register') btn.classList.add('active'); });
        messageBox.innerHTML = '';
    } else if (tab === 'login') {
        tabBtns.forEach(b => b.classList.remove('active'));
        forms.register.classList.remove('active');
        forms.login.classList.add('active');
        tabBtns.forEach(btn => { if (btn.dataset.tab === 'login') btn.classList.add('active'); });
        messageBox.innerHTML = '';
    }
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        for (const k in forms) forms[k].classList.remove('active');
        forms[btn.dataset.tab].classList.add('active');
        messageBox.innerHTML = '';

        if (btn.dataset.tab === 'register') {
            forms.register.style.display = '';
        }
    });
});

document.querySelectorAll('.toggle-visibility').forEach(span => {
    span.addEventListener('click', function() {
        const input = document.getElementById(this.dataset.target);
        if (input.type === 'password') {
            input.type = 'text';
            this.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            input.type = 'password';
            this.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });
});

const modalBackdrop = document.getElementById('modalBackdrop');
const customModal = document.getElementById('customModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal(contentHtml, allowClose = false) {
    modalContent.innerHTML = contentHtml;
    modalBackdrop.classList.add('show');
    if (allowClose) {
        closeModalBtn.style.display = 'block';
    } else {
        closeModalBtn.style.display = 'none';
    }
}

function closeModal() {
    modalBackdrop.classList.remove('show');
    modalContent.innerHTML = '';
}

closeModalBtn.onclick = closeModal;
modalBackdrop.addEventListener('click', function(e){
    if(e.target === modalBackdrop && closeModalBtn.style.display === 'block') closeModal();
});

function showLoadingModal(message="Please wait...", subMsg="Processing your request...") {
    openModal(`
        <div class="modal-spinner spinner"></div>
        <div class="modal-title">${message}</div>
        <div class="modal-message">${subMsg}</div>
    `);
}

function showStatusModal(type, title, msg, allowClose=true) {
    let icon = type === "success"
        ? '<span class="modal-status-icon success"><i class="bi bi-check-circle-fill"></i></span>'
        : '<span class="modal-status-icon error"><i class="bi bi-x-circle-fill"></i></span>';
    openModal(`
        ${icon}
        <div class="modal-title">${title}</div>
        <div class="modal-message">${msg}</div>
    `, allowClose);
}

function showConfirmationModal(detailsObj, onConfirm, onCancel) {
    let detailsHtml = Object.entries(detailsObj).map(([k,v])=>
        `<dt>${k}:</dt><dd>${v}</dd>`
    ).join('');
    openModal(`
        <div class="modal-title">Are the information correct?</div>
        <dl class="modal-details">${detailsHtml}</dl>
        <div class="modal-actions">
            <button class="modal-btn secondary" id="modalCancelBtn">Cancel</button>
            <button class="modal-btn" id="modalConfirmBtn">Proceed</button>
        </div>
    `, true);
    document.getElementById('modalCancelBtn').onclick = function(){closeModal(); if(onCancel) onCancel();};
    document.getElementById('modalConfirmBtn').onclick = function(){closeModal(); if(onConfirm) onConfirm();};
}

function validateUsername(username) {
    return username.trim().length > 0;
}

const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');

async function setLoginLoading(isLoading) {
    if (isLoading) {
        loginBtn.setAttribute("disabled", "disabled");
        loginSpinner.style.display = "inline-block";
        loginBtnText.style.display = "none";
    } else {
        loginBtn.removeAttribute("disabled");
        loginSpinner.style.display = "none";
        loginBtnText.style.display = "inline";
    }
}

const registerBtn = document.getElementById('registerBtn');
const registerBtnText = document.getElementById('registerBtnText');
const registerSpinner = document.getElementById('registerSpinner');

async function setRegLoading(isLoading) {
    if (isLoading) {
        registerBtn.setAttribute("disabled", "disabled");
        registerSpinner.style.display = "inline-block";
        registerBtnText.style.display = "none";
    } else {
        registerBtn.removeAttribute("disabled");
        registerSpinner.style.display = "none";
        registerBtnText.style.display = "inline";
    }
}

// ====== LOGIN HANDLING ======
forms.login.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!validateUsername(username) || !password) {
        showStatusModal("error","Login Error","Both fields are required!");
        return;
    }
    showLoadingModal("Logging in...","Please wait while we log you in.");
    await setLoginLoading(true);

    try {
        let loginResponse = await fetch("https://examguide.onrender.com/api/auth/login", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        let loginData = await loginResponse.json();

        if (loginResponse.ok) {
            localStorage.setItem('student_jwt_token', loginData.token);
            localStorage.setItem('token', loginData.token);

            if (loginData.user) {
                localStorage.setItem('studentData', JSON.stringify(loginData.user));
            }

            try {
                let profileResp = await fetch("https://examguide.onrender.com/api/auth/me", {
                    headers: { 'Authorization': 'Bearer ' + loginData.token }
                });
                let profileData = await profileResp.json();

                if (profileResp.ok && profileData.user) {
                    localStorage.setItem('studentData', JSON.stringify(profileData.user));
                }
            } catch (err) {
                console.error("Profile cache error:", err);
            }

            // Redirect to standalone Face Verification Workspace instead of straight to dashboard
            showStatusModal("success", "Credentials Verified", "Redirecting to Face Verification...", false);
            await setLoginLoading(false);
            
            setTimeout(() => {
                closeModal();
                window.location.href = "face-verification.html";
            }, 1300);
            return;
        }
        showStatusModal("error","Login Failed",loginData.message || "Login failed");
    } catch (err) {
        showStatusModal("error","Network Error","Network or server error. Please try again.");
    }
    await setLoginLoading(false);
});

// ====== REGISTRATION HANDLING ======
forms.register.addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value.trim();
    const facultyId = document.getElementById('reg-faculty').value;
    const departmentId = document.getElementById('reg-department').value;
    const level = document.getElementById('reg-level').value;
    const phone = document.getElementById('reg-phone').value.trim();

    const institutionId = document.getElementById('reg-institution') ? document.getElementById('reg-institution').value : "OAU";
    const userType = document.getElementById('reg-user-type') ? document.getElementById('reg-user-type').value : "student";

    const manualReferral = document.getElementById('reg-referral')?.value.trim() || "";
    const profilePic = document.getElementById('reg-profile-pic')?.files[0] || null;

    const facultyText = facultyId ? document.querySelector(`#reg-faculty option[value="${facultyId}"]`).textContent : "";
    const departmentText = departmentId ? document.querySelector(`#reg-department option[value="${departmentId}"]`).textContent : "";
    const institutionText = institutionId || "OAU";
    const userTypeText = userType ? (document.querySelector(`#reg-user-type option[value="${userType}"]`)?.textContent || userType) : "";

    if (!fullName || !username || !password || !email || !institutionId || !facultyId || !departmentId || !level || !phone || !userType) {
        showStatusModal("error", "Registration Error", "All required fields must be completed.");
        return;
    }

    const referralCode = localStorage.getItem('pendingReferral') || manualReferral || "";

    showConfirmationModal({
        "Full Name": fullName,
        "Username": username,
        "Email": email,
        "Institution": institutionText,
        "Faculty": facultyText,
        "Department": departmentText,
        "Account Type": userTypeText,
        "Level": level,
        "Phone": phone,
        ...(referralCode ? { "Referral ID": referralCode } : {}),
        ...(profilePic ? { "Profile Picture": profilePic.name } : {})
    }, async function proceedReg() {
        closeModal();
        showLoadingModal("Saving Parameters", "Preparing standalone Face Registration environment...");
        await setRegLoading(true);

        const pendingData = {
            fullName, username, password, email, facultyId, departmentId,
            level, phone, institutionId, userType, referralCode
        };

        // If a custom local profile picture exists, convert to Base64 to safely pass across page redirect boundaries
        if (profilePic) {
            const reader = new FileReader();
            reader.onload = function(event) {
                pendingData.profilePicBase64 = event.target.result;
                pendingData.profilePicName = profilePic.name;
                localStorage.setItem('pendingRegistrationData', JSON.stringify(pendingData));
                window.location.href = "face-registration.html";
            };
            reader.readAsDataURL(profilePic);
        } else {
            localStorage.setItem('pendingRegistrationData', JSON.stringify(pendingData));
            window.location.href = "face-registration.html";
        }
    });
});

// ====== Guest Login ======
(function setupGuestLogin() {
  const guestBtn = document.createElement('button');
  guestBtn.type = 'button';
  guestBtn.id = 'guestLoginBtn';
  guestBtn.textContent = 'Continue as Guest';
  guestBtn.className = 'btn-primary';
  guestBtn.style.background = '#fff';
  guestBtn.style.color = 'var(--primary)';
  guestBtn.style.border = '1.5px solid rgba(39,110,241,0.12)';
  guestBtn.style.marginTop = '8px';

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn && loginBtn.parentNode) {
    loginBtn.parentNode.insertBefore(guestBtn, loginBtn.nextSibling);
  }

  guestBtn.addEventListener('click', function () {
    const guestUser = {
      _id: 'guest_' + Date.now(),
      username: 'guest',
      fullname: 'Guest User',
      email: '',
      role: 'guest',
      referralCode: '',
      creditPoints: 0,
      verified: false,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('student_jwt_token', 'guest_token');
    localStorage.setItem('token', 'guest_token');
    localStorage.setItem('studentData', JSON.stringify(guestUser));

    showStatusModal('success', 'Guest Login', 'You are now signed in as a guest.', false);

    setTimeout(() => {
      try { closeModal(); } catch (e) {}
      window.location.href = 'loader';
    }, 1200);
  });
})();

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const platform = btn.classList.contains('google') ? "Google" : "Facebook";
        showStatusModal("success", `${platform} Login`, `Login with ${platform} is coming soon!`, true);
    });
});
