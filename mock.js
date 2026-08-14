// ====== HELPER: ROBUST URL PARAMETER EXTRACTION ======
function getQueryParam(name) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has(name)) return urlParams.get(name);

        // Fallback: Check hash or query parameters inside hash
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const hashParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
            if (hashParams.has(name)) return hashParams.get(name);
        }

        // Fallback: Regex extraction directly from window.location.href
        const regex = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
        const match = regex.exec(window.location.href);
        return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
        console.warn('Error reading URL parameters:', e);
        return null;
    }
}

// Immediate capture of referral code from URL into localStorage
(function() {
    const ref = getQueryParam('ref');
    if (ref) {
        try {
            localStorage.setItem('pendingReferral', ref);
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
    }
})();

// ====== REDIRECT HELPER ======
function handleAuthSuccess(defaultUrl = "loader") {
    const redirectTo = getQueryParam("redirect") || sessionStorage.getItem("authRedirect");
    sessionStorage.removeItem("authRedirect");

    if (redirectTo) {
        window.location.href = decodeURIComponent(redirectTo);
    } else {
        window.location.href = defaultUrl;
    }
}

const facultySelect = document.getElementById('reg-faculty');
const deptSelect = document.getElementById('reg-department');
let facultyList = [];
let departmentList = [];

// Helper: show a loading spinner inside a <select>
function showSelectSpinner(selectElem, text = "Loading...") {
    if (!selectElem) return;
    selectElem.innerHTML = `<option value="" disabled selected>${text} &#x21bb;</option>`;
    selectElem.disabled = true;
}

// Fetch faculties on page load
async function fetchFaculties() {
    if (!facultySelect) return;
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
    if (!deptSelect) return;
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

if (facultySelect) {
    facultySelect.addEventListener('change', function() {
        fetchDepartments(this.value);
    });
}

// ====== Tab switching and DOM initialization ======
const tabBtns = document.querySelectorAll('.tab-btn');
const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm')
};
const messageBox = document.getElementById('messageBox');

function initApp() {
    fetchFaculties();
    if (deptSelect) {
        showSelectSpinner(deptSelect, "Select faculty first");
        deptSelect.disabled = true;
    }

    const urlRef = getQueryParam('ref');
    const tabParam = getQueryParam('tab');

    // Store in localStorage if URL contains ref
    if (urlRef) {
        try {
            localStorage.setItem('pendingReferral', urlRef);
        } catch (e) {}
    }

    // Auto-fill and lock referral input
    try {
        const refInput = document.getElementById('reg-referral');
        const pendingRef = urlRef || localStorage.getItem('pendingReferral');

        if (refInput && pendingRef) {
            refInput.value = pendingRef;
            if (urlRef) {
                refInput.readOnly = true;
                refInput.setAttribute('readonly', 'readonly');
                refInput.setAttribute('title', 'Referral code locked from link');
                refInput.classList.add('locked-referral');
            } else {
                refInput.readOnly = false;
                refInput.removeAttribute('readonly');
                refInput.removeAttribute('title');
                refInput.classList.remove('locked-referral');
            }
        }
    } catch (e) {
        console.warn('Could not auto-fill referral input:', e);
    }

    // Switch tab to 'register' if tab=register OR if referral code present in URL
    if (tabParam === 'register' || urlRef) {
        tabBtns.forEach(b => b.classList.remove('active'));
        if (forms.login) forms.login.classList.remove('active');
        if (forms.register) forms.register.classList.add('active');
        tabBtns.forEach(btn => { if (btn.dataset.tab === 'register') btn.classList.add('active'); });
        if (messageBox) messageBox.innerHTML = '';
    } else if (tabParam === 'login') {
        tabBtns.forEach(b => b.classList.remove('active'));
        if (forms.register) forms.register.classList.remove('active');
        if (forms.login) forms.login.classList.add('active');
        tabBtns.forEach(btn => { if (btn.dataset.tab === 'login') btn.classList.add('active'); });
        if (messageBox) messageBox.innerHTML = '';
    }
}

// Failsafe execution check for DOM loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        for (const k in forms) {
            if (forms[k]) forms[k].classList.remove('active');
        }
        if (forms[btn.dataset.tab]) forms[btn.dataset.tab].classList.add('active');
        if (messageBox) messageBox.innerHTML = '';

        if (btn.dataset.tab === 'register' && forms.register) {
            forms.register.style.display = '';
        }
    });
});

