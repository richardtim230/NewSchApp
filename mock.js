(function() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        localStorage.setItem('pendingReferral', ref);
    }
})();

// Faculties and Departments (OAU)
const facultyDepartments = {
    "Administration": [
        "Management and Accounting",
        "Public Administration",
        "Local Government and Development Studies",
        "International Relations"
    ],
    "Agriculture": [
        "Agricultural Economics",
        "Animal Science",
        "Crop Production and Protection",
        "Family, Nutrition and Consumer Sciences",
        "Soil Science",
        "Agricultural Extension and Rural Development"
    ],
    "Arts": [
        "African Languages and Literatures",
        "Dramatic Arts",
        "English Language",
        "Foreign Languages",
        "History",
        "Linguistics and African Languages",
        "Music",
        "Philosophy",
        "Religious Studies"
    ],
    "Basic Medical Sciences": [
        "Anatomy and Cell Biology",
        "Human Nutrition and Dietetics",
        "Medical Microbiology and Parasitology",
        "Chemical Pathology",
        "Haematology and Immunology",
        "Morbid Anatomy and Forensic Medicine",
        "Physiology"
    ],
    "Clinical Sciences": [
        "Community Health",
        "Medicine",
        "Nursing Science",
        "Obstetrics, Gynaecology and Perinatology",
        "Paediatrics and Child Health",
        "Psychiatry",
        "Radiology",
        "Surgery"
    ],
    "Dentistry": [
        "Child Dental Health",
        "Oral and Maxillofacial Surgery and Oral Pathology",
        "Preventive and Community Dentistry",
        "Restorative Dentistry"
    ],
    "Education": [
        "Adult Education and Lifelong Learning",
        "Educational Foundations and Counselling",
        "Educational Management",
        "Educational Technology",
        "Fine and Applied Arts Education",
        "Institute of Education",
        "Physical and Health Education",
        "Science and Technology Education",
        "Social Sciences Education"
    ],
    "Environmental Design and Management": [
        "Architecture",
        "Building",
        "Estate Management",
        "Fine and Applied Arts",
        "Quantity Surveying",
        "Urban and Regional Planning"
    ],
    "Law": [
        "Business Law",
        "International Law",
        "Jurisprudence and Private Law",
        "Public Law"
    ],
    "Pharmacy": [
        "Clinical Pharmacy and Pharmacy Administration",
        "Pharmaceutical Chemistry",
        "Pharmaceutical Microbiology",
        "Pharmaceutics",
        "Pharmacognosy",
        "Pharmacology"
    ],
    "Science": [
        "Biochemistry and Molecular Biology",
        "Botany",
        "Chemistry",
        "Computer Science and Engineering",
        "Geology",
        "Mathematics",
        "Microbiology",
        "Physics",
        "Statistics",
        "Zoology"
    ],
    "Social Sciences": [
        "Demography and Social Statistics",
        "Economics",
        "Geography",
        "Political Science",
        "Psychology",
        "Sociology and Anthropology"
    ],
    "Technology": [
        "Agricultural and Environmental Engineering",
        "Chemical Engineering",
        "Civil Engineering",
        "Computer Science and Engineering",
        "Electronic and Electrical Engineering",
        "Food Science and Technology",
        "Materials Science and Engineering",
        "Mechanical Engineering"
    ],
    "Health Sciences": [
        "Medical Rehabilitation",
        "Nursing Science"
    ]
};

// Populate faculties
const facultySelect = document.getElementById('reg-faculty');
const deptSelect = document.getElementById('reg-department');
function populateFaculties() {
    facultySelect.innerHTML = `<option value="">Select Faculty</option>`;
    Object.keys(facultyDepartments).forEach(faculty => {
        const opt = document.createElement("option");
        opt.value = faculty;
        opt.textContent = faculty;
        facultySelect.appendChild(opt);
    });
}
function populateDepartments(faculty) {
    deptSelect.innerHTML = `<option value="">Select Department</option>`;
    if (facultyDepartments[faculty]) {
        facultyDepartments[faculty].forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept;
            opt.textContent = dept;
            deptSelect.appendChild(opt);
        });
        deptSelect.disabled = false;
    } else {
        deptSelect.disabled = true;
    }
}
facultySelect.addEventListener('change', function() {
    populateDepartments(this.value);
});
document.addEventListener('DOMContentLoaded', function() {
    populateFaculties();
    deptSelect.disabled = true;
});

// Tab switching
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

// Password visibility toggle
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

/* UNIVERSAL MODAL SYSTEM */
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


