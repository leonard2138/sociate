// Инициализация Supabase
const SUPABASE_URL = 'https://ahvfmhkspoyshehnluxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodmZtaGtzcG95c2hlaG5sdXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODYzNDMsImV4cCI6MjA2NTU2MjM0M30.t9su19GG5ra0iV2WaVEz4P0_wVonf5xWTXqy-9ooJ18';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Константы
const ADMIN_PASSWORD = 'leo563903W';
const POSTS_PER_PAGE = 12;

// DOM элементы
const postsContainer = document.getElementById('posts-container');
const adminPanel = document.getElementById('admin-panel');
const editorContainer = document.getElementById('editor-container');
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('login-modal');
const closeModalBtn = document.querySelector('.close');
const passwordInput = document.getElementById('password');
const submitPasswordBtn = document.getElementById('submitPassword');
const loginError = document.getElementById('login-error');
const newPostBtn = document.getElementById('newPostBtn');
const savePostBtn = document.getElementById('savePostBtn');
const cancelPostBtn = document.getElementById('cancelPostBtn');
const postTitleInput = document.getElementById('post-title');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Состояние приложения
let isAdmin = false;
let editor;
let currentPostId = null;
let currentPage = 1;
let totalPages = 1;
let allPosts = [];
let currentArticle = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initQuillEditor();
    setupEventListeners();
    preventCopyAndZoom();
    checkAdminStatus();
    
    // Проверяем URL для отображения статьи или списка
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
        loadArticle(articleId);
    } else {
        loadPosts();
    }
});

