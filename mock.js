/* Full mock.js — replace your existing mock.js with this file. Only institution logic changed:
   the file now always sends institution = "OAU" (from hidden input) when registering.
*/
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
        const res = await fetch('https://examguide.onrender.com/api/faculties');
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
        const res = await fetch(`https://examguide.onrender.com/api/departments?faculty=${facultyId}`);
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

// ====== Tab switching ======
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
            // Save token using both keys
            localStorage.setItem('student_jwt_token', loginData.token);
            localStorage.setItem('token', loginData.token);

            // Optionally save user data if returned
            if (loginData.user) {
                localStorage.setItem('studentData', JSON.stringify(loginData.user));
            }

            // Get user role and redirect accordingly
            try {
                let profileResp = await fetch("https://examguide.onrender.com/api/auth/me", {
                    headers: {
                        'Authorization': 'Bearer ' + loginData.token
                    }
                });

                let profileData = await profileResp.json();

                if (profileResp.ok && profileData.user) {
                    const user = profileData.user;

                    // Save full profile for later use
                    localStorage.setItem('studentData', JSON.stringify(user));

                    const role = user.role;
                    let roleMsg = "Welcome!";

                    switch (role) {
                        case 'superadmin':
                            roleMsg = "Welcome, Superadmin!";
                            break;
                        case 'admin':
                            roleMsg = "Welcome, Admin!";
                            break;
                          case 'tutor':
                            roleMsg = "Welcome, User!";
                            break;
                        case 'uploader':
                            roleMsg = "Welcome, Uploader!";
                            break;
                        case 'pq-uploader':
                            roleMsg = "Welcome, PQ-Uploader!";
                            break;
                        case 'blogger':
                            roleMsg = "Welcome, Blogger!";
                            break;
                        default:
                            roleMsg = "Welcome, Student!";
                    }

                    showStatusModal(
                        "success",
                        "Login Successful",
                        roleMsg,
                        false
                    );

                    setTimeout(() => {
                        window.location.href =
                            role === 'superadmin'
                                ? "supaadmin.html"
                                : "loader";
                    }, 1300);

                    await setLoginLoading(false);
                    return;
                }
            } catch (err) {
                console.error(err);

                showStatusModal(
                    "success",
                    "Login Successful",
                    "You have been logged in!",
                    false
                );

                setTimeout(() => {
                    window.location.href = "loader";
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
let faceRegistrationData = {
    stream: null,
    detection: null,
    canvasSnapshot: null,
    faceDescriptor: null
};

async function initFaceAPI() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'),
            faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
        ]);
        console.log('✅ Face API models loaded');
        return true;
    } catch (err) {
        console.error('Face API load error:', err);
        return false;
    }
}

async function startFaceCamera() {
    try {
        const video = document.getElementById('faceRegVideo');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: 640,
                height: 480
            },
            audio: false
        });
        
        video.srcObject = stream;
        faceRegistrationData.stream = stream;
        
        await video.play();
        startFaceDetection(video);
    } catch (err) {
        console.error('Camera access error:', err);
        showStatusModal('error', 'Camera Error', 'Could not access your camera. Please check permissions.');
    }
}

function stopFaceCamera() {
    if (faceRegistrationData.stream) {
        faceRegistrationData.stream.getTracks().forEach(track => track.stop());
        faceRegistrationData.stream = null;
    }
}

async function startFaceDetection(video) {
    const statusEl = document.getElementById('faceDetectionStatus');
    const captureBtn = document.getElementById('captureFaceBtn');
    
    const detectLoop = setInterval(async () => {
        try {
            const detections = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();
            
            if (detections) {
                faceRegistrationData.detection = detections;
                statusEl.innerHTML = '<i class="bi bi-check-circle" style="color: var(--success);"></i> Face detected!';
                statusEl.style.color = '#27ae60';
                captureBtn.disabled = false;
            } else {
                statusEl.innerHTML = '<i class="bi bi-hourglass-split"></i> Detecting face...';
                statusEl.style.color = '#666';
                captureBtn.disabled = true;
            }
        } catch (err) {
            console.error('Detection error:', err);
        }
    }, 500);
    
    // Store interval ID for cleanup
    window.faceDetectionInterval = detectLoop;
}

