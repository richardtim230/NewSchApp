        // --- SPINNER HELPERS ---
function showSpinner() {
  document.getElementById('pageSpinnerOverlay').style.display = 'flex';
}
function hideSpinner() {
  document.getElementById('pageSpinnerOverlay').style.display = 'none';
}

// --- GRADE, REMARK, POSITION LOGIC ---
function getGradeAndRemark(totalScore) {
  if (totalScore >= 70) return { grade: 'A', remark: 'Excellent' };
  if (totalScore >= 60) return { grade: 'B', remark: 'Very Good' };
  if (totalScore >= 50) return { grade: 'C', remark: 'Good' };
  if (totalScore >= 45) return { grade: 'D', remark: 'Pass' };
  if (totalScore >= 40) return { grade: 'E', remark: 'Poor' };
  return { grade: 'F', remark: 'Fail' };
}
function ordinalSuffix(pos) {
  if (typeof pos !== "number") pos = parseInt(pos);
  if (pos % 100 >= 11 && pos % 100 <= 13) return pos + "th";
  switch (pos % 10) {
    case 1: return pos + "st";
    case 2: return pos + "nd";
    case 3: return pos + "rd";
    default: return pos + "th";
  }
}
async function computeAndPersistSubjectPositions(allResults) {
  const positions = {};
  for (const r of allResults) {
    const className = r.class_name || (r.class && r.class.name) || '';
    const subjectName = r.subject_name || (r.subject && r.subject.name) || '';
    if (!className || !subjectName) continue;
    if (!positions[className]) positions[className] = {};
    if (!positions[className][subjectName]) positions[className][subjectName] = [];
    let total = 0;
    if (r.ca1_score) total += parseFloat(r.ca1_score) || 0;
    if (r.ca2_score) total += parseFloat(r.ca2_score) || 0;
    if (r.midterm_score) total += parseFloat(r.midterm_score) || 0;
    if (r.exam_score) total += parseFloat(r.exam_score) || 0;
    if (!r.ca1_score && !r.ca2_score && !r.midterm_score && !r.exam_score && r.score) total = parseFloat(r.score) || 0;
    positions[className][subjectName].push({
      student_id: r.student_id || (r.student && r.student.student_id) || '',
      total,
      _id: r._id
    });
  }
  const posMap = {};
  for (const className in positions) {
    for (const subjectName in positions[className]) {
      const arr = positions[className][subjectName];
      arr.sort((a, b) => b.total - a.total);
      let currentPos = 1, prevTotal = null, skip = 0;
      for (let i = 0; i < arr.length; i++) {
        if (prevTotal !== null && arr[i].total < prevTotal) {
          currentPos = i + 1; skip = 0;
        } else if (prevTotal !== null && arr[i].total === prevTotal) { skip++; }
        posMap[arr[i]._id] = { position: ordinalSuffix(currentPos), numeric: currentPos };
        prevTotal = arr[i].total;
      }
    }
  }
  for (const id in posMap) {
    const data = { subject_position: posMap[id].position, subject_position_num: posMap[id].numeric };
    fetch(`https://goldlincschools.onrender.com/api/results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(()=>{});
  }
  return posMap;
}

// --- UTILITY FUNCTIONS ---
function calcStudentAverage(results) {
  if (!results || !results.length) return '';
  let sum = 0, count = 0;
  results.forEach(r => {
    let total = 0;
    if (r.ca1_score) total += parseFloat(r.ca1_score) || 0;
    if (r.ca2_score) total += parseFloat(r.ca2_score) || 0;
    if (r.midterm_score) total += parseFloat(r.midterm_score) || 0;
    if (r.exam_score) total += parseFloat(r.exam_score) || 0;
    if (!r.ca1_score && !r.ca2_score && !r.midterm_score && !r.exam_score && r.score) total = parseFloat(r.score) || 0;
    sum += total; count++;
  });
  return count ? (sum / count).toFixed(2) : '';
}
function groupResultsByStudent(results) {
  const grouped = {};
  results.forEach(r => {
    const studentId = r.student_id || (r.student && r.student.student_id) || '';
    if (!studentId) return;
    if (!grouped[studentId]) grouped[studentId] = {student: r, subjects: []};
    grouped[studentId].subjects.push(r);
  });
  return grouped;
}
function openModal(modalId) {
  document.getElementById(modalId).style.display = 'block';
}
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// --- RENDER TABLE & CHARTS ---
async function renderResultsTable(results) {
  const tbody = document.getElementById('resultsTbody');
  tbody.innerHTML = '';
  const grouped = groupResultsByStudent(results);
  const subjectPositions = await computeAndPersistSubjectPositions(results);

  Object.keys(grouped).forEach((studentId, idx) => {
    const group = grouped[studentId];
    const student = group.student;
    const subjects = group.subjects;

    const tr = document.createElement('tr');
    tr.className = "student-row";
    tr.innerHTML = `
      <td><button class="expand-btn" aria-label="Expand details" data-idx="${idx}">+</button></td>
      <td>${studentId}</td>
      <td>${student.student_name || (student.student && (student.student.firstname || student.student.name)) || ''}</td>
      <td>${student.class_name || (student.class && student.class.name) || ''}</td>
      <td>${subjects.length}</td>
      <td>${calcStudentAverage(subjects)}</td>
      <td>${
        subjects.some(s => (s.status || '').toLowerCase() === "published")
          ? '<span class="status-published">Published</span>'
          : '<span class="status-draft">Draft</span>'
      }</td>
      <td><button class="view-details-btn" data-idx="${idx}">👁️</button></td>
    `;
    tbody.appendChild(tr);

    // Details
    const detailTr = document.createElement('tr');
    detailTr.className = "details-row";
    detailTr.style.display = "none";
    detailTr.innerHTML = `
      <td colspan="8" style="background: #f5f8fd;">
        <b>Subjects & Results:</b>
        <table style="margin: 8px 0; width: 100%; background: #fff;">
          <thead>
            <tr>
              <th>Subject</th><th>CA1</th><th>CA2</th><th>Mid Term</th><th>Exam</th>
              <th>Total</th><th>Grade</th><th>Remarks</th><th>Position</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.map((result, resIdx) => {
              let total = 0;
              if (result.ca1_score) total += parseFloat(result.ca1_score) || 0;
              if (result.ca2_score) total += parseFloat(result.ca2_score) || 0;
              if (result.midterm_score) total += parseFloat(result.midterm_score) || 0;
              if (result.exam_score) total += parseFloat(result.exam_score) || 0;
              if (!result.ca1_score && !result.ca2_score && !result.midterm_score && !result.exam_score && result.score) total = parseFloat(result.score) || 0;
              const { grade, remark } = getGradeAndRemark(total);
              const subjectPos = subjectPositions[result._id]?.position || result.subject_position || '';
              return `
                <tr>
                  <td>${result.subject_name || (result.subject && result.subject.name) || ''}</td>
                  <td>${result.ca1_score ?? ''}</td>
                  <td>${result.ca2_score ?? ''}</td>
                  <td>${result.midterm_score ?? ''}</td>
                  <td>${result.exam_score ?? ''}</td>
                  <td>${total || ''}</td>
                  <td>${grade}</td>
                  <td>${remark}</td>
                  <td><span class="position-badge">${subjectPos}</span></td>
                  <td class="status-${(result.status || '').toLowerCase()}">${result.status || ''}</td>
                  <td>
                    <button class="action-btn edit" title="Edit" data-id="${result._id}" aria-label="Edit result">✏️</button>
                    <button class="action-btn delete" title="Delete" data-id="${result._id}" aria-label="Delete result">🗑️</button>
                    <button class="action-btn publish" title="Publish" data-id="${result._id}" aria-label="Publish result">📢</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </td>
    `;
    tbody.appendChild(detailTr);
  });
}

function renderStatsChart(results) {
  const gradeCounts = {};
  if (Array.isArray(results)) {
    results.forEach(r => {
      let grade = r.grade || "Others";
      if (!gradeCounts[grade]) gradeCounts[grade] = 0;
      gradeCounts[grade]++;
    });
  }
  if (!Object.keys(gradeCounts).length) {
    gradeCounts["No Data"] = 1;
  }
  if (window.resultsStatsChart && typeof window.resultsStatsChart.destroy === "function") {
    window.resultsStatsChart.destroy();
  }
  const ctx = document.getElementById('resultsStatsChart').getContext('2d');
  window.resultsStatsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(gradeCounts),
      datasets: [{
        label: 'Number of Students',
        data: Object.values(gradeCounts),
        backgroundColor: [
          '#20c997', '#007bff', '#ffc107', '#888', '#6f42c1', '#ff9800', '#b22234'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Number of Students' }
        }
      }
    }
  });
}