// Инициализация Quill редактора
function initQuillEditor() {
    if (document.getElementById('editor')) {
        editor = new Quill('#editor', {
            theme: 'snow',
            placeholder: 'Напишите что-нибудь интересное...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });
    }
}

// Загрузка постов из Supabase
async function loadPosts() {
    try {
        postsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка публикаций...</div>';
        
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allPosts = data || [];
        totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
        
        updatePaginationUI();
        displayCurrentPagePosts();
    } catch (error) {
        console.error('Ошибка при загрузке публикаций:', error);
        postsContainer.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке публикаций. Пожалуйста, попробуйте позже.</p>';
    }
}

// Загрузка отдельной статьи
async function loadArticle(id) {
    try {
        document.querySelector('main').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка статьи...</div>';
        
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        
        if (!data) {
            document.querySelector('main').innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i> Статья не найдена</div>';
            return;
        }
        
        currentArticle = data;
        displayArticle(data);
    } catch (error) {
        console.error('Ошибка при загрузке статьи:', error);
        document.querySelector('main').innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке статьи. Пожалуйста, попробуйте позже.</div>';
    }
}

// Отображение статьи
function displayArticle(article) {
    const date = new Date(article.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const formattedTime = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const articleHTML = `
        <a href="index.html" class="back-to-home"><i class="fas fa-arrow-left"></i> Вернуться к списку публикаций</a>
        
        <article class="article-page">
            <div class="article-header">
                <h1 class="article-title">${article.title}</h1>
                <div class="article-meta">
                    <div class="article-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
                    <div class="article-time"><i class="far fa-clock"></i> ${formattedTime}</div>
                </div>
            </div>
            <div class="article-content">${article.content}</div>
        </article>
    `;
    
    document.querySelector('main').innerHTML = articleHTML;
    
    // Если пользователь администратор, добавляем кнопки редактирования
    if (isAdmin) {
        const articlePage = document.querySelector('.article-page');
        const adminControls = document.createElement('div');
        adminControls.classList.add('admin-buttons');
        adminControls.style.marginTop = '1.5rem';
        
        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-btn');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
        editBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
            // Сохраняем ID статьи для редактирования
            localStorage.setItem('editArticleId', article.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Удалить';
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите удалить эту публикацию?')) {
                try {
                    const { error } = await supabase
                        .from('posts')
                        .delete()
                        .eq('id', article.id);
                        
                    if (error) throw error;
                    
                    alert('Публикация успешно удалена!');
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Ошибка при удалении публикации:', error);
                    alert('Произошла ошибка при удалении публикации. Пожалуйста, попробуйте еще раз.');
                }
            }
        });
        
        adminControls.appendChild(editBtn);
        adminControls.appendChild(deleteBtn);
        articlePage.appendChild(adminControls);
    }
    
    // Изменяем заголовок страницы
    document.title = `${article.title} | Универсальный Портал`;
}

// Отображение постов текущей страницы
function displayCurrentPagePosts() {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = Math.min(startIndex + POSTS_PER_PAGE, allPosts.length);
    const postsToDisplay = allPosts.slice(startIndex, endIndex);
    
    displayPosts(postsToDisplay);
}

// Обновление UI пагинации
function updatePaginationUI() {
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Отображение постов на странице
function displayPosts(posts) {
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-posts"><i class="fas fa-file-alt"></i> Пока нет опубликованных материалов.</p>';
        return;
    }

    postsContainer.innerHTML = '';
    
    posts.forEach((post, index) => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.style.setProperty('--animation-order', index);
        
        const date = new Date(post.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const formattedTime = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        postElement.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">${post.title}</h3>
                <p class="post-date">
                    <i class="far fa-calendar-alt"></i> ${formattedDate}
                    <span class="post-time"><i class="far fa-clock"></i> ${formattedTime}</span>
                </p>
            </div>
            <div class="post-footer">
                <a href="?id=${post.id}" class="read-more">Читать полностью <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        
        if (isAdmin) {
            const postFooter = postElement.querySelector('.post-footer');
            const adminButtons = document.createElement('div');
            adminButtons.classList.add('admin-buttons');
            
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-btn');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                editPost(post);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Удалить';
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deletePost(post.id);
            });
            
            adminButtons.appendChild(editBtn);
            adminButtons.appendChild(deleteBtn);
            postFooter.appendChild(adminButtons);
        }
        
        postsContainer.appendChild(postElement);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для модального окна входа
    loginBtn.addEventListener('click', () => {
        if (isAdmin) {
            toggleAdminPanel();
        } else {
            loginModal.classList.remove('hidden');
            passwordInput.focus();
        }
    });
    
    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        passwordInput.value = '';
        loginError.classList.add('hidden');
    });
    
    submitPasswordBtn.addEventListener('click', checkPassword);
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
    
    // Обработчики для редактора
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            currentPostId = null;
            postTitleInput.value = '';
            editor.root.innerHTML = '';
            editorContainer.classList.remove('hidden');
            postTitleInput.focus();
        });
    }
    
    if (savePostBtn) {
        savePostBtn.addEventListener('click', savePost);
    }
    
    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', () => {
            editorContainer.classList.add('hidden');
        });
    }
    
    // Обработчики пагинации
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updatePaginationUI();
                displayCurrentPagePosts();
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });
        
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updatePaginationUI();
                displayCurrentPagePosts();
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });
    }
    
    // Закрытие модального окна при клике вне его содержимого
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
            passwordInput.value = '';
            loginError.classList.add('hidden');
        }
    });
    
    // Проверяем, есть ли статья для редактирования
    const editArticleId = localStorage.getItem('editArticleId');
    if (editArticleId && isAdmin) {
        // Находим статью в списке или загружаем ее
        const article = allPosts.find(post => post.id === editArticleId);
        if (article) {
            editPost(article);
        } else {
            // Загружаем статью по ID
            loadPostForEdit(editArticleId);
        }
        // Удаляем ID из localStorage
        localStorage.removeItem('editArticleId');
    }
}

// Загрузка поста для редактирования
async function loadPostForEdit(id) {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        
        if (data) {
            editPost(data);
        }
    } catch (error) {
        console.error('Ошибка при загрузке статьи для редактирования:', error);
    }
}