function captureFaceSnapshot() {
    const video = document.getElementById('faceRegVideo');
    const canvas = document.getElementById('capturedFaceCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    faceRegistrationData.canvasSnapshot = canvas.toDataURL('image/jpeg');
    
    if (faceRegistrationData.detection) {
        faceRegistrationData.faceDescriptor = faceRegistrationData.detection.descriptor;
    }
}

function openFaceRegistration() {
    const backdrop = document.getElementById('faceRegistrationBackdrop');
    backdrop.style.display = 'flex';
    
    document.getElementById('startFaceCapture').onclick = async () => {
        document.getElementById('faceRegStep1').style.display = 'none';
        document.getElementById('faceRegStep2').style.display = 'block';
        await startFaceCamera();
    };
    
    document.getElementById('skipFaceBtn').onclick = () => {
        closeFaceRegistration();
    };
    
    document.getElementById('captureFaceBtn').onclick = () => {
        if (window.faceDetectionInterval) {
            clearInterval(window.faceDetectionInterval);
        }
        stopFaceCamera();
        captureFaceSnapshot();
        
        document.getElementById('faceRegStep2').style.display = 'none';
        document.getElementById('faceRegStep3').style.display = 'block';
    };
    
    document.getElementById('cancelFaceCapture').onclick = () => {
        if (window.faceDetectionInterval) {
            clearInterval(window.faceDetectionInterval);
        }
        stopFaceCamera();
        document.getElementById('faceRegStep2').style.display = 'none';
        document.getElementById('faceRegStep1').style.display = 'block';
    };
    
    document.getElementById('retakeFaceBtn').onclick = () => {
        document.getElementById('faceRegStep3').style.display = 'none';
        document.getElementById('faceRegStep2').style.display = 'block';
        startFaceCamera();
    };
    
    document.getElementById('confirmFaceBtn').onclick = () => {
        closeFaceRegistration();
        proceedWithRegistration();
    };
    
    document.getElementById('closeFaceModal').onclick = () => {
        closeFaceRegistration();
    };
}

function closeFaceRegistration() {
    if (window.faceDetectionInterval) {
        clearInterval(window.faceDetectionInterval);
    }
    stopFaceCamera();
    
    document.getElementById('faceRegistrationBackdrop').style.display = 'none';
    document.getElementById('faceRegStep1').style.display = 'block';
    document.getElementById('faceRegStep2').style.display = 'none';
    document.getElementById('faceRegStep3').style.display = 'none';
    document.getElementById('faceRegStep4').style.display = 'none';
}

// Load face API on page load
document.addEventListener('DOMContentLoaded', function() {
    initFaceAPI();
});
// ====== REGISTRATION HANDLING (with confirmation modal) ======
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
        ? document.querySelector(`#reg-faculty option[value="${facultyId}"]`).textContent
        : "";

    const departmentText = departmentId
        ? document.querySelector(`#reg-department option[value="${departmentId}"]`).textContent
        : "";

    const institutionText = institutionId || "OAU";

    const userTypeText = userType
        ? (document.querySelector(`#reg-user-type option[value="${userType}"]`)?.textContent || userType)
        : "";

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
        
        openFaceRegistration();
        
        window.pendingRegistrationData = {
            fullName,
            username,
            password,
            email,
            facultyId,
            departmentId,
            level,
            phone,
            institutionId,
            userType,
            referralCode,
            profilePic,
            faceDescriptor: null,
            faceImage: null
        };
    });
});

