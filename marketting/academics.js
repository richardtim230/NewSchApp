const API_BASE_URL = "https://goldlincschools.onrender.com";

// Get elements
const sidebar = document.getElementById('academicsSidebar');
const pushCBTModal = document.getElementById('pushCBTModal');
const pushCBTModalForm = document.getElementById('pushCBTModalForm');
const pushCBTModalFeedback = document.getElementById('pushCBTModalFeedback');
const pushCBTResultsBtn = document.getElementById('pushCBTResultsBtn');
const cancelPushCBTModal = document.getElementById('cancelPushCBTModal');

// Tab Navigation
function showTab(tab) {
  // Hide all sections
  document.querySelectorAll('[data-section]').forEach(sec => {
    sec.classList.add('hidden');
  });
  // Show active section
  const activeSection = document.querySelector(`[data-section="${tab}"]`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Update button styles
  document.querySelectorAll('.tablist button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Load data for specific tab
  if (tab === 'sessions') {
    loadSessions();
  } else if (tab === 'terms') {
    loadTerms();
    fillDropdown('/sessions', 'termSessionSelect');
  } else if (tab === 'classes') {
    loadClasses();
    fillTeacherDropdown();
    fillTeacherCheckboxes();
  } else if (tab === 'subjects') {
    loadUploadedSubjects();
    fillClassDropdown();
    fillTeacherDropdown2();
  } else if (tab === 'exams') {
    loadExamSchedules();
    fillTermDropdownForExam();
    fillClassDropdownForExam();
    fillExamDropdown();
  } else if (tab === 'cbt') {
    loadCBTs();
    fillClassDropdownForCBT();
  } else if (tab === 'results') {
    fillPushCBTSessionDropdown();
    fillResultsSessionDropdown();
    fillResultsClassDropdown();
    loadResults();
  }
}

// Tab click handlers
document.querySelectorAll('.tablist button').forEach(btn => {
  btn.onclick = () => showTab(btn.dataset.tab);
});

// Exam subtabs
function showExamTab(tab) {
  document.querySelectorAll('#examTabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.examtab === tab);
  });
  document.querySelectorAll('#examTabContent > div').forEach(sec => {
    sec.classList.toggle('hidden', sec.dataset.examsection !== tab);
  });
}

document.querySelectorAll('#examTabs button').forEach(btn => {
  btn.onclick = () => showExamTab(btn.dataset.examtab);
});

// Initialize first tab
showTab('sessions');

// ==================== HELPER FUNCTIONS ====================

async function fetchAPI(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE_URL + endpoint, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function showMessage(elementId, message, isSuccess = true) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="message ${isSuccess ? 'success' : 'error'}">${message}</div>`;
}

async function fillDropdown(endpoint, selectId, labelKey = 'name', valueKey = '_id') {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const res = await fetchAPI(endpoint);
    if (!res.ok) {
      select.innerHTML = '<option>Error loading</option>';
      return;
    }
    const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    select.innerHTML = items.map(item => 
      `<option value="${item[valueKey] || item.id}">${item[labelKey] || item.name}</option>`
    ).join('');
  } catch (e) {
    select.innerHTML = '<option>Error loading</option>';
  }
}

// ==================== SESSIONS ====================

async function loadSessions() {
  const res = await fetchAPI('/sessions');
  const tbody = document.getElementById('sessionsTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="4">Error loading sessions</td></tr>';
    return;
  }
  const sessions = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = sessions.map(s => `
    <tr>
      <td>${s.name || ''}</td>
      <td>${s.startDate ? new Date(s.startDate).toLocaleDateString() : ''}</td>
      <td>${s.endDate ? new Date(s.endDate).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editSession('${s._id || s.id}')"><i class="fa fa-edit"></i> Edit</button>
          <button class="btn-small btn-delete" onclick="deleteSession('${s._id || s.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.deleteSession = async function(id, btn) {
  if (!confirm('Delete this session?')) return;
  const res = await fetchAPI(`/sessions/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('sessionMessage', 'Session deleted', true);
  } else {
    showMessage('sessionMessage', 'Failed to delete session', false);
  }
};

window.editSession = function(id) {
  // Find and populate form with session data
  const sessionForm = document.getElementById('sessionForm');
  // You can implement modal or inline edit
};

document.getElementById('sessionForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    name: this.name.value,
    startDate: this.startDate.value,
    endDate: this.endDate.value
  };
  const res = await fetchAPI('/sessions', 'POST', data);
  if (res.ok) {
    showMessage('sessionMessage', 'Session saved successfully', true);
    this.reset();
    loadSessions();
  } else {
    showMessage('sessionMessage', res.data?.message || 'Failed to save session', false);
  }
};

loadSessions();

// ==================== TERMS ====================

async function loadTerms() {
  const res = await fetchAPI('/terms');
  const tbody = document.getElementById('termsTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading terms</td></tr>';
    return;
  }
  const terms = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = terms.map(t => `
    <tr>
      <td>${t.name || ''}</td>
      <td>${t.session?.name || t.sessionName || ''}</td>
      <td>${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
      <td>${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editTerm('${t._id || t.id}')"><i class="fa fa-edit"></i> Edit</button>
          <button class="btn-small btn-delete" onclick="deleteTerm('${t._id || t.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.deleteTerm = async function(id, btn) {
  if (!confirm('Delete this term?')) return;
  const res = await fetchAPI(`/terms/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('termMessage', 'Term deleted', true);
  } else {
    showMessage('termMessage', 'Failed to delete term', false);
  }
};

window.editTerm = function(id) {
  // Implement edit logic
};

document.getElementById('termForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    name: this.name.value,
    sessionId: this.sessionId.value,
    startDate: this.startDate.value,
    endDate: this.endDate.value
  };
  const res = await fetchAPI('/terms', 'POST', data);
  if (res.ok) {
    showMessage('termMessage', 'Term saved successfully', true);
    this.reset();
    loadTerms();
  } else {
    showMessage('termMessage', res.data?.message || 'Failed to save term', false);
  }
};

// ==================== CLASSES ====================

async function fillClassDropdown() {
  await fillDropdown('/classes', 'assignClassSelect', 'name');
}

async function fillClassDropdownForExam() {
  await fillDropdown('/classes', 'examClassSelect', 'name');
}

async function fillClassDropdownForCBT() {
  await fillDropdown('/classes', 'cbtClassSelect', 'name');
}

async function loadClasses() {
  const res = await fetchAPI('/classes');
  const tbody = document.getElementById('classesTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="3">Error loading classes</td></tr>';
    return;
  }
  const classes = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = classes.map(c => `
    <tr>
      <td>${c.name || ''}</td>
      <td>${c.arms ? c.arms.join(', ') : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editClass('${c._id || c.id}')"><i class="fa fa-edit"></i> Edit</button>
          <button class="btn-small btn-delete" onclick="deleteClass('${c._id || c.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.deleteClass = async function(id, btn) {
  if (!confirm('Delete this class?')) return;
  const res = await fetchAPI(`/classes/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('classMessage', 'Class deleted', true);
  } else {
    showMessage('classMessage', 'Failed to delete class', false);
  }
};

window.editClass = function(id) {
  // Implement edit logic
};

document.getElementById('classForm').onsubmit = async function(e) {
  e.preventDefault();
  const arms = this.arms.value ? this.arms.value.split(',').map(a => a.trim()) : [];
  const data = {
    name: this.name.value,
    arms
  };
  const res = await fetchAPI('/classes', 'POST', data);
  if (res.ok) {
    showMessage('classMessage', 'Class added successfully', true);
    this.reset();
    loadClasses();
  } else {
    showMessage('classMessage', res.data?.message || 'Failed to add class', false);
  }
};

// ==================== TEACHERS ====================

async function fillTeacherDropdown() {
  await fillDropdown('/admin/staffs?role=teacher', 'assignSubjectTeacherSelect', 'firstName');
}

async function fillTeacherDropdown2() {
  await fillDropdown('/admin/staffs?role=teacher', 'assignSubjectTeacherSelect', 'firstName');
}

async function fillTeacherCheckboxes() {
  const res = await fetchAPI('/admin/staffs?role=teacher');
  const menu = document.getElementById('teacherDropdownMenu');
  if (!menu || !res.ok) return;
  const teachers = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  menu.innerHTML = teachers.map(t => `
    <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer;">
      <input type="checkbox" value="${t._id || t.id}" class="teacher-checkbox">
      ${(t.firstName || '') + ' ' + (t.lastName || '')}
    </label>
  `).join('');
}

function toggleTeacherDropdown() {
  const menu = document.getElementById('teacherDropdownMenu');
  menu.classList.toggle('hidden');
}

// ==================== SUBJECTS ====================

async function fillTeacherDropdown2() {
  await fillDropdown('/admin/staffs?role=teacher', 'assignSubjectTeacherSelect', 'firstName');
}

document.getElementById('assignSubjectForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    classId: this.classId.value,
    subjectName: this.subjectName.value,
    teacherId: this.teacherId.value
  };
  const res = await fetchAPI('/subjects', 'POST', data);
  if (res.ok) {
    showMessage('assignSubjectMessage', 'Subject assigned successfully', true);
    this.reset();
    loadUploadedSubjects();
  } else {
    showMessage('assignSubjectMessage', res.data?.message || 'Failed to assign subject', false);
  }
};

async function loadUploadedSubjects() {
  const res = await fetchAPI('/subjects');
  const tbody = document.getElementById('uploadedSubjectsTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading subjects</td></tr>';
    return;
  }
  const subjects = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = subjects.map(s => `
    <tr>
      <td>${s.title || s.name || ''}</td>
      <td>${s.meta?.class || s.classId || ''}</td>
      <td>${s.meta?.teacher || s.teacherId || ''}</td>
      <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-view" onclick="viewSubject('${s._id || s.id}')"><i class="fa fa-eye"></i> View</button>
          <button class="btn-small btn-delete" onclick="deleteSubjectFromClass('${s._id || s.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.viewSubject = function(id) {
  alert('Subject details for ' + id);
};

window.deleteSubjectFromClass = async function(subjectId, btn) {
  if (!confirm('Delete this subject?')) return;
  const res = await fetchAPI(`/subjects/${subjectId}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('assignSubjectMessage', 'Subject deleted', true);
  } else {
    showMessage('assignSubjectMessage', 'Failed to delete subject', false);
  }
};

// ==================== EXAM SCHEDULES ====================

async function fillTermDropdownForExam() {
  await fillDropdown('/terms', 'examTermSelect', 'name');
}

async function loadExamSchedules() {
  const res = await fetchAPI('/exams');
  const tbody = document.getElementById('examScheduleTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading exams</td></tr>';
    return;
  }
  const exams = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = exams.map(e => `
    <tr>
      <td>${e.title || e.name || ''}</td>
      <td>${e.term?.name || e.termName || ''}</td>
      <td>${e.class?.name || e.className || ''}</td>
      <td>${e.date ? new Date(e.date).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editExamSchedule('${e._id || e.id}')"><i class="fa fa-edit"></i> Edit</button>
          <button class="btn-small btn-delete" onclick="deleteExamSchedule('${e._id || e.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.deleteExamSchedule = async function(id, btn) {
  if (!confirm('Delete this exam?')) return;
  const res = await fetchAPI(`/exams/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('examScheduleMessage', 'Exam deleted', true);
  } else {
    showMessage('examScheduleMessage', 'Failed to delete exam', false);
  }
};

window.editExamSchedule = function(id) {
  // Implement edit logic
};

document.getElementById('examScheduleForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    title: this.title.value,
    termId: this.termId.value,
    classId: this.classId.value,
    date: this.date.value
  };
  const res = await fetchAPI('/exams', 'POST', data);
  if (res.ok) {
    showMessage('examScheduleMessage', 'Exam scheduled successfully', true);
    this.reset();
    loadExamSchedules();
  } else {
    showMessage('examScheduleMessage', res.data?.message || 'Failed to schedule exam', false);
  }
};

// ==================== EXAM MODES ====================

async function fillExamDropdown() {
  await fillDropdown('/exams', 'modeExamSelect', 'title');
}

async function loadExamModes() {
  const res = await fetchAPI('/exams');
  const tbody = document.getElementById('examModeTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="4">Error loading exam modes</td></tr>';
    return;
  }
  const exams = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = exams.map(e => `
    <tr>
      <td>${e.title || e.name || ''}</td>
      <td>${e.mode || 'Paper'}</td>
      <td>${e.duration || 60} min</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editExamMode('${e._id || e.id}')"><i class="fa fa-edit"></i> Edit</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editExamMode = function(id) {
  // Implement edit logic
};

document.getElementById('examModeForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    mode: this.mode.value,
    duration: this.duration.value
  };
  const res = await fetchAPI(`/exams/${this.examId.value}`, 'PUT', data);
  if (res.ok) {
    showMessage('examModeMessage', 'Exam mode updated successfully', true);
    this.reset();
    loadExamModes();
  } else {
    showMessage('examModeMessage', res.data?.message || 'Failed to update exam mode', false);
  }
};

loadExamModes();

// ==================== CBT & MOCKS ====================

async function loadCBTs() {
  const res = await fetchAPI('/cbt');
  const tbody = document.getElementById('cbtTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="5">Error loading CBT/Mocks</td></tr>';
    return;
  }
  const cbts = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = cbts.map(c => `
    <tr>
      <td>${c.title || c.name || ''}</td>
      <td>${c.class?.name || c.className || ''}</td>
      <td>${c.mode || 'Multiple Choice'}</td>
      <td>${c.date ? new Date(c.date).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-edit" onclick="editCBT('${c._id || c.id}')"><i class="fa fa-edit"></i> Edit</button>
          <button class="btn-small btn-delete" onclick="deleteCBT('${c._id || c.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.deleteCBT = async function(id, btn) {
  if (!confirm('Delete this CBT/Mock?')) return;
  const res = await fetchAPI(`/cbt/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('cbtMessage', 'CBT/Mock deleted', true);
  } else {
    showMessage('cbtMessage', 'Failed to delete CBT/Mock', false);
  }
};

window.editCBT = function(id) {
  // Implement edit logic
};

document.getElementById('cbtForm').onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    title: this.title.value,
    classId: this.classId.value,
    mode: this.mode.value,
    date: this.date.value
  };
  const res = await fetchAPI('/cbt', 'POST', data);
  if (res.ok) {
    showMessage('cbtMessage', 'CBT/Mock setup successfully', true);
    this.reset();
    loadCBTs();
  } else {
    showMessage('cbtMessage', res.data?.message || 'Failed to setup CBT/Mock', false);
  }
};

loadCBTs();

// ==================== RESULTS ====================

async function fillPushCBTSessionDropdown() {
  await fillDropdown('/sessions', 'pushCBTSessionSelect', 'name');
}

async function fillPushCBTTermDropdown() {
  await fillDropdown('/terms', 'pushCBTTermSelect', 'name');
}

async function fillResultsSessionDropdown() {
  await fillDropdown('/sessions', 'resultsSessionSelect', 'name');
}

async function fillResultsClassDropdown() {
  await fillDropdown('/classes', 'resultsClassSelect', 'name');
}

async function loadResults(filter = {}) {
  let endpoint = '/results';
  if (filter.sessionId) endpoint += `?sessionId=${filter.sessionId}`;
  const res = await fetchAPI(endpoint);
  const tbody = document.getElementById('resultsTableBody');
  if (!res.ok) {
    tbody.innerHTML = '<tr><td colspan="7">Error loading results</td></tr>';
    return;
  }
  const results = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  tbody.innerHTML = results.map(r => `
    <tr>
      <td>${(r.student?.firstName || '') + ' ' + (r.student?.lastName || '')}</td>
      <td>${r.student?.className || ''}</td>
      <td>${r.type || 'CBT'}</td>
      <td>${r.exam?.title || r.examName || ''}</td>
      <td>${r.score || 0}</td>
      <td>${r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-delete" onclick="deleteCBTResult('${r._id || r.id}', this)"><i class="fa fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('resultsFilterForm').onsubmit = function(e) {
  e.preventDefault();
  const filter = {
    sessionId: this.sessionId.value,
    classId: this.classId.value,
    type: this.type.value
  };
  loadResults(filter);
};

pushCBTResultsBtn.onclick = () => {
  fillPushCBTSessionDropdown();
  fillPushCBTTermDropdown();
  pushCBTModal.classList.add('active');
};

cancelPushCBTModal.onclick = () => {
  pushCBTModal.classList.remove('active');
  pushCBTModalFeedback.textContent = '';
};

pushCBTModalForm.onsubmit = async function(e) {
  e.preventDefault();
  const data = {
    scoreField: this.scoreField.value,
    sessionId: this.sessionId.value,
    termId: this.termId.value
  };
  pushCBTModalFeedback.textContent = 'Pushing results...';
  const res = await fetchAPI('/results/push-cbt', 'POST', data);
  if (res.ok) {
    pushCBTModalFeedback.innerHTML = '<div class="message success">Results pushed successfully!</div>';
    setTimeout(() => {
      pushCBTModal.classList.remove('active');
      loadResults();
    }, 1500);
  } else {
    pushCBTModalFeedback.innerHTML = `<div class="message error">Failed: ${res.data?.message || 'Unknown error'}</div>`;
  }
};

window.deleteCBTResult = async function(id, btn) {
  if (!confirm('Delete this result?')) return;
  const res = await fetchAPI(`/results/${id}`, 'DELETE');
  if (res.ok) {
    btn.closest('tr').remove();
    showMessage('resultsMessage', 'Result deleted', true);
  } else {
    showMessage('resultsMessage', 'Failed to delete result', false);
  }
};

loadResults();