// ====== Password visibility toggle ======
document.querySelectorAll('.toggle-visibility').forEach(span => {
    span.addEventListener('click', function() {
        const input = document.getElementById(this.dataset.target);
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = '<i class="bi bi-eye-slash"></i>';
            } else {
                input.type = 'password';
                this.innerHTML = '<i class="bi bi-eye"></i>';
            }
        }
    });
});

/* ====== UNIVERSAL MODAL SYSTEM ====== */
const modalBackdrop = document.getElementById('modalBackdrop');
const customModal = document.getElementById('customModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal(contentHtml, allowClose = false) {
    if (!modalContent || !modalBackdrop) return;
    modalContent.innerHTML = contentHtml;
    modalBackdrop.classList.add('show');
    if (closeModalBtn) {
        closeModalBtn.style.display = allowClose ? 'block' : 'none';
    }
}
function closeModal() {
    if (modalBackdrop) modalBackdrop.classList.remove('show');
    if (modalContent) modalContent.innerHTML = '';
}
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (modalBackdrop) {
    modalBackdrop.addEventListener('click', function(e){
        if(e.target === modalBackdrop && closeModalBtn && closeModalBtn.style.display === 'block') closeModal();
    });
}

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

// Helper: Validate username
function validateUsername(username) {
    return username.trim().length > 0;
}

// Spinner helpers
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');
async function setLoginLoading(isLoading) {
    if (!loginBtn) return;
    if (isLoading) {
        loginBtn.setAttribute("disabled", "disabled");
        if (loginSpinner) loginSpinner.style.display = "inline-block";
        if (loginBtnText) loginBtnText.style.display = "none";
    } else {
        loginBtn.removeAttribute("disabled");
        if (loginSpinner) loginSpinner.style.display = "none";
        if (loginBtnText) loginBtnText.style.display = "inline";
    }
}
const registerBtn = document.getElementById('registerBtn');
const registerBtnText = document.getElementById('registerBtnText');
const registerSpinner = document.getElementById('registerSpinner');
async function setRegLoading(isLoading) {
    if (!registerBtn) return;
    if (isLoading) {
        registerBtn.setAttribute("disabled", "disabled");
        if (registerSpinner) registerSpinner.style.display = "inline-block";
        if (registerBtnText) registerBtnText.style.display = "none";
    } else {
        registerBtn.removeAttribute("disabled");
        if (registerSpinner) registerSpinner.style.display = "none";
        if (registerBtnText) registerBtnText.style.display = "inline";
    }
}

// ====== LOGIN HANDLING ======
if (forms.login) {
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
                        headers: {
                            'Authorization': 'Bearer ' + loginData.token
                        }
                    });

                    let profileData = await profileResp.json();

                    if (profileResp.ok && profileData.user) {
                        const user = profileData.user;
                        localStorage.setItem('studentData', JSON.stringify(user));

                        const role = user.role;
                        let roleMsg = "Welcome!";

                        switch (role) {
                            case 'superadmin': roleMsg = "Welcome, Superadmin!"; break;
                            case 'admin': roleMsg = "Welcome, Admin!"; break;
                            case 'tutor': roleMsg = "Welcome, User!"; break;
                            case 'uploader': roleMsg = "Welcome, Uploader!"; break;
                            case 'pq-uploader': roleMsg = "Welcome, PQ-Uploader!"; break;
                            case 'blogger': roleMsg = "Welcome, Blogger!"; break;
                            default: roleMsg = "Welcome, Student!";
                        }

                        showStatusModal("success", "Login Successful", roleMsg, false);

                        setTimeout(() => {
                            const defaultTarget = role === 'superadmin' ? "supaadmin.html" : "s-dashboard";
                            handleAuthSuccess(defaultTarget);
                        }, 1300);

                        await setLoginLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error(err);
                    showStatusModal("success", "Login Successful", "You have been logged in!", false);
                    setTimeout(() => {
                        handleAuthSuccess("s-dashboard");
                    }, 1200);
                }

                await setLoginLoading(false);
                return;
            }
            showStatusModal("error","Login Failed",loginData.message || "Login failed");
        } catch (err) {
            showStatusModal("error","Network Error","Network or server error. Please try again.");
        }
        await setLoginLoading(false);
    });
}