async function proceedWithRegistration() {
    const data = window.pendingRegistrationData;
    
    if (!data) return;

    document.getElementById('faceRegStep1').style.display = 'none';
    document.getElementById('faceRegStep2').style.display = 'none';
    document.getElementById('faceRegStep3').style.display = 'none';
    document.getElementById('faceRegStep4').style.display = 'block';

    await setRegLoading(true);

    try {
        const formData = new FormData();

        formData.append("fullname", data.fullName);
        formData.append("username", data.username);
        formData.append("password", data.password);
        formData.append("email", data.email);
        formData.append("faculty", data.facultyId);
        formData.append("department", data.departmentId);
        formData.append("level", data.level);
        formData.append("phone", data.phone);

        if (data.institutionId) {
            formData.append("institution", data.institutionId);
        }

        if (data.userType) {
            formData.append("userType", data.userType);
        }

        if (data.referralCode) {
            formData.append("ref", data.referralCode);
        }

        if (data.profilePic) {
            formData.append("profilePic", data.profilePic);
        }

        if (faceRegistrationData.faceDescriptor) {
            formData.append("faceDescriptor", JSON.stringify(Array.from(faceRegistrationData.faceDescriptor)));
        }

        if (faceRegistrationData.canvasSnapshot) {
            const blob = await (await fetch(faceRegistrationData.canvasSnapshot)).blob();
            formData.append("faceImage", blob, "face.jpg");
        }

        const registerResponse = await fetch("https://examguide.onrender.com/api/auth/register", {
            method: "POST",
            body: formData
        });

        const result = await registerResponse.json();

        await setRegLoading(false);

        if (registerResponse.ok) {
            localStorage.removeItem("pendingReferral");
            window.pendingRegistrationData = null;
            faceRegistrationData = {
                stream: null,
                detection: null,
                canvasSnapshot: null,
                faceDescriptor: null
            };

            showStatusModal("success", "Registration Successful", result.message || "Account created successfully. Please log in.", false);

            setTimeout(() => {
                closeModal();
                closeFaceRegistration();
                
                forms.login.classList.add('active');
                forms.register.classList.remove('active');
                document.querySelector('[data-tab="login"]').click();
                
                document.getElementById('registerForm').reset();
            }, 1800);
        } else {
            showStatusModal("error", "Registration Failed", result.message || "Could not register.");
        }
    } catch (err) {
        console.error("Registration error:", err);
        await setRegLoading(false);
        showStatusModal("error", "Network Error", "Could not connect to server. Please try again.");
    }
}        


/* guest login, social buttons and other code remain unchanged */
// ====== Guest login (no backend) ======
// Appends a "Continue as Guest" button to the login form and simulates a login.
(function setupGuestLogin() {
  // Create button
  const guestBtn = document.createElement('button');
  guestBtn.type = 'button';
  guestBtn.id = 'guestLoginBtn';
  guestBtn.textContent = 'Continue as Guest';
  // Use existing primary styles but make it visually distinct
  guestBtn.className = 'btn-primary';
  guestBtn.style.background = '#fff';
  guestBtn.style.color = 'var(--primary)';
  guestBtn.style.border = '1.5px solid rgba(39,110,241,0.12)';
  guestBtn.style.marginTop = '8px';

  // Insert after the login button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn && loginBtn.parentNode) {
    loginBtn.parentNode.insertBefore(guestBtn, loginBtn.nextSibling);
  }

  // Handler: set a guest session in localStorage and redirect
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

    // Save tokens/data locally (no backend)
    localStorage.setItem('student_jwt_token', 'guest_token');
    localStorage.setItem('token', 'guest_token');
    localStorage.setItem('studentData', JSON.stringify(guestUser));

    // Inform the user and redirect to dashboard
    showStatusModal('success', 'Guest Login', 'You are now signed in as a guest. Some features may be limited.', false);

    // Short delay so user sees the modal, then navigate
    setTimeout(() => {
      // close modal if present
      try { closeModal(); } catch (e) {}
      // redirect to student dashboard or desired page
      window.location.href = 'loader';
    }, 1200);
  });
})();
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
