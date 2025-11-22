// Quill and dashboard logic

let quill;
document.addEventListener("DOMContentLoaded", function() {
  // Quill Editor setup
  quill = new Quill('#quillEditor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ]
    }
  });

  // Load notes
  loadNotes();

  // Modal open/close logic
  document.getElementById('newNoteBtn').onclick = () => openModal();

  document.getElementById('noteForm').onsubmit = async function(e) {
    e.preventDefault();
    // Collect note data
    const id = document.getElementById('noteId').value;
    const title = document.getElementById('noteTitle').value.trim();
    const course = document.getElementById('noteCourse').value.trim();
    const content = quill.root.innerHTML;
    let method = id ? 'PUT' : 'POST';
    let url = '/api/notes' + (id ? `/${id}` : '');
    // Save to backend
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, course, content })
    });
    closeModal();
    loadNotes();
  };
});

// Helper functions
function openModal(note={}) {
  document.getElementById('noteModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = note.id ? "Edit Note" : "Add New Note";
  document.getElementById('noteId').value = note.id || '';
  document.getElementById('noteTitle').value = note.title || '';
  document.getElementById('noteCourse').value = note.course || '';
  quill.root.innerHTML = note.content || '';
}
function closeModal() {
  document.getElementById('noteModal').classList.add('hidden');
  document.getElementById('noteForm').reset();
  quill.root.innerHTML = '';
}
function loadNotes() {
  fetch('/api/notes').then(res => res.json()).then(data => {
    const notesTable = document.getElementById('notesTable');
    notesTable.innerHTML = `
      <table class="min-w-full border">
        <thead class="bg-gray-100">
          <tr>
            <th class="py-2 px-4 border">Title</th>
            <th class="py-2 px-4 border">Course</th>
            <th class="py-2 px-4 border">Updated</th>
            <th class="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(note => `
            <tr>
              <td class="py-2 px-4 border">${note.title}</td>
              <td class="py-2 px-4 border">${note.course}</td>
              <td class="py-2 px-4 border">${new Date(note.updated_at).toLocaleString()}</td>
              <td class="py-2 px-4 border flex gap-2">
                <button class="text-blue-600 px-2 py-1" onclick="previewNote(${note.id})">Preview</button>
                <button class="text-green-600 px-2 py-1" onclick="editNote(${note.id})">Edit</button>
                <button class="text-red-600 px-2 py-1" onclick="deleteNote(${note.id})">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });
}
function editNote(id) {
  fetch('/api/notes/'+id).then(res => res.json()).then(note => openModal(note));
}
function deleteNote(id) {
  if(confirm("Are you sure you want to delete this note?")) {
    fetch('/api/notes/'+id, { method: 'DELETE' }).then(loadNotes);
  }
}
function previewNote(id) {
  fetch('/api/notes/' + id)
    .then(res => res.json())
    .then(note => {
      const preview = document.getElementById('previewContent');
      preview.innerHTML = `<h2 class="text-xl font-bold">${note.title} (${note.course})</h2><div class="mt-4">${note.content}</div>`;
      // Render KaTeX
      if (window.renderMathInElement) {
        renderMathInElement(preview, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\(", right: "\\)", display: false},
            {left: "$", right: "$", display: false}
          ],
          throwOnError: false
        });
      }
      document.getElementById('previewModal').classList.remove('hidden');
    });
}
function closePreview() {
  document.getElementById('previewModal').classList.add('hidden');
  document.getElementById('previewContent').innerHTML = '';
}
function logout() {
  // basic implementation; redirect or call API logout
  window.location.href = '/logout';
}