// --- FETCH AND RENDER LOGIC ---
async function fetchResultsAndRender() {
  const statusEl = document.getElementById('resultsStatus');
  showSpinner();
  try {
    const response = await fetch('https://goldlincschools.onrender.com/api/results');
    if (!response.ok) throw new Error('Network response was not ok');
    const results = await response.json();
    await renderResultsTable(results);
    if (statusEl) statusEl.textContent = '';
    renderStatsChart(results);
  } catch (err) {
    if (statusEl) {
      statusEl.style.color = "#dc3545";
      statusEl.textContent = "❌ Failed to load results: " + err.message;
    }
  } finally {
    hideSpinner();
  }
}
document.addEventListener('DOMContentLoaded', function() {
  fetchResultsAndRender();
  document.querySelectorAll('.modal .close').forEach(btn=>{
    btn.onclick = function() {
      closeModal(btn.closest('.modal').id);
    };
  });

  // Bulk actions
  document.getElementById('bulkEditBtn').onclick = unpublishAllResultsOnTable;
  document.getElementById('publishResultsBtn').onclick = publishAllResultsOnTable;
  document.getElementById('uploadResultsBtn').onclick = () => window.location.href = "upload-results.html";
  document.getElementById('exportCSVBtn').onclick = () => window.location.href = "export-csv.html";
  document.getElementById('manageTemplatesBtn').onclick = () => window.location.href = "manage-templates.html";
  document.getElementById('viewStatsBtn').onclick = function() {
    document.getElementById('statisticsModal').style.display = 'block';
  };
  document.getElementById('closeStatsModal').onclick = function() {
    document.getElementById('statisticsModal').style.display = 'none';
  };
  document.getElementById('closeStatsModal').addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById('statisticsModal').style.display = 'none';
    }
  });

  // Filter
  document.getElementById('filterBtn').onclick = async function() {
    const classVal = document.getElementById('classSelect').value;
    const subjectVal = document.getElementById('subjectSelect').value;
    const sessionVal = document.getElementById('sessionSelect').value;
    const termVal = document.getElementById('termSelect').value;
    const searchVal = document.getElementById('searchStudentInput').value.trim().toLowerCase();
    let query = [];
    if (classVal !== "All Classes") query.push(`class=${encodeURIComponent(classVal)}`);
    if (subjectVal !== "All Subjects") query.push(`subject=${encodeURIComponent(subjectVal)}`);
    if (sessionVal) query.push(`session=${encodeURIComponent(sessionVal)}`);
    if (termVal) query.push(`term=${encodeURIComponent(termVal)}`);
    if (searchVal) query.push(`search=${encodeURIComponent(searchVal)}`);
    const url = 'https://goldlincschools.onrender.com/api/results' + (query.length ? '?' + query.join('&') : '');
    const statusEl = document.getElementById('resultsStatus');
    showSpinner();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const filtered = await response.json();
      await renderResultsTable(filtered);
      renderStatsChart(filtered);
      if (statusEl) statusEl.textContent = '';
    } catch (err) {
      if (statusEl) {
        statusEl.style.color = "#dc3545";
        statusEl.textContent = "❌ Failed to filter results: " + err.message;
      }
    } finally {
      hideSpinner();
    }
  };

  // Edit modal grade/remark/position auto-update
  ['editCA1', 'editCA2', 'editMidTerm', 'editExam'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      const ca1 = parseFloat(document.getElementById('editCA1').value) || 0;
      const ca2 = parseFloat(document.getElementById('editCA2').value) || 0;
      const mid = parseFloat(document.getElementById('editMidTerm').value) || 0;
      const exam = parseFloat(document.getElementById('editExam').value) || 0;
      const total = ca1 + ca2 + mid + exam;
      const { grade, remark } = getGradeAndRemark(total);
      document.getElementById('editGrade').value = grade;
      document.getElementById('editRemarks').value = remark;
      document.getElementById('editSubjectPosition').value = ""; // Recalculated after save
    });
  });
});