// ====== REGISTRATION HANDLING (with confirmation modal) ======
if (forms.register) {
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

        const facultyText = facultyId
            ? document.querySelector(`#reg-faculty option[value="${facultyId}"]`)?.textContent || ""
            : "";

        const departmentText = departmentId
            ? document.querySelector(`#reg-department option[value="${departmentId}"]`)?.textContent || ""
            : "";

        const institutionText = institutionId || "OAU";

        const userTypeText = userType
            ? (document.querySelector(`#reg-user-type option[value="${userType}"]`)?.textContent || userType)
            : "";

        if (
            !fullName ||
            !username ||
            !password ||
            !email ||
            !institutionId ||
            !facultyId ||
            !departmentId ||
            !level ||
            !phone ||
            !userType
        ) {
            showStatusModal("error", "Registration Error", "All required fields must be completed.");
            return;
        }

        const urlRef = getQueryParam('ref');
        const referralCode = urlRef || localStorage.getItem('pendingReferral') || manualReferral || "";

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

            showLoadingModal("Registering...", "Please wait while we create your account.");
            await setRegLoading(true);

            try {
                const formData = new FormData();
                formData.append("fullname", fullName);
                formData.append("username", username);
                formData.append("password", password);
                formData.append("email", email);
                formData.append("faculty", facultyId);
                formData.append("department", departmentId);
                formData.append("level", level);
                formData.append("phone", phone);

                if (institutionId) formData.append("institution", institutionId);
                if (userType) formData.append("userType", userType);
                if (referralCode) formData.append("ref", referralCode);
                if (profilePic) formData.append("profilePic", profilePic);

                const registerResponse = await fetch("https://examguide.onrender.com/api/auth/register", {
                    method: "POST",
                    body: formData
                });

                const result = await registerResponse.json();
                await setRegLoading(false);

                if (registerResponse.ok) {
                    localStorage.removeItem("pendingReferral");
                    showStatusModal("success", "Registration Successful", result.message || "Account created successfully.", false);

                    setTimeout(() => {
                        closeModal();
                        if (forms.login && forms.register) {
                            forms.login.classList.add('active');
                            forms.register.classList.remove('active');
                        }
                        const loginTabBtn = document.querySelector('[data-tab="login"]');
                        if (loginTabBtn) loginTabBtn.click();
                    }, 1800);
                } else {
                    showStatusModal("error", "Registration Failed", result.message || "Could not register.");
                }
            } catch (err) {
                console.error(err);
                await setRegLoading(false);
                showStatusModal("error", "Network Error", "Could not connect to server.");
            }
        });
    });
}

// ====== Guest login ======
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

    const loginBtnElem = document.getElementById('loginBtn');
    if (loginBtnElem && loginBtnElem.parentNode) {
        loginBtnElem.parentNode.insertBefore(guestBtn, loginBtnElem.nextSibling);
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

        showStatusModal('success', 'Guest Login', 'You are now signed in as a guest. Some features may be limited.', false);

        setTimeout(() => {
            try { closeModal(); } catch (e) {}
            handleAuthSuccess('loader');
        }, 1200);
    });
})();

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const platform = btn.classList.contains('google') ? "Google" : "Facebook";
        showStatusModal("success", `${platform} Login`, `Login with ${platform} is coming soon!`, true);
    });
});

// --- PWA Detection & Configuration ---
const isPWA = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
if (isPWA) {
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.classList.add("pwa-mobile");
}
