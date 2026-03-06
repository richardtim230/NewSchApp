const API_BASE_URL = "https://goldlincschools.onrender.com";

// ===== Tab Navigation =====
function showTab(tab) {
  document.querySelectorAll('[data-section]').forEach(sec => {
    sec.classList.toggle('hidden', sec.dataset.section !== tab);
  });
  document.querySelectorAll('.tablist button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Load data when tab is shown
  if (tab === 'sessions') loadSessions();
  else if (tab === 'terms') { fillDropdown(`${API_BASE_URL}/api/sessions`, 'termSessionSelect'); loadTerms(); }
  else if (tab === 'classes') { loadClasses(); }
  else if (tab === 'subjects') { fillClassDropdown(); fillTeacherDropdown2(); loadUploadedSubjects(); }
  else if (tab === 'exams') { fillDropdown(`${API_BASE_URL}/api/sessions`, 'examTermSelect'); fillDropdown(`${API_BASE_URL}/api/classes`, 'examClassSelect'); loadExamSchedules(); }
  else if (tab === 'cbt') { fillDropdown(`${API_BASE_URL}/api/classes`, 'cbtClassSelect'); loadCBTs(); }
  else if (tab === 'results') { fillDropdown(`${API_BASE_URL}/api/sessions`, 'resultsSessionSelect'); fillDropdown(`${API_BASE_URL}/api/classes`, 'resultsClassSelect'); loadResults(); }
}

document.querySelectorAll('.tablist button').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ===== Exam Sub-Tab Navigation =====
function showExamTab(tab) {
  document.querySelectorAll('#examTabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.examtab === tab));
  document.querySelectorAll('#examTabContent > div').forEach(sec => sec.classList.toggle('hidden', sec.dataset.examsection !== tab));
  
  if (tab === 'schedule') loadExamSchedules();
  else if (tab === 'mode') { fillExamDropdown(); loadExamModes(); }
}

document.querySelectorAll('#examTabs button').forEach(btn => {
  btn.addEventListener('click', () => showExamTab(btn.dataset.examtab));
});

// ===== Helper Functions =====
async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; } 
    catch { return { ok: res.ok, status: res.status, data: text }; }
  } catch (err) { 
    return { ok: false, error: err }; 
  }
}

function showMessage(elementId, message, isSuccess = true) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="message ${isSuccess ? 'success' : 'error'}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

async function fillDropdown(endpoint, selectId, valueKey = '_id', labelKey = 'name') {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const r = await safeFetch(endpoint);
    if (r.ok && Array.isArray(r.data)) {
      const data = r.data;
      select.innerHTML = '<option value="">-- Select --</option>';
      data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valueKey] || '';
        opt.textContent = item[labelKey] || item.name || item.title || '';
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error filling dropdown:', err);
  }
}