// --- EDIT/DELETE/PUBLISH EVENT LOGIC ---
let _editResultData = null;
let _deleteResultData = null;
let _publishResultData = null;

// Table row click events
document.getElementById('resultsTbody').onclick = function(e) {
  // Expand/collapse
  if (e.target.classList.contains('expand-btn')) {
    const btn = e.target;
    const tr = btn.closest('tr');
    const detailTr = tr.nextElementSibling;
    const expanded = detailTr.style.display !== "none";
    detailTr.style.display = expanded ? "none" : "";
    btn.textContent = expanded ? "+" : "−";
    return;
  }
  // View details
  if (e.target.classList.contains('view-details-btn')) {
    const idx = e.target.getAttribute('data-idx');
    const btn = document.querySelector(`.expand-btn[data-idx="${idx}"]`);
    if (btn) btn.click();
    return;
  }
  // Edit
  if (e.target.classList.contains('edit')) {
    const tr = e.target.closest('tr');
    const id = e.target.getAttribute('data-id');
    _editResultData = { id, tr };
    document.getElementById('editResultId').value = id;
    document.getElementById('editCA1').value = tr.children[1].textContent.trim();
    document.getElementById('editCA2').value = tr.children[2].textContent.trim();
    document.getElementById('editMidTerm').value = tr.children[3].textContent.trim();
    document.getElementById('editExam').value = tr.children[4].textContent.trim();
    const total = (parseFloat(tr.children[1].textContent.trim() || 0) +
                   parseFloat(tr.children[2].textContent.trim() || 0) +
                   parseFloat(tr.children[3].textContent.trim() || 0) +
                   parseFloat(tr.children[4].textContent.trim() || 0));
    const { grade, remark } = getGradeAndRemark(total);
    document.getElementById('editGrade').value = grade;
    document.getElementById('editRemarks').value = remark;
    document.getElementById('editSubjectPosition').value = tr.children[8] ? tr.children[8].textContent.trim() : '';
    document.getElementById('editResultStatus').textContent = '';
    openModal('editResultModal');
  }
  // Delete
  if (e.target.classList.contains('delete')) {
    const tr = e.target.closest('tr');
    const id = e.target.getAttribute('data-id');
    _deleteResultData = { id, tr };
    document.getElementById('deleteResultStatus').textContent = '';
    openModal('deleteResultModal');
  }
  // Publish
  if (e.target.classList.contains('publish')) {
    const tr = e.target.closest('tr');
    const id = e.target.getAttribute('data-id');
    _publishResultData = { id, tr };
    document.getElementById('publishResultStatus').textContent = '';
    openModal('publishResultModal');
  }
};

