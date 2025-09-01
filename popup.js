import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Khởi tạo Supabase client (ĐÃ SỬA LỖI)
// Thư viện Supabase được nạp từ popup.html sẽ tạo ra một đối tượng 'supabase' toàn cục.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- QUẢN LÝ GIAO DIỆN ---
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');

// --- CÁC THÀNH PHẦN XÁC THỰC ---
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userEmailDisplay = document.getElementById('user-email-display');

// --- DOM Elements Ghi Chú ---
const newNoteTitleInput = document.getElementById('new-note-title');
const noteTagSelect = document.getElementById('note-tag-select');
const newNoteContentInput = document.getElementById('new-note-content');
const notesListContainer = document.getElementById('notes-list');
const saveNoteBtn = document.getElementById('save-note-btn');
const filterDropdown = document.getElementById('filter-dropdown');
const filterBtn = document.getElementById('filter-btn');
const filterLabel = document.getElementById('filter-label');
const filterOptions = document.getElementById('filter-options');
const addTagBtn = document.getElementById('add-tag-btn');
const newTagNameInput = document.getElementById('new-tag-name');
const newTagColorInput = document.getElementById('new-tag-color');
const manageableTagsList = document.getElementById('manageable-tags-list');
const tagManagementHeader = document.getElementById('tag-management-header');
const tagManagementContent = document.getElementById('tag-management-content');
const modalOverlay = document.getElementById('custom-modal-overlay');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// State variables
let notes = [];
let tags = [];
let editingNoteId = null;
let editingTagId = null;
let currentFilter = 'all';
let currentUser = null;

// --- "NGƯỜI GÁC CỔNG": Lắng nghe trạng thái đăng nhập ---
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user;
    currentUser = user;

    if (user) {
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        userEmailDisplay.textContent = user.email;
        await loadDataFromSupabase();
    } else {
        appScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
        notes = [];
        tags = [];
        renderAll();
    }
    loadingScreen.classList.add('hidden');
});

// --- LOGIC XÁC THỰC ---
function showAuthError(message) {
    authError.textContent = message;
}

async function handleRegister() {
    const email = emailInput.value;
    const password = passwordInput.value;
    authError.textContent = '';
    
    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        showAuthError(error.message);
    } else {
        showModal("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.", "alert");
    }
}

async function handleLogin() {
    const email = emailInput.value;
    const password = passwordInput.value;
    authError.textContent = '';
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthError(error.message);
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}

// --- CÁC HÀM XỬ LÝ DỮ LIỆU VỚI SUPABASE ---
async function loadDataFromSupabase() {
    if (!currentUser) return;

    const { data: tagsData, error: tagsError } = await supabaseClient
        .from('tags')
        .select('*')
        .order('created_at', { ascending: true });

    if (tagsError) {
        showModal("Lỗi tải thẻ: " + tagsError.message);
        return;
    }
    tags = tagsData;

    const { data: notesData, error: notesError } = await supabaseClient
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (notesError) {
        showModal("Lỗi tải ghi chú: " + notesError.message);
        return;
    }
    notes = notesData;

    renderAll();
}

// --- CÁC HÀM XỬ LÝ GHI CHÚ (Đã sửa đổi để dùng Supabase) ---
function showModal(message, type = 'alert') {
    return new Promise((resolve) => {
        modalMessage.textContent = message;
        modalOverlay.classList.remove('hidden');
        if (type === 'alert') {
            modalCancelBtn.classList.add('hidden');
            modalConfirmBtn.textContent = 'OK';
        } else {
            modalCancelBtn.classList.remove('hidden');
            modalConfirmBtn.textContent = 'Đồng ý';
        }
        const confirmHandler = () => { modalOverlay.classList.add('hidden'); resolve(true); cleanup(); };
        const cancelHandler = () => { modalOverlay.classList.add('hidden'); resolve(false); cleanup(); };
        const cleanup = () => {
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
        };
        modalConfirmBtn.addEventListener('click', confirmHandler);
        modalCancelBtn.addEventListener('click', cancelHandler);
    });
}

function renderAll() {
    populateTagDropdown();
    renderManageableTags();
    renderFilterOptions();
    renderNotes();
}

