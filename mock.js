
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

// Populate faculties and departments
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
    setLoginLoading(true);
    try {
        const res = await fetch('https://yourbackend.com/api/auth/login', { // replace with your backend URL
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        setLoginLoading(false);
        if (res.ok) {
            // Successful login, store token as needed (e.g. localStorage/sessionStorage)
            // For security, do NOT store token if user is not verified
            if (data.token) {
                // You may use localStorage.setItem('auth_token', data.token);
                showStatusModal('success', 'Login Successful', data.message);
                // Redirect or update UI as needed
            } else {
                showStatusModal('error', 'Login Failed', 'No token received.');
            }
        } else {
            if (data.message && data.message.includes('Email not verified')) {
                showStatusModal('error', 'Email Not Verified', 'Please check your email and click the verification link.');
            } else {
                showStatusModal('error', 'Login Failed', data.message || 'Login failed.');
            }
        }
    } catch (err) {
        setLoginLoading(false);
        showStatusModal('error', 'Network Error', 'Could not reach the server.');
    }
});

// REGISTRATION HANDLING
forms.register.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        fullname: document.getElementById('reg-fullname').value,
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        email: document.getElementById('reg-email').value,
        faculty: document.getElementById('reg-faculty').value,
        department: document.getElementById('reg-department').value,
        level: document.getElementById('reg-level').value,
        phone: document.getElementById('reg-phone').value
        // add referral, profilePic etc if needed
    };
    setRegLoading(true);
    try {
        const res = await fetch('https://yourbackend.com/api/auth/register', { // replace with your backend URL
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setRegLoading(false);
        if (res.ok) {
            showStatusModal('success', 'Registration Successful', "Registration complete! Please check your email to verify your account before logging in.");
            // DO NOT log the user in automatically or store any token here.
        } else {
            showStatusModal('error', 'Registration Failed', data.message || data.error || 'Registration failed.');
        }
    } catch (err) {
        setRegLoading(false);
        showStatusModal('error', 'Network Error', 'Could not reach the server.');
    }
});