// ===== SESSIONS =====
async function loadSessions() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/sessions`);
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(s => `
        <tr>
          <td>${s.name || ''}</td>
          <td>${s.startDate ? new Date(s.startDate).toLocaleDateString() : ''}</td>
          <td>${s.endDate ? new Date(s.endDate).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editSession('${s._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteSession('${s._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4">No sessions found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
}

window.deleteSession = async function(id) {
  if (!confirm('Delete this session?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/sessions/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('sessionMessage', 'Session deleted successfully!', true);
      loadSessions();
    } else {
      showMessage('sessionMessage', 'Failed to delete session', false);
    }
  } catch (err) {
    showMessage('sessionMessage', 'Error: ' + err.message, false);
  }
};

function editSession(id) {
  const session = null; // Fetch session data if needed
  document.getElementById('sessionForm').dataset.editId = id;
  // Populate form with session data
}

document.getElementById('sessionForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const payload = {
    name: formData.get('name'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate')
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/sessions/${editId}` : `${API_BASE_URL}/api/sessions`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('sessionMessage', editId ? 'Session updated!' : 'Session created!', true);
      this.reset();
      delete this.dataset.editId;
      loadSessions();
    } else {
      showMessage('sessionMessage', 'Failed to save session', false);
    }
  } catch (err) {
    showMessage('sessionMessage', 'Error: ' + err.message, false);
  }
};

// ===== TERMS =====
async function loadTerms() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/terms`);
    const tbody = document.getElementById('termsTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(t => `
        <tr>
          <td>${t.name || ''}</td>
          <td>${t.sessionId && t.sessionId.name ? t.sessionId.name : t.sessionName || ''}</td>
          <td>${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
          <td>${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editTerm('${t._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteTerm('${t._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No terms found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading terms:', err);
  }
}

window.deleteTerm = async function(id) {
  if (!confirm('Delete this term?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/terms/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('termMessage', 'Term deleted successfully!', true);
      loadTerms();
    } else {
      showMessage('termMessage', 'Failed to delete term', false);
    }
  } catch (err) {
    showMessage('termMessage', 'Error: ' + err.message, false);
  }
};

function editTerm(id) {
  document.getElementById('termForm').dataset.editId = id;
}

document.getElementById('termForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const payload = {
    name: formData.get('name'),
    sessionId: formData.get('sessionId'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate')
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/terms/${editId}` : `${API_BASE_URL}/api/terms`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('termMessage', editId ? 'Term updated!' : 'Term created!', true);
      this.reset();
      delete this.dataset.editId;
      loadTerms();
    } else {
      showMessage('termMessage', 'Failed to save term', false);
    }
  } catch (err) {
    showMessage('termMessage', 'Error: ' + err.message, false);
  }
};

// ===== CLASSES =====
async function loadClasses() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/classes`);
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(c => `
        <tr>
          <td>${c.name || ''}</td>
          <td>${c.arms ? (Array.isArray(c.arms) ? c.arms.join(', ') : c.arms) : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editClass('${c._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteClass('${c._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="3">No classes found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading classes:', err);
  }
}

window.deleteClass = async function(id) {
  if (!confirm('Delete this class?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/classes/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('classMessage', 'Class deleted successfully!', true);
      loadClasses();
    } else {
      showMessage('classMessage', 'Failed to delete class', false);
    }
  } catch (err) {
    showMessage('classMessage', 'Error: ' + err.message, false);
  }
};

function editClass(id) {
  document.getElementById('classForm').dataset.editId = id;
}

document.getElementById('classForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const arms = formData.get('arms') ? formData.get('arms').split(',').map(a => a.trim()) : [];
  
  const payload = {
    name: formData.get('name'),
    arms: arms
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/classes/${editId}` : `${API_BASE_URL}/api/classes`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('classMessage', editId ? 'Class updated!' : 'Class created!', true);
      this.reset();
      delete this.dataset.editId;
      loadClasses();
    } else {
      showMessage('classMessage', 'Failed to save class', false);
    }
  } catch (err) {
    showMessage('classMessage', 'Error: ' + err.message, false);
  }
};

// ===== CLASS DROPDOWNS =====
async function fillClassDropdown() {
  await fillDropdown(`${API_BASE_URL}/api/classes`, 'assignClassSelect', '_id', 'name');
}

async function fillTeacherDropdown2() {
  await fillDropdown(`${API_BASE_URL}/api/teachers`, 'assignSubjectTeacherSelect', '_id', 'firstName');
}

// ===== SUBJECTS =====
document.getElementById('assignSubjectForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  
  const payload = {
    classId: formData.get('classId'),
    subjectName: formData.get('subjectName'),
    teacherId: formData.get('teacherId')
  };
  
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('assignSubjectMessage', 'Subject assigned successfully!', true);
      this.reset();
      loadUploadedSubjects();
    } else {
      showMessage('assignSubjectMessage', 'Failed to assign subject', false);
    }
  } catch (err) {
    showMessage('assignSubjectMessage', 'Error: ' + err.message, false);
  }
};

async function loadUploadedSubjects() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/subjects`);
    const tbody = document.getElementById('uploadedSubjectsTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(s => `
        <tr>
          <td>${s.title || s.name || ''}</td>
          <td>${s.class && s.class.name ? s.class.name : (s.className || '')}</td>
          <td>${s.teacher && (s.teacher.firstName || s.teacher.username) ? (s.teacher.firstName || '') + ' ' + (s.teacher.lastName || '') : (s.teacherName || '')}</td>
          <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-view" onclick="viewSubject('${s._id}')">View</button>
              <button class="btn-small btn-delete" onclick="deleteSubjectFromClass('${s._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No subjects found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
  }
}

window.viewSubject = function(id) {
  alert('Subject details for ID: ' + id);
};

window.deleteSubjectFromClass = async function(id) {
  if (!confirm('Delete this subject?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/subjects/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('assignSubjectMessage', 'Subject deleted!', true);
      loadUploadedSubjects();
    } else {
      showMessage('assignSubjectMessage', 'Failed to delete', false);
    }
  } catch (err) {
    showMessage('assignSubjectMessage', 'Error: ' + err.message, false);
  }
};

// ===== EXAM SCHEDULES =====
async function loadExamSchedules() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/exams`);
    const tbody = document.getElementById('examScheduleTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(e => `
        <tr>
          <td>${e.title || ''}</td>
          <td>${e.term && e.term.name ? e.term.name : (e.termName || '')}</td>
          <td>${e.class && e.class.name ? e.class.name : (e.className || '')}</td>
          <td>${e.date ? new Date(e.date).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editExamSchedule('${e._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteExamSchedule('${e._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No exams found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading exam schedules:', err);
  }
}

window.deleteExamSchedule = async function(id) {
  if (!confirm('Delete this exam schedule?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/exams/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('examScheduleMessage', 'Exam schedule deleted!', true);
      loadExamSchedules();
    } else {
      showMessage('examScheduleMessage', 'Failed to delete', false);
    }
  } catch (err) {
    showMessage('examScheduleMessage', 'Error: ' + err.message, false);
  }
};

function editExamSchedule(id) {
  document.getElementById('examScheduleForm').dataset.editId = id;
}

document.getElementById('examScheduleForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const payload = {
    title: formData.get('title'),
    termId: formData.get('termId'),
    classId: formData.get('classId'),
    date: formData.get('date')
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/exams/${editId}` : `${API_BASE_URL}/api/exams`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('examScheduleMessage', editId ? 'Exam updated!' : 'Exam created!', true);
      this.reset();
      delete this.dataset.editId;
      loadExamSchedules();
    } else {
      showMessage('examScheduleMessage', 'Failed to save exam', false);
    }
  } catch (err) {
    showMessage('examScheduleMessage', 'Error: ' + err.message, false);
  }
};

// ===== EXAM MODES =====
async function fillExamDropdown() {
  await fillDropdown(`${API_BASE_URL}/api/exams`, 'modeExamSelect', '_id', 'title');
}

async function loadExamModes() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/exams/modes`);
    const tbody = document.getElementById('examModeTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(m => `
        <tr>
          <td>${m.examId && m.examId.title ? m.examId.title : (m.examTitle || '')}</td>
          <td>${m.mode || ''}</td>
          <td>${m.duration || ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editExamMode('${m._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteExamMode('${m._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4">No modes found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading exam modes:', err);
  }
}

window.deleteExamMode = async function(id) {
  if (!confirm('Delete this exam mode?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/exams/modes/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('examModeMessage', 'Exam mode deleted!', true);
      loadExamModes();
    } else {
      showMessage('examModeMessage', 'Failed to delete', false);
    }
  } catch (err) {
    showMessage('examModeMessage', 'Error: ' + err.message, false);
  }
};

function editExamMode(id) {
  document.getElementById('examModeForm').dataset.editId = id;
}

document.getElementById('examModeForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const payload = {
    examId: formData.get('examId'),
    mode: formData.get('mode'),
    duration: Number(formData.get('duration'))
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/exams/modes/${editId}` : `${API_BASE_URL}/api/exams/modes`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('examModeMessage', editId ? 'Mode updated!' : 'Mode created!', true);
      this.reset();
      delete this.dataset.editId;
      loadExamModes();
    } else {
      showMessage('examModeMessage', 'Failed to save mode', false);
    }
  } catch (err) {
    showMessage('examModeMessage', 'Error: ' + err.message, false);
  }
};

// ===== CBT & MOCKS =====
async function loadCBTs() {
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/cbt`);
    const tbody = document.getElementById('cbtTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(c => `
        <tr>
          <td>${c.title || ''}</td>
          <td>${c.class && c.class.name ? c.class.name : (c.className || '')}</td>
          <td>${c.mode || ''}</td>
          <td>${c.date ? new Date(c.date).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-edit" onclick="editCBT('${c._id}')">Edit</button>
              <button class="btn-small btn-delete" onclick="deleteCBT('${c._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No CBT/Mocks found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading CBTs:', err);
  }
}

window.deleteCBT = async function(id) {
  if (!confirm('Delete this CBT/Mock?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/cbt/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('cbtMessage', 'CBT/Mock deleted!', true);
      loadCBTs();
    } else {
      showMessage('cbtMessage', 'Failed to delete', false);
    }
  } catch (err) {
    showMessage('cbtMessage', 'Error: ' + err.message, false);
  }
};

function editCBT(id) {
  document.getElementById('cbtForm').dataset.editId = id;
}

document.getElementById('cbtForm').onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const editId = this.dataset.editId;
  
  const payload = {
    title: formData.get('title'),
    classId: formData.get('classId'),
    mode: formData.get('mode'),
    date: formData.get('date')
  };
  
  try {
    const url = editId ? `${API_BASE_URL}/api/cbt/${editId}` : `${API_BASE_URL}/api/cbt`;
    const method = editId ? 'PUT' : 'POST';
    
    const r = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (r.ok) {
      showMessage('cbtMessage', editId ? 'CBT updated!' : 'CBT created!', true);
      this.reset();
      delete this.dataset.editId;
      loadCBTs();
    } else {
      showMessage('cbtMessage', 'Failed to save CBT', false);
    }
  } catch (err) {
    showMessage('cbtMessage', 'Error: ' + err.message, false);
  }
};

// ===== RESULTS =====
async function loadResults(filter = {}) {
  try {
    let url = `${API_BASE_URL}/api/results`;
    if (filter.sessionId) url += `?sessionId=${filter.sessionId}`;
    if (filter.classId) url += `${url.includes('?') ? '&' : '?'}classId=${filter.classId}`;
    if (filter.type) url += `${url.includes('?') ? '&' : '?'}type=${filter.type}`;
    
    const r = await safeFetch(url);
    const tbody = document.getElementById('resultsTableBody');
    if (!tbody) return;
    
    if (r.ok && Array.isArray(r.data)) {
      tbody.innerHTML = r.data.map(res => `
        <tr>
          <td>${res.student && res.student.firstname ? res.student.firstname + ' ' + (res.student.surname || '') : (res.studentName || '')}</td>
          <td>${res.class && res.class.name ? res.class.name : (res.className || '')}</td>
          <td>${res.type || ''}</td>
          <td>${res.exam && res.exam.title ? res.exam.title : (res.examName || '')}</td>
          <td>${res.score || ''}</td>
          <td>${res.date ? new Date(res.date).toLocaleDateString() : ''}</td>
          <td>
            <div class="table-actions">
              <button class="btn-small btn-view" onclick="viewResult('${res._id}')">View</button>
              <button class="btn-small btn-delete" onclick="deleteCBTResult('${res._id}', this)">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No results found</td></tr>';
    }
  } catch (err) {
    console.error('Error loading results:', err);
  }
}

document.getElementById('resultsFilterForm').onsubmit = function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const filter = {
    sessionId: formData.get('sessionId'),
    classId: formData.get('classId'),
    type: formData.get('type')
  };
  loadResults(filter);
};

window.viewResult = function(id) {
  alert('Result details for ID: ' + id);
};

window.deleteCBTResult = async function(id) {
  if (!confirm('Delete this result?')) return;
  try {
    const r = await safeFetch(`${API_BASE_URL}/api/results/${id}`, { method: 'DELETE' });
    if (r.ok) {
      showMessage('resultsMessage', 'Result deleted!', true);
      loadResults();
    } else {
      showMessage('resultsMessage', 'Failed to delete', false);
    }
  } catch (err) {
    showMessage('resultsMessage', 'Error: ' + err.message, false);
  }
};

// ===== PUSH CBT RESULTS =====
const pushCBTResultsBtn = document.getElementById('pushCBTResultsBtn');
const pushCBTModal = document.getElementById('pushCBTModal');
const cancelPushCBTModal = document.getElementById('cancelPushCBTModal');
const pushCBTModalForm = document.getElementById('pushCBTModalForm');

if (pushCBTResultsBtn) {
  pushCBTResultsBtn.addEventListener('click', () => {
    fillDropdown(`${API_BASE_URL}/api/sessions`, 'pushCBTSessionSelect');
    pushCBTModal.classList.remove('hidden');
  });
}

if (cancelPushCBTModal) {
  cancelPushCBTModal.addEventListener('click', () => {
    pushCBTModal.classList.add('hidden');
  });
}

document.getElementById('pushCBTSessionSelect')?.addEventListener('change', async (e) => {
  const sessionId = e.target.value;
  if (sessionId) {
    await fillDropdown(`${API_BASE_URL}/api/sessions/${sessionId}/terms`, 'pushCBTTermSelect', '_id', 'name');
  }
});

if (pushCBTModalForm) {
  pushCBTModalForm.onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const payload = {
      scoreField: formData.get('scoreField'),
      sessionId: formData.get('sessionId'),
      termId: formData.get('termId')
    };
    
    try {
      const r = await safeFetch(`${API_BASE_URL}/api/results/push-cbt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (r.ok) {
        document.getElementById('pushCBTResultsMessage').innerHTML = '<div class="message success">✔ CBT results pushed successfully!</div>';
        pushCBTModal.classList.add('hidden');
        loadResults();
      } else {
        document.getElementById('pushCBTResultsMessage').innerHTML = '<div class="message error">✗ Failed to push results</div>';
      }
    } catch (err) {
      document.getElementById('pushCBTResultsMessage').innerHTML = '<div class="message error">✗ Error: ' + err.message + '</div>';
    }
  };
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
});