// --- EDIT SAVE/DELETE/PUBLISH MODALS ---
document.getElementById('editResultForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('editResultId').value;
  const ca1_score = document.getElementById('editCA1').value;
  const ca2_score = document.getElementById('editCA2').value;
  const midterm_score = document.getElementById('editMidTerm').value;
  const exam_score = document.getElementById('editExam').value;
  const grade = document.getElementById('editGrade').value;
  const remarks = document.getElementById('editRemarks').value;
  const statusDiv = document.getElementById('editResultStatus');
  statusDiv.style.color = "#888";
  statusDiv.textContent = "Saving...";
  showSpinner();
  try {
    const res = await fetch(`https://goldlincschools.onrender.com/api/results/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        ca1_score, ca2_score, midterm_score, exam_score,
        grade, remarks
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Failed to update: ' + text);
    }
    closeModal('editResultModal');
    await fetchResultsAndRender();
  } catch (err) {
    statusDiv.style.color = "#dc3545";
    statusDiv.textContent = "❌ " + err.message;
  } finally {
    hideSpinner();
  }
};
document.getElementById('confirmDeleteBtn').onclick = async function() {
  const id = _deleteResultData && _deleteResultData.id;
  const statusDiv = document.getElementById('deleteResultStatus');
  statusDiv.style.color = "#888";
  statusDiv.textContent = "Deleting...";
  showSpinner();
  try {
    const res = await fetch(`https://goldlincschools.onrender.com/api/results/${id}`, {method:'DELETE'});
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Failed to delete: ' + text);
    }
    closeModal('deleteResultModal');
    await fetchResultsAndRender();
  } catch(err) {
    statusDiv.style.color = "#dc3545";
    statusDiv.textContent = "❌ " + err.message;
  } finally {
    hideSpinner();
  }
};
document.getElementById('cancelDeleteBtn').onclick = function() {
  closeModal('deleteResultModal');
};
document.getElementById('confirmPublishBtn').onclick = async function() {
  const id = _publishResultData && _publishResultData.id;
  const statusDiv = document.getElementById('publishResultStatus');
  statusDiv.style.color = "#888";
  statusDiv.textContent = "Publishing...";
  showSpinner();
  try {
    const res = await fetch(`https://goldlincschools.onrender.com/api/results/${id}/publish`, {method:'POST'});
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Failed to publish: ' + text);
    }
    closeModal('publishResultModal');
    await fetchResultsAndRender();
  } catch(err) {
    statusDiv.style.color = "#dc3545";
    statusDiv.textContent = "❌ " + err.message;
  } finally {
    hideSpinner();
  }
};
document.getElementById('cancelPublishBtn').onclick = function() {
  closeModal('publishResultModal');
};