// Проверка наличия сохраненного статуса администратора
function checkAdminStatus() {
    const savedAdminStatus = localStorage.getItem('isAdmin');
    if (savedAdminStatus === 'true') {
        isAdmin = true;
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-user-shield"></i> Админ-панель';
        }
    }
}

// Проверка пароля
function checkPassword() {
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        loginModal.classList.add('hidden');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
        }
        loginBtn.innerHTML = '<i class="fas fa-user-shield"></i> Админ-панель';
        
        // Сохраняем статус администратора
        localStorage.setItem('isAdmin', 'true');
        
        // Перезагружаем страницу для отображения админ-элементов
        window.location.reload();
    } else {
        loginError.classList.remove('hidden');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Переключение отображения админ-панели
function toggleAdminPanel() {
    if (adminPanel) {
        if (adminPanel.classList.contains('hidden')) {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
            editorContainer.classList.add('hidden');
        }
    }
}

// Сохранение поста
async function savePost() {
    const title = postTitleInput.value.trim();
    const content = editor.root.innerHTML;
    
    if (!title) {
        alert('Пожалуйста, введите заголовок публикации');
        postTitleInput.focus();
        return;
    }
    
    if (editor.getText().trim().length < 10) {
        alert('Пожалуйста, добавьте больше содержимого в публикацию');
        editor.focus();
        return;
    }
    
    try {
        let result;
        
        if (currentPostId) {
            // Обновление существующего поста
            result = await supabase
                .from('posts')
                .update({ title, content })
                .eq('id', currentPostId);
        } else {
            // Создание нового поста
            result = await supabase
                .from('posts')
                .insert([{ title, content }]);
        }
        
        if (result.error) throw result.error;
        
        // Не скрываем редактор после сохранения
        alert(currentPostId ? 'Публикация успешно обновлена!' : 'Публикация успешно создана!');
        
        // Сбрасываем форму для нового поста
        currentPostId = null;
        postTitleInput.value = '';
        editor.root.innerHTML = '';
        
        // Перезагружаем посты
        loadPosts();
    } catch (error) {
        console.error('Ошибка при сохранении публикации:', error);
        alert('Произошла ошибка при сохранении публикации. Пожалуйста, попробуйте еще раз.');
    }
}

// Редактирование поста
function editPost(post) {
    if (!adminPanel || !editorContainer) {
        // Если мы на странице статьи, перенаправляем на главную
        window.location.href = 'index.html';
        localStorage.setItem('editArticleId', post.id);
        return;
    }
    
    currentPostId = post.id;
    postTitleInput.value = post.title;
    editor.root.innerHTML = post.content;
    
    // Показываем админ-панель и редактор
    adminPanel.classList.remove('hidden');
    editorContainer.classList.remove('hidden');
    
    // Прокручиваем к редактору
    adminPanel.scrollIntoView({ behavior: 'smooth' });
    
    postTitleInput.focus();
}

// Удаление поста
async function deletePost(id) {
    if (!confirm('Вы уверены, что хотите удалить эту публикацию?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        alert('Публикация успешно удалена!');
        loadPosts();
    } catch (error) {
        console.error('Ошибка при удалении публикации:', error);
        alert('Произошла ошибка при удалении публикации. Пожалуйста, попробуйте еще раз.');
    }
}

// Предотвращение копирования и масштабирования
function preventCopyAndZoom() {
    // Запрет контекстного меню
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Запрет копирования
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());
    
    // Запрет масштабирования с помощью клавиатуры
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
            e.preventDefault();
        }
    });
    
    // Запрет масштабирования с помощью жестов (для тачскринов)
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());
    
    // Разрешаем прокрутку страницы
    document.addEventListener('touchmove', e => {
        if (e.touches.length <= 1) {
            return; // Разрешаем обычную прокрутку одним пальцем
        }
        e.preventDefault(); // Блокируем масштабирование двумя пальцами
    }, { passive: false });
} 