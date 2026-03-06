const API_BASE_URL = "https://goldlincschools.onrender.com";

// DOM Elements
const sidebar = document.getElementById('academicsSidebar');
const mainContent = document.getElementById('mainContent');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const pushCBTModal = document.getElementById('pushCBTModal');
const pushCBTResultsBtn = document.getElementById('pushCBTResultsBtn');
const cancelPushCBTModal = document.getElementById('cancelPushCBTModal');
const pushCBTModalForm = document.getElementById('pushCBTModalForm');
const pushCBTModalFeedback = document.getElementById('pushCBTModalFeedback');

// ===== TAB NAVIGATION =====
function showTab(tab) {
  // Hide all tab sections
  document.querySelectorAll('[data-section]').forEach(sec => {
    sec.classList.add('hidden');
  });
  // Show selected tab section
  const activeSection = document.querySelector(`[data-section="${tab}"]`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
    // Load data when tab is shown
    if (tab === 'sessions') loadSessions();
    else if (tab === 'terms') loadTerms();
    else if (tab === 'classes') loadClasses();
    else if (tab === 'subjects') loadUploadedSubjects();
    else if (tab === 'exams') loadExamSchedules();
    else if (tab === 'cbt') loadCBTs();
    else if (tab === 'results') loadResults();
  }
  // Update active button
  document.querySelectorAll('#academicsTabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  // Update active sidebar link
  document.querySelectorAll('.nav a').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tab);
  });
}

document.querySelectorAll('#academicsTabs button').forEach(btn => {
  btn.onclick = () => showTab(btn.dataset.tab);
});

document.querySelectorAll('.nav a').forEach(link => {
  link.onclick = (e) => { e.preventDefault(); showTab(link.dataset.tab); };
});

// ===== EXAM TAB NAVIGATION =====
function showExamTab(tab) {
  document.querySelectorAll('#examTabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.examtab === tab);
  });
  document.querySelectorAll('[data-examsection]').forEach(sec => {
    sec.classList.toggle('hidden', sec.dataset.examsection !== tab);
  });
}

const examTabsContainer = document.getElementById('examTabs');
if (examTabsContainer) {
  examTabsContainer.addEventListener('click', (e) => {
    if (e.target.dataset.examtab) {
      showExamTab(e.target.dataset.examtab);
    }
  });
}

// ===== UTILITY FUNCTIONS =====
function showMessage(elementId, text, type = 'success') {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `<div class="message ${type}">${text}</div>`;
  }
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Fetch error:', err);
    return { ok: false, error: err.message };
  }
}

async function fillDropdown(endpoint, selectId, displayKey = 'name', valueKey = '_id') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const result = await safeFetch(`${API_BASE_URL}${endpoint}`);
  if (result.ok && Array.isArray(result.data)) {
    const items = result.data.data || result.data;
    select.innerHTML = '<option value="">-- Select --</option>' + items.map(item => 
      `<option value="${item[valueKey]}">${item[displayKey]}</option>`
    ).join('');
  }
}