// --- BULK ACTIONS ---
function getAllResultIdsFromTable() {
  const detailRows = document.querySelectorAll('#resultsTbody .details-row');
  const ids = [];
  detailRows.forEach(row => {
    const idBtns = row.querySelectorAll('.action-btn.edit, .action-btn.delete, .action-btn.publish');
    idBtns.forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (id && !ids.includes(id)) ids.push(id);
    });
  });
  return ids;
}
async function publishAllResultsOnTable() {
  const resultIds = getAllResultIdsFromTable();
  if (!resultIds.length) {
    alert("No results to publish!");
    return;
  }
  if (!confirm(`Publish ALL (${resultIds.length}) displayed results? This cannot be undone!`)) return;
  const statusEl = document.getElementById('resultsStatus');
  statusEl.style.color = "#007bff";
  statusEl.textContent = "Publishing all results...";
  showSpinner();
  let failed = 0;
  for (let i = 0; i < resultIds.length; i++) {
    const id = resultIds[i];
    try {
      const res = await fetch(`https://goldlincschools.onrender.com/api/results/${id}/publish`, {method:'POST'});
      if (!res.ok) failed++;
    } catch {
      failed++;
    }
    // Show progress feedback
    statusEl.textContent = `Publishing ${i + 1}/${resultIds.length}...${failed ? ` (Failed: ${failed})` : ""}`;
  }
  await fetchResultsAndRender();
  hideSpinner();
  statusEl.style.color = failed > 0 ? "#dc3545" : "#20c997";
  statusEl.textContent =
    failed > 0
      ? `❌ Some results (${failed}) failed to publish.`
      : "✅ All visible results published successfully!";
}
async function unpublishAllResultsOnTable() {
  const resultIds = getAllResultIdsFromTable();
  if (!resultIds.length) {
    alert("No results to unpublish!");
    return;
  }
  if (!confirm(`Unpublish (convert to draft) ALL (${resultIds.length}) displayed results?`)) return;
  const statusEl = document.getElementById('resultsStatus');
  statusEl.style.color = "#007bff";
  statusEl.textContent = "Unpublishing all results (setting to draft)...";
  showSpinner();
  let failed = 0;
  for (let i = 0; i < resultIds.length; i++) {
    const id = resultIds[i];
    try {
      const res = await fetch(`https://goldlincschools.onrender.com/api/results/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({status: 'Draft'})
      });
      if (!res.ok) failed++;
    } catch {
      failed++;
    }
    statusEl.textContent = `Unpublishing ${i + 1}/${resultIds.length}...${failed ? ` (Failed: ${failed})` : ""}`;
  }
  await fetchResultsAndRender();
  hideSpinner();
  statusEl.style.color = failed > 0 ? "#dc3545" : "#20c997";
  statusEl.textContent =
    failed > 0
      ? `❌ Some results (${failed}) failed to unpublish.`
      : "✅ All visible results set to draft successfully!";
}