function renderNotes() {
    notesListContainer.innerHTML = '';
    const filteredNotes = currentFilter === 'all' 
        ? notes 
        : notes.filter(note => note.tag_name === currentFilter);

    if (filteredNotes.length === 0) {
        const message = currentFilter === 'all' 
            ? 'Chưa có ghi chú nào.' 
            : `Không có ghi chú nào trong thẻ "${currentFilter}".`;
        notesListContainer.innerHTML = `<p style="text-align:center; color:#9ca3af;">${message}</p>`;
    } else {
        filteredNotes.forEach(note => notesListContainer.appendChild(createNoteCard(note)));
    }
}

function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;
    const tagData = tags.find(t => t.name === note.tag_name) || { color: '#9ca3af' };
    card.style.borderLeftColor = tagData.color;
    card.innerHTML = `
        <div class="note-header">
            <h2 class="note-title">${note.title || 'Không có tiêu đề'}</h2>
            <span class="note-tag" style="background-color: ${tagData.color};">${note.tag_name}</span>
        </div>
        <p class="note-text">${note.content}</p>
        <div class="note-footer">
            <span class="note-timestamp">${new Date(note.created_at).toLocaleString('vi-VN')}</span>
            <div class="note-actions">
                <button class="edit-note-btn" title="Sửa ghi chú"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg></button>
                <button class="delete-note-btn" title="Xóa ghi chú"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.033C6.91 2.75 6 3.704 6 4.884v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
            </div>
        </div>`;
    return card;
}

function populateTagDropdown() {
    const currentVal = noteTagSelect.value;
    noteTagSelect.innerHTML = '';
    if (tags.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Không có thẻ';
        noteTagSelect.appendChild(option);
        noteTagSelect.disabled = true;
    } else {
        noteTagSelect.disabled = false;
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = tag.name;
            noteTagSelect.appendChild(option);
        });
        if (currentVal) noteTagSelect.value = currentVal;
    }
}

function renderManageableTags() {
    manageableTagsList.innerHTML = '';
    tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'manageable-tag-item';
        if(tag.id === editingTagId) item.classList.add('editing');
        item.innerHTML = `
            <div class="tag-info">
                <span class="tag-color-dot" style="background-color: ${tag.color};"></span>
                <span>${tag.name}</span>
            </div>
            <div class="tag-actions">
                <button class="edit-tag-btn" data-id="${tag.id}" title="Sửa thẻ"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg></button>
                <button class="delete-tag-btn" data-id="${tag.id}" title="Xóa thẻ"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.033C6.91 2.75 6 3.704 6 4.884v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
            </div>`;
        manageableTagsList.appendChild(item);
    });
}

function renderFilterOptions() {
    filterOptions.innerHTML = '';
    const checkmarkSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;
    const allOption = document.createElement('div');
    allOption.className = 'filter-option-item';
    allOption.textContent = 'Tất cả ghi chú';
    allOption.dataset.tag = 'all';
    if (currentFilter === 'all') {
        allOption.classList.add('active');
        allOption.innerHTML += checkmarkSVG;
        filterLabel.textContent = 'Tất cả ghi chú';
    }
    filterOptions.appendChild(allOption);
    tags.forEach(tag => {
        const tagOption = document.createElement('div');
        tagOption.className = 'filter-option-item';
        tagOption.textContent = tag.name;
        tagOption.dataset.tag = tag.name;
        if (currentFilter === tag.name) {
            tagOption.classList.add('active');
            tagOption.innerHTML += checkmarkSVG;
            filterLabel.textContent = `Thẻ: ${tag.name}`;
        }
        filterOptions.appendChild(tagOption);
    });
}

async function saveOrUpdateNote() {
    const title = newNoteTitleInput.value.trim();
    const content = newNoteContentInput.value.trim();
    const tag_name = noteTagSelect.value;
    if (!content) { showModal("Nội dung ghi chú không được để trống.", "alert"); return; }
    
    let error;
    if (editingNoteId) {
        ({ error } = await supabaseClient
            .from('notes')
            .update({ title, content, tag_name })
            .eq('id', editingNoteId));
    } else {
        ({ error } = await supabaseClient
            .from('notes')
            .insert({ title, content, tag_name, user_id: currentUser.id }));
    }

    if (error) {
        showModal("Lỗi lưu ghi chú: " + error.message);
    } else {
        newNoteTitleInput.value = ''; newNoteContentInput.value = ''; editingNoteId = null;
        loadDataFromSupabase();
    }
}