// ===== SESSIONS =====
async function loadSessions() {
  const result = await safeFetch(`${API_BASE_URL}/api/session`);
  const tbody = document.getElementById('sessionsTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const sessions = result.data.data || result.data;
    tbody.innerHTML = sessions.map(s => `
      <tr>
        <td>${s.name || ''}</td>
        <td>${s.startDate ? new Date(s.startDate).toLocaleDateString() : ''}</td>
        <td>${s.endDate ? new Date(s.endDate).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editSession('${s._id || s.id}')"><i class="fa fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteSession('${s._id || s.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="4">No sessions found</td></tr>';
  }
  await fillDropdown('/api/session', 'termSessionSelect', 'name', '_id');
  await fillDropdown('/api/session', 'pushCBTSessionSelect', 'name', '_id');
  await fillDropdown('/api/session', 'resultsSessionSelect', 'name', '_id');
}

window.deleteSession = async function(id, btn) {
  if (!confirm('Delete this session?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/session/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('sessionMessage', '✓ Session deleted', 'success');
    loadSessions();
  } else {
    showMessage('sessionMessage', '✗ Failed to delete session', 'error');
  }
};

function editSession(id) {
  // Fetch session data and populate form
  safeFetch(`${API_BASE_URL}/api/session/${id}`).then(result => {
    if (result.ok) {
      const s = result.data.data || result.data;
      document.getElementById('sessionForm').elements['name'].value = s.name || '';
      document.getElementById('sessionForm').elements['startDate'].value = s.startDate ? s.startDate.split('T')[0] : '';
      document.getElementById('sessionForm').elements['endDate'].value = s.endDate ? s.endDate.split('T')[0] : '';
      document.getElementById('sessionForm').dataset.id = id;
    }
  });
}

document.getElementById('sessionForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    name: this.elements['name'].value,
    startDate: this.elements['startDate'].value,
    endDate: this.elements['endDate'].value
  };
  
  const result = id 
    ? await safeFetch(`${API_BASE_URL}/api/session/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await safeFetch(`${API_BASE_URL}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  
  if (result.ok) {
    showMessage('sessionMessage', id ? '✓ Session updated' : '✓ Session created', 'success');
    this.reset();
    delete this.dataset.id;
    loadSessions();
  } else {
    showMessage('sessionMessage', '✗ Failed to save session', 'error');
  }
};

// ===== TERMS =====
async function loadTerms() {
  const result = await safeFetch(`${API_BASE_URL}/api/term`);
  const tbody = document.getElementById('termsTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const terms = result.data.data || result.data;
    tbody.innerHTML = terms.map(t => `
      <tr>
        <td>${t.name || ''}</td>
        <td>${t.sessionId?.name || t.session || ''}</td>
        <td>${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
        <td>${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editTerm('${t._id || t.id}')"><i class="fa fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteTerm('${t._id || t.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5">No terms found</td></tr>';
  }
  await fillDropdown('/api/term', 'pushCBTTermSelect', 'name', '_id');
}

window.deleteTerm = async function(id, btn) {
  if (!confirm('Delete this term?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/term/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('termMessage', '✓ Term deleted', 'success');
    loadTerms();
  } else {
    showMessage('termMessage', '✗ Failed to delete term', 'error');
  }
};

function editTerm(id) {
  safeFetch(`${API_BASE_URL}/api/term/${id}`).then(result => {
    if (result.ok) {
      const t = result.data.data || result.data;
      document.getElementById('termForm').elements['name'].value = t.name || '';
      document.getElementById('termForm').elements['sessionId'].value = t.sessionId?._id || t.sessionId || '';
      document.getElementById('termForm').elements['startDate'].value = t.startDate ? t.startDate.split('T')[0] : '';
      document.getElementById('termForm').elements['endDate'].value = t.endDate ? t.endDate.split('T')[0] : '';
      document.getElementById('termForm').dataset.id = id;
    }
  });
}

document.getElementById('termForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    name: this.elements['name'].value,
    sessionId: this.elements['sessionId'].value,
    startDate: this.elements['startDate'].value,
    endDate: this.elements['endDate'].value
  };
  
  const result = id 
    ? await safeFetch(`${API_BASE_URL}/api/term/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await safeFetch(`${API_BASE_URL}/api/term`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  
  if (result.ok) {
    showMessage('termMessage', id ? '✓ Term updated' : '✓ Term created', 'success');
    this.reset();
    delete this.dataset.id;
    loadTerms();
  } else {
    showMessage('termMessage', '✗ Failed to save term', 'error');
  }
};

// ===== CLASSES =====
async function loadClasses() {
  const result = await safeFetch(`${API_BASE_URL}/api/classes`);
  const tbody = document.getElementById('classesTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const classes = result.data.data || result.data;
    tbody.innerHTML = classes.map(c => `
      <tr>
        <td>${c.name || ''}</td>
        <td>${c.arms?.join(', ') || ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editClass('${c._id || c.id}')"><i class="fa fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteClass('${c._id || c.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="3">No classes found</td></tr>';
  }
  await fillDropdown('/api/classes', 'assignClassSelect', 'name', '_id');
  await fillDropdown('/api/classes', 'examClassSelect', 'name', '_id');
  await fillDropdown('/api/classes', 'cbtClassSelect', 'name', '_id');
  await fillDropdown('/api/classes', 'resultsClassSelect', 'name', '_id');
}

window.deleteClass = async function(id, btn) {
  if (!confirm('Delete this class?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/classes/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('classMessage', '✓ Class deleted', 'success');
    loadClasses();
  } else {
    showMessage('classMessage', '✗ Failed to delete class', 'error');
  }
};

function editClass(id) {
  safeFetch(`${API_BASE_URL}/api/classes/${id}`).then(result => {
    if (result.ok) {
      const c = result.data.data || result.data;
      document.getElementById('classForm').elements['name'].value = c.name || '';
      document.getElementById('classForm').elements['arms'].value = c.arms?.join(',') || '';
      document.getElementById('classForm').dataset.id = id;
    }
  });
}

document.getElementById('classForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    name: this.elements['name'].value,
    arms: this.elements['arms'].value.split(',').map(a => a.trim()).filter(Boolean)
  };
  
  const result = id 
    ? await safeFetch(`${API_BASE_URL}/api/classes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await safeFetch(`${API_BASE_URL}/api/classes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  
  if (result.ok) {
    showMessage('classMessage', id ? '✓ Class updated' : '✓ Class created', 'success');
    this.reset();
    delete this.dataset.id;
    loadClasses();
  } else {
    showMessage('classMessage', '✗ Failed to save class', 'error');
  }
};

// ===== SUBJECTS =====
async function fillTeacherDropdown() {
  await fillDropdown('/api/staff', 'assignSubjectTeacherSelect', 'firstName', '_id');
}

async function loadUploadedSubjects() {
  const result = await safeFetch(`${API_BASE_URL}/api/subjects`);
  const tbody = document.getElementById('uploadedSubjectsTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const subjects = result.data.data || result.data;
    tbody.innerHTML = subjects.map(s => `
      <tr>
        <td>${s.title || s.name || ''}</td>
        <td>${s.meta?.class || s.classId?.name || ''}</td>
        <td>${s.meta?.teacher || s.teacherId?.firstName || ''}</td>
        <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-view" onclick="viewSubject('${s._id || s.id}')"><i class="fa fa-eye"></i></button>
            <button class="btn-small btn-delete" onclick="deleteSubjectFromClass('${s.meta?.class || ''}', '${s._id || s.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5">No subjects found</td></tr>';
  }
  fillTeacherDropdown();
}

window.viewSubject = function(id) {
  safeFetch(`${API_BASE_URL}/api/subjects/${id}`).then(result => {
    if (result.ok) {
      const s = result.data.data || result.data;
      alert(`Subject: ${s.title || s.name}\nCode: ${s.code || 'N/A'}\nClass: ${s.meta?.class || ''}`);
    }
  });
};

window.deleteSubjectFromClass = async function(classId, subjectId, btn) {
  if (!confirm('Remove this subject from class?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/subjects/${subjectId}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('assignSubjectMessage', '✓ Subject removed', 'success');
    loadUploadedSubjects();
  } else {
    showMessage('assignSubjectMessage', '✗ Failed to remove subject', 'error');
  }
};

document.getElementById('assignSubjectForm').onsubmit = async function(e) {
  e.preventDefault();
  const payload = {
    title: this.elements['subjectName'].value,
    meta: {
      class: this.elements['classId'].value,
      teacher: this.elements['teacherId'].value
    }
  };
  
  const result = await safeFetch(`${API_BASE_URL}/api/subjects`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload) 
  });
  
  if (result.ok) {
    showMessage('assignSubjectMessage', '✓ Subject assigned', 'success');
    this.reset();
    loadUploadedSubjects();
  } else {
    showMessage('assignSubjectMessage', '✗ Failed to assign subject', 'error');
  }
};

// ===== EXAMINATIONS =====
async function loadExamSchedules() {
  const result = await safeFetch(`${API_BASE_URL}/api/exams`);
  const tbody = document.getElementById('examScheduleTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const exams = result.data.data || result.data;
    tbody.innerHTML = exams.map(e => `
      <tr>
        <td>${e.title || e.name || ''}</td>
        <td>${e.termId?.name || e.term || ''}</td>
        <td>${e.classId?.name || e.class || ''}</td>
        <td>${e.startAt ? new Date(e.startAt).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editExamSchedule('${e._id || e.id}')"><i class="fa fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteExamSchedule('${e._id || e.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5">No exams scheduled</td></tr>';
  }
  await fillDropdown('/api/term', 'examTermSelect', 'name', '_id');
  await fillDropdown('/api/exams', 'modeExamSelect', 'title', '_id');
  loadExamModes();
}

window.deleteExamSchedule = async function(id, btn) {
  if (!confirm('Delete this exam?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/exams/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('examScheduleMessage', '✓ Exam deleted', 'success');
    loadExamSchedules();
  } else {
    showMessage('examScheduleMessage', '✗ Failed to delete exam', 'error');
  }
};

function editExamSchedule(id) {
  safeFetch(`${API_BASE_URL}/api/exams/${id}`).then(result => {
    if (result.ok) {
      const e = result.data.data || result.data;
      document.getElementById('examScheduleForm').elements['title'].value = e.title || e.name || '';
      document.getElementById('examScheduleForm').elements['termId'].value = e.termId?._id || e.termId || '';
      document.getElementById('examScheduleForm').elements['classId'].value = e.classId?._id || e.classId || '';
      document.getElementById('examScheduleForm').elements['date'].value = e.startAt ? e.startAt.split('T')[0] : '';
      document.getElementById('examScheduleForm').dataset.id = id;
    }
  });
}

document.getElementById('examScheduleForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    title: this.elements['title'].value,
    termId: this.elements['termId'].value,
    classId: this.elements['classId'].value,
    startAt: this.elements['date'].value
  };
  
  const result = id 
    ? await safeFetch(`${API_BASE_URL}/api/exams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await safeFetch(`${API_BASE_URL}/api/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  
  if (result.ok) {
    showMessage('examScheduleMessage', id ? '✓ Exam updated' : '✓ Exam created', 'success');
    this.reset();
    delete this.dataset.id;
    loadExamSchedules();
  } else {
    showMessage('examScheduleMessage', '✗ Failed to save exam', 'error');
  }
};

// ===== EXAM MODES =====
async function loadExamModes() {
  const result = await safeFetch(`${API_BASE_URL}/api/exams`);
  const tbody = document.getElementById('examModeTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const exams = result.data.data || result.data;
    tbody.innerHTML = exams.map(e => `
      <tr>
        <td>${e.title || e.name || ''}</td>
        <td>${e.mode || 'Paper'}</td>
        <td>${e.durationMinutes || e.duration || '-'}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editExamMode('${e._id || e.id}')"><i class="fa fa-edit"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="4">No exams found</td></tr>';
  }
}

function editExamMode(id) {
  safeFetch(`${API_BASE_URL}/api/exams/${id}`).then(result => {
    if (result.ok) {
      const e = result.data.data || result.data;
      document.getElementById('examModeForm').elements['examId'].value = e._id || e.id;
      document.getElementById('examModeForm').elements['mode'].value = e.mode || 'Paper';
      document.getElementById('examModeForm').elements['duration'].value = e.durationMinutes || e.duration || '';
      document.getElementById('examModeForm').dataset.id = id;
    }
  });
}

document.getElementById('examModeForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    mode: this.elements['mode'].value,
    durationMinutes: parseInt(this.elements['duration'].value)
  };
  
  const result = await safeFetch(`${API_BASE_URL}/api/exams/${id}`, { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload) 
  });
  
  if (result.ok) {
    showMessage('examModeMessage', '✓ Exam mode updated', 'success');
    this.reset();
    delete this.dataset.id;
    loadExamModes();
  } else {
    showMessage('examModeMessage', '✗ Failed to update exam mode', 'error');
  }
};

// ===== CBT & MOCKS =====
async function loadCBTs() {
  const result = await safeFetch(`${API_BASE_URL}/api/cbt`);
  const tbody = document.getElementById('cbtTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const cbts = result.data.data || result.data;
    tbody.innerHTML = cbts.map(c => `
      <tr>
        <td>${c.title || c.name || ''}</td>
        <td>${c.classId?.name || c.class || ''}</td>
        <td>${c.mode || 'Mixed'}</td>
        <td>${c.date ? new Date(c.date).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-edit" onclick="editCBT('${c._id || c.id}')"><i class="fa fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteCBT('${c._id || c.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5">No CBTs/Mocks found</td></tr>';
  }
}

window.deleteCBT = async function(id, btn) {
  if (!confirm('Delete this CBT/Mock?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/cbt/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('cbtMessage', '✓ CBT/Mock deleted', 'success');
    loadCBTs();
  } else {
    showMessage('cbtMessage', '✗ Failed to delete CBT/Mock', 'error');
  }
};

function editCBT(id) {
  safeFetch(`${API_BASE_URL}/api/cbt/${id}`).then(result => {
    if (result.ok) {
      const c = result.data.data || result.data;
      document.getElementById('cbtForm').elements['title'].value = c.title || c.name || '';
      document.getElementById('cbtForm').elements['classId'].value = c.classId?._id || c.classId || '';
      document.getElementById('cbtForm').elements['mode'].value = c.mode || 'Mixed';
      document.getElementById('cbtForm').elements['date'].value = c.date ? c.date.split('T')[0] : '';
      document.getElementById('cbtForm').dataset.id = id;
    }
  });
}

document.getElementById('cbtForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = this.dataset.id;
  const payload = {
    title: this.elements['title'].value,
    classId: this.elements['classId'].value,
    mode: this.elements['mode'].value,
    date: this.elements['date'].value
  };
  
  const result = id 
    ? await safeFetch(`${API_BASE_URL}/api/cbt/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await safeFetch(`${API_BASE_URL}/api/cbt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  
  if (result.ok) {
    showMessage('cbtMessage', id ? '✓ CBT/Mock updated' : '✓ CBT/Mock created', 'success');
    this.reset();
    delete this.dataset.id;
    loadCBTs();
  } else {
    showMessage('cbtMessage', '✗ Failed to save CBT/Mock', 'error');
  }
};

// ===== RESULTS =====
async function loadResults(filter = {}) {
  let url = `${API_BASE_URL}/api/results`;
  const params = new URLSearchParams();
  if (filter.sessionId) params.append('sessionId', filter.sessionId);
  if (filter.classId) params.append('classId', filter.classId);
  if (filter.type) params.append('type', filter.type);
  if (params.toString()) url += '?' + params.toString();
  
  const result = await safeFetch(url);
  const tbody = document.getElementById('resultsTableBody');
  if (!tbody) return;
  
  if (result.ok && Array.isArray(result.data)) {
    const results = result.data.data || result.data;
    tbody.innerHTML = results.map(r => `
      <tr>
        <td>${r.student?.firstName || r.studentName || ''}</td>
        <td>${r.class?.name || r.className || ''}</td>
        <td>${r.type || 'CBT'}</td>
        <td>${r.exam?.title || r.examName || ''}</td>
        <td>${r.score || '-'}</td>
        <td>${r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn-small btn-view" onclick="viewResult('${r._id || r.id}')"><i class="fa fa-eye"></i></button>
            <button class="btn-small btn-delete" onclick="deleteCBTResult('${r._id || r.id}', this)"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="7">No results found</td></tr>';
  }
}

document.getElementById('resultsFilterForm').onsubmit = async function(e) {
  e.preventDefault();
  const filter = {
    sessionId: this.elements['sessionId'].value,
    classId: this.elements['classId'].value,
    type: this.elements['type'].value
  };
  await loadResults(filter);
};

async function fillPushCBTSessionDropdown() {
  await fillDropdown('/api/session', 'pushCBTSessionSelect', 'name', '_id');
}

async function fillPushCBTTermDropdown() {
  const sessionId = document.getElementById('pushCBTSessionSelect').value;
  if (sessionId) {
    await fillDropdown(`/api/term?sessionId=${sessionId}`, 'pushCBTTermSelect', 'name', '_id');
  }
}

document.getElementById('pushCBTSessionSelect')?.addEventListener('change', fillPushCBTTermDropdown);

pushCBTResultsBtn.onclick = () => {
  fillPushCBTSessionDropdown();
  pushCBTModal.classList.remove('hidden');
};

cancelPushCBTModal.onclick = () => {
  pushCBTModal.classList.add('hidden');
  pushCBTModalFeedback.textContent = '';
};

pushCBTModalForm.onsubmit = async function(e) {
  e.preventDefault();
  const scoreField = this.elements['scoreField'].value;
  const sessionId = this.elements['sessionId'].value;
  const termId = this.elements['termId'].value;
  
  pushCBTModalFeedback.innerHTML = '<div class="message">Processing...</div>';
  
  const result = await safeFetch(`${API_BASE_URL}/api/results/push-to-universal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scoreField, sessionId, termId })
  });
  
  if (result.ok) {
    pushCBTModalFeedback.innerHTML = '<div class="message success">✓ Results pushed successfully</div>';
    setTimeout(() => {
      pushCBTModal.classList.add('hidden');
      loadResults();
    }, 1500);
  } else {
    pushCBTModalFeedback.innerHTML = '<div class="message error">✗ Failed to push results</div>';
  }
};

window.viewResult = function(id) {
  safeFetch(`${API_BASE_URL}/api/results/${id}`).then(result => {
    if (result.ok) {
      const r = result.data.data || result.data;
      alert(`Student: ${r.student?.firstName || ''}\nExam: ${r.exam?.title || ''}\nScore: ${r.score}\nGrade: ${r.grade || 'N/A'}`);
    }
  });
};

window.deleteCBTResult = async function(id, btn) {
  if (!confirm('Delete this result?')) return;
  const result = await safeFetch(`${API_BASE_URL}/api/results/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showMessage('resultsMessage', '✓ Result deleted', 'success');
    loadResults();
  } else {
    showMessage('resultsMessage', '✗ Failed to delete result', 'error');
  }
};

// ===== INITIALIZATION =====
loadClasses();