forms.login.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!validateUsername(username) || !password) {
        showStatusModal("error", "Login Error", "Both fields are required!");
        // Hide resend link/modal if visible
        if (document.getElementById('showResendModal')) document.getElementById('showResendModal').style.display = 'none';
        return;
    }

    showLoadingModal("Logging in...", "Please wait while we log you in.");
    await setLoginLoading(true);

    try {
        let loginResponse = await fetch("https://examguide.onrender.com/api/auth/login", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        let loginData = await loginResponse.json();

        await setLoginLoading(false);

        // Handle login failure
        if (!loginResponse.ok) {
            showStatusModal("error", "Login Failed", loginData.message || "Login failed");

            // Show "resend verification" modal link if error is due to non-verified email
            if (
                loginData.message &&
                (
                    loginData.message.toLowerCase().includes("verify your email") ||
                    loginData.message.toLowerCase().includes("email not verified")
                )
            ) {
                // Show the modal trigger link
                const resendLink = document.getElementById('showResendModal');
                if (resendLink) {
                    resendLink.style.display = 'block';
                    resendLink.onclick = function(ev) {
                        ev.preventDefault();
                        openModal(`
                            <div class="modal-title">Resend Verification Email</div>
                            <form id="resendVerifyFormModal" autocomplete="off">
                                <input type="text" id="resendUsernameModal" value="${username}" placeholder="Enter username or email" required style="padding:.6rem; border-radius:7px; border:1.5px solid #d6e0ef; width:80%; margin-bottom:1rem;">
                                <button type="submit" style="padding:.6rem 1.2rem; border-radius:7px; background:var(--primary); color:#fff; border:none; font-weight:600;">Send</button>
                                <span id="resendVerifyMsgModal" style="display:block; margin-top:0.5rem; font-size:0.96rem;"></span>
                            </form>
                        `, true);

                        document.getElementById('resendVerifyFormModal').addEventListener('submit', async function(ev2) {
                            ev2.preventDefault();
                            const usernameOrEmail = document.getElementById('resendUsernameModal').value.trim();
                            const msgSpan = document.getElementById('resendVerifyMsgModal');
                            msgSpan.textContent = 'Sending...';
                            msgSpan.style.color = '';
                            try {
                                const resp = await fetch('https://examguard-jmjv.onrender.com/api/auth/resend-verification', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ usernameOrEmail })
                                });
                                const data = await resp.json();
                                msgSpan.textContent = data.message || 'Check your email inbox!';
                                msgSpan.style.color = resp.ok ? 'green' : 'var(--error)';
                            } catch (err) {
                                msgSpan.textContent = 'Could not send verification email. Please try again.';
                                msgSpan.style.color = 'var(--error)';
                            }
                        });
                    };
                }
            } else {
                // Hide the resend link/modal if not a verification error
                if (document.getElementById('showResendModal')) document.getElementById('showResendModal').style.display = 'none';
            }
            return;
        }

        // Hide resend link/modal on successful login
        if (document.getElementById('showResendModal')) document.getElementById('showResendModal').style.display = 'none';

        // Handle login success
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
                return;
            }
        } catch {
            showStatusModal("success", "Login Successful", "You have been logged in!", false);
            setTimeout(() => { window.location.href = "loader.html"; }, 1200);
        }
    } catch (err) {
        showStatusModal("error", "Network Error", "Network or server error. Please try again.");
        if (document.getElementById('showResendModal')) document.getElementById('showResendModal').style.display = 'none';
    }
    await setLoginLoading(false);
});
// REGISTRATION HANDLING (with confirmation modal, no auto-login)
forms.register.addEventListener('submit', async function(e) {
    e.preventDefault();
    // Collect all registration details
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value.trim();
    const faculty = document.getElementById('reg-faculty').value.trim();
    const department = document.getElementById('reg-department').value.trim();
    const level = document.getElementById('reg-level').value;
    const phone = document.getElementById('reg-phone').value.trim();

    if (!fullName || !username || !password || !email || !faculty || !department || !level || !phone) {
        showStatusModal("error", "Registration Error", "All fields are required!");
        return;
    }

    // Get referral code from localStorage if user landed via referral link
    const referralCode = localStorage.getItem('pendingReferral') || "";

    // Show confirmation modal
    showConfirmationModal({
        "Full Name": fullName,
        "Username": username,
        "Email": email,
        "Faculty": faculty,
        "Department": department,
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
                    faculty,
                    department,
                    level,
                    phone,
                    ref: referralCode // Pass referral code if present
                })
            });
            let registerData = await registerResponse.json();
            await setRegLoading(false);
            if (registerResponse.ok) {
                // DO NOT log in the user automatically!
                localStorage.removeItem('pendingReferral');
                showStatusModal("success", "Registration Successful", "Registered successfully! Please check your email for a verification link before logging in.", false);
            } else {
                showStatusModal("error", "Registration Failed", registerData.message || "Registration failed");
            }
        } catch (err) {
            showStatusModal("error", "Network Error", "Network or server error. Please try again.");
        }
    }, function cancelReg() { });
});

// Social Login/Register (Simulated)
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        showStatusModal("error","Feature Unavailable","Social login/registration is yet to be implemented.");
    });
});

// Forgot Password (confirmation modal)
document.getElementById('forgotPassword').addEventListener('click', async function(e) {
    e.preventDefault();
    let username = prompt("Enter your username for password reset:");
    if (username === null) return;
    username = username.trim();
    if (!validateUsername(username)) {
        showStatusModal("error","Password Reset Error","Username cannot be empty.");
        return;
    }
    let newPass = prompt("Enter your new password:");
    if (!newPass) {
        showStatusModal("error","Password Reset Error","Password cannot be empty.");
        return;
    }
    // Confirm details before proceeding
    showConfirmationModal({
        "Username": username,
        "New Password": newPass.replace(/./g,"*") // Mask password
    }, async function proceedReset(){
        showLoadingModal("Resetting Password...","Please wait while we reset your password.");
        await setLoginLoading(true);
        try {
            let resp = await fetch("https://examguide.onrender.com/api/auth/reset", {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password: newPass})
            });
            let data = await resp.json();
            if (resp.ok) {
                showStatusModal("success","Password Reset","Password reset successful!");
            } else {
                showStatusModal("error","Password Reset Failed",data.message || "Password reset failed");
            }
        } catch (err) {
            showStatusModal("error","Network Error","Network or server error. Please try again.");
        }
        await setLoginLoading(false);
    }, function cancelReset(){});
});

// Responsive: scroll to top of form on mobile when switching
function onTabSwitchScroll() {
    if (window.innerWidth < 700) {
        setTimeout(() => window.scrollTo({top: 0, behavior: "smooth"}), 100);
    }
}
tabBtns.forEach(btn => btn.addEventListener('click', onTabSwitchScroll));