function handleEditNote(noteId) {
    const noteToEdit = notes.find(note => note.id === noteId);
    if (noteToEdit) {
        editingNoteId = noteId;
        newNoteTitleInput.value = noteToEdit.title;
        newNoteContentInput.value = noteToEdit.content;
        noteTagSelect.value = noteToEdit.tag_name;
        newNoteTitleInput.focus();
    }
}

async function handleDeleteNote(noteId) {
    const confirmed = await showModal("Bạn có chắc chắn muốn xóa ghi chú này không?", "confirm");
    if (confirmed) {
        const { error } = await supabaseClient.from('notes').delete().eq('id', noteId);
        if (error) {
            showModal("Lỗi xóa ghi chú: " + error.message);
        } else {
            loadDataFromSupabase();
        }
    }
}

async function handleAddOrUpdateTag() {
    const name = newTagNameInput.value.trim();
    const color = newTagColorInput.value;
    if (!name) { showModal("Tên thẻ không được để trống.", "alert"); return; }
    if (tags.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== editingTagId)) {
        showModal("Thẻ này đã tồn tại.", "alert"); return;
    }
    
    let error;
    if (editingTagId) {
        ({ error } = await supabaseClient
            .from('tags')
            .update({ name, color })
            .eq('id', editingTagId));
    } else {
        ({ error } = await supabaseClient
            .from('tags')
            .insert({ name, color, user_id: currentUser.id }));
    }
    
    if (error) {
        showModal("Lỗi lưu thẻ: " + error.message);
    } else {
        editingTagId = null; addTagBtn.textContent = 'Thêm'; newTagNameInput.value = '';
        loadDataFromSupabase();
    }
}

function handleStartEditTag(tagId) {
    const tagToEdit = tags.find(t => t.id === tagId);
    if (tagToEdit) {
        editingTagId = tagId;
        newTagNameInput.value = tagToEdit.name;
        newTagColorInput.value = tagToEdit.color;
        addTagBtn.textContent = 'Lưu';
        newTagNameInput.focus();
    }
}

async function handleDeleteTag(tagId) {
    const confirmed = await showModal("Bạn có chắc chắn muốn xóa thẻ này không? Các ghi chú dùng thẻ này sẽ không bị xóa.", "confirm");
    if (confirmed) {
        const { error } = await supabaseClient.from('tags').delete().eq('id', tagId);
        if (error) {
            showModal("Lỗi xóa thẻ: " + error.message);
        } else {
            loadDataFromSupabase();
        }
    }
}

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
newNoteContentInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveOrUpdateNote(); } });
saveNoteBtn.addEventListener('click', saveOrUpdateNote);
addTagBtn.addEventListener('click', handleAddOrUpdateTag);
tagManagementHeader.addEventListener('click', () => { tagManagementHeader.classList.toggle('expanded'); tagManagementContent.classList.toggle('expanded'); });

manageableTagsList.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.edit-tag-btn');
    if (editBtn) handleStartEditTag(Number(editBtn.dataset.id));
    
    const deleteBtn = event.target.closest('.delete-tag-btn');
    if (deleteBtn) handleDeleteTag(Number(deleteBtn.dataset.id));
});

notesListContainer.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.edit-note-btn');
    if (editBtn) handleEditNote(Number(editBtn.closest('.note-card').dataset.id));

    const deleteBtn = event.target.closest('.delete-note-btn');
    if (deleteBtn) handleDeleteNote(Number(deleteBtn.closest('.note-card').dataset.id));
});

filterBtn.addEventListener('click', () => { 
    filterOptions.classList.toggle('hidden'); 
    filterBtn.classList.toggle('expanded'); 
});

filterOptions.addEventListener('click', (event) => {
    const filterOption = event.target.closest('.filter-option-item');
    if (filterOption) {
        currentFilter = filterOption.dataset.tag;
        filterOptions.classList.add('hidden'); 
        filterBtn.classList.remove('expanded');
        renderFilterOptions();
        renderNotes();
    }
});

document.addEventListener('click', (event) => { 
    if (!filterDropdown.contains(event.target)) { 
        filterOptions.classList.add('hidden'); 
        filterBtn.classList.remove('expanded'); 
    } 
});

