
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

// Helper: show a loading spinner inside a <select>
function showSelectSpinner(selectElem, text = "Loading...") {
    selectElem.innerHTML = `<option value="" disabled selected>${text} &#x21bb;</option>`;
    selectElem.disabled = true;
}

// Fetch faculties on page load
async function fetchFaculties() {
    showSelectSpinner(facultySelect, "Loading faculties");
    facultyList = [];
    try {
        const res = await fetch('https://examguard-jmvj.onrender.com/api/faculties');
        facultyList = await res.json();
        facultySelect.innerHTML = `<option value="">Select Faculty</option>`;
        facultyList.forEach(fac => {
            const opt = document.createElement("option");
            opt.value = fac._id; // use ObjectId
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
        const res = await fetch(`https://examguard-jmvj.onrender.com/api/departments?faculty=${facultyId}`);
        departmentList = await res.json();
        deptSelect.innerHTML = `<option value="">Select Department</option>`;
        departmentList.forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept._id; // use ObjectId
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

document.addEventListener('DOMContentLoaded', function() {
    fetchFaculties();
    showSelectSpinner(deptSelect, "Select faculty first");
    deptSelect.disabled = true;
});

// ====== Tab switching ======
const tabBtns = document.querySelectorAll('.tab-btn');
const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm')
};
const messageBox = document.getElementById('messageBox');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        for (const k in forms) forms[k].classList.remove('active');
        forms[btn.dataset.tab].classList.add('active');
        messageBox.innerHTML = '';
    });
});

// ====== Password visibility toggle ======
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

/* ====== UNIVERSAL MODAL SYSTEM ====== */
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

// Helper: Validate username
function validateUsername(username) {
    return username.trim().length > 0;
}

// Spinner helpers
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
    // LOGIN HANDLING
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
                localStorage.setItem('token', loginData.token);
                // Get user role and redirect accordingly
                try {
                    let profileResp = await fetch("https://examguide.onrender.com/api/auth/me", {
                        headers: { 'Authorization': 'Bearer ' + loginData.token }
                    });
                    let profileData = await profileResp.json();
                    if (profileResp.ok && profileData.user) {
                        const role = profileData.user.role;
                        let roleMsg = "Welcome!";
                        switch (role) {
                            case 'superadmin': roleMsg = "Welcome, Superadmin!"; break;
                            case 'admin': roleMsg = "Welcome, Admin!"; break;
                            case 'uploader': roleMsg = "Welcome, Uploader!"; break;
                            case 'pq-uploader': roleMsg = "Welcome, PQ-Uploader!"; break;
                            case 'blogger': roleMsg = "Welcome, Blogger!"; break;
                            default: roleMsg = "Welcome, Student!";
                        }
                        showStatusModal("success", "Login Successful", roleMsg, false);
                        setTimeout(() => { window.location.href = (role === 'superadmin') ? "supaadmin.html" : "loader.html"; }, 1300);
                        await setLoginLoading(false);
                        return;
                    }
                } catch {
                    showStatusModal("success", "Login Successful", "You have been logged in!", false);
                    setTimeout(() => { window.location.href = "loader.html"; }, 1200);
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


// ====== REGISTRATION HANDLING (with confirmation modal) ======
forms.register.addEventListener('submit', async function(e) {
    e.preventDefault();
    // Collect all registration details
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value.trim();
    const facultyId = document.getElementById('reg-faculty').value; // ObjectId
    const departmentId = document.getElementById('reg-department').value; // ObjectId
    const level = document.getElementById('reg-level').value;
    const phone = document.getElementById('reg-phone').value.trim();

    // Look up the display name for faculty and department (for confirmation modal)
    const facultyText = facultyId
        ? document.querySelector('#reg-faculty option[value="' + facultyId + '"]').textContent
        : "";
    const departmentText = departmentId
        ? document.querySelector('#reg-department option[value="' + departmentId + '"]').textContent
        : "";

    if (!fullName || !username || !password || !email || !facultyId || !departmentId || !level || !phone) {
        showStatusModal("error", "Registration Error", "All fields are required!");
        return;
    }

    // Get referral code from localStorage if user landed via referral link
    const referralCode = localStorage.getItem('pendingReferral') || "";

    // Show confirmation modal with display names
    showConfirmationModal({
        "Full Name": fullName,
        "Username": username,
        "Email": email,
        "Faculty": facultyText,
        "Department": departmentText,
        "Level": level,
        "Phone": phone,
        ...(referralCode ? { "Referral Code": referralCode } : {})
}, async function proceedReg() {
        showLoadingModal("Registering...", "Please wait while we create your account.");
        await setRegLoading(true);
        try {
            let registerResponse = await fetch("https://examguide.onrender.com/api/auth/register", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    email,
                    fullname: fullName,
                    faculty: facultyId,   // Send as ObjectId
                    department: departmentId, // Send as ObjectId
                    level,
                    phone,
                    ref: referralCode // Pass referral code if present
                })
            });
            let result = await registerResponse.json();
            await setRegLoading(false);

            if (registerResponse.ok) {
                // Show success modal with registration message
                showStatusModal("success", "Registration Successful", result.message || "Account created! Redirecting to login...", false);
                setTimeout(() => {
                    forms.login.classList.add('active');
                    forms.register.classList.remove('active');
                    messageBox.innerHTML = '<div class="message success">Your account was created successfully. Please check your email for a verification link before logging in.</div>';
                }, 1800);
            } else {
                // Show failed modal with error message
                showStatusModal("error", "Registration Failed", result.message || "Could not register. Try again.");
            }
        } catch (err) {
            await setRegLoading(false);
            showStatusModal("error", "Network Error", "Could not connect to server.");
        }
    });
});
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const platform = btn.classList.contains('google') ? "Google" : "Facebook";
        showStatusModal(
            "success",
            `${platform} Login`,
            `Login with ${platform} is coming soon!`,
            true
        );
    });
});

