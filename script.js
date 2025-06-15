// Инициализация Supabase
const SUPABASE_URL = 'https://ahvfmhkspoyshehnluxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodmZtaGtzcG95c2hlaG5sdXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODYzNDMsImV4cCI6MjA2NTU2MjM0M30.t9su19GG5ra0iV2WaVEz4P0_wVonf5xWTXqy-9ooJ18';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// SQL для создания поля password в таблице posts:
// ALTER TABLE posts ADD COLUMN password TEXT;

// Константы
const ADMIN_PASSWORD = 'leo563903W';
const POSTS_PER_PAGE = 12;
const COMMENT_COOLDOWN = 5 * 60 * 1000; // 5 минут в миллисекундах
const IP_STORAGE_KEY = 'user_ip_data';

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
const closeAdminBtn = document.getElementById('closeAdminBtn');
const postTitleInput = document.getElementById('post-title');
const postPasswordInput = document.getElementById('post-password');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const nameModal = document.getElementById('name-modal');
const authorNameInput = document.getElementById('author-name');
const submitNameBtn = document.getElementById('submit-name');
const nameError = document.getElementById('name-error');
const closeNameModalBtn = document.querySelector('.close-name-modal');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResultsModal = document.getElementById('search-results-modal');
const closeSearchResultsBtn = document.querySelector('.close-search-results');
const searchResultsContainer = document.getElementById('search-results-container');
const searchQueryDisplay = document.getElementById('search-query-display');
const noResultsDiv = document.getElementById('no-results');
const passwordModal = document.getElementById('password-modal');
const postAccessPasswordInput = document.getElementById('post-access-password');
const submitPasswordModalBtn = document.getElementById('submit-password-btn');
const cancelPasswordModalBtn = document.getElementById('cancel-password-btn');
const passwordError = document.getElementById('password-error');

// Состояние приложения
let isAdmin = false;
let editor;
let currentPostId = null;
let currentPage = 1;
let totalPages = 1;
let allPosts = [];
let currentArticle = null;
let authorName = '';
let userIP = '';
let lastCommentTime = parseInt(localStorage.getItem('last_comment_time') || '0');
let commentCooldownTimer = null;
let searchTimeout = null;
let currentPostPassword = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initQuillEditor();
    setupEventListeners();
    preventCopyAndZoom();
    checkAdminStatus();
    checkDatabaseConnection();
    getUserIP();
    
    // Проверяем URL для отображения статьи или списка
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
        loadArticle(articleId);
    } else {
        loadPosts();
    }
});

// Получение IP адреса пользователя
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIP = data.ip;
        console.log('IP пользователя:', userIP);
        
        // Загружаем имя пользователя из localStorage по IP
        loadUserNameByIP();
    } catch (error) {
        console.error('Ошибка при получении IP адреса:', error);
        userIP = 'unknown';
    }
}

// Загрузка имени пользователя по IP из localStorage
function loadUserNameByIP() {
    try {
        const ipData = JSON.parse(localStorage.getItem(IP_STORAGE_KEY) || '{}');
        if (ipData[userIP]) {
            authorName = ipData[userIP];
            console.log('Имя пользователя загружено по IP:', authorName);
            
            // Обновляем отображение имени в интерфейсе
            updateAuthorNameDisplay();
        } else {
            // Если имя не найдено, показываем модальное окно для ввода имени
            setTimeout(() => {
                showNameModal();
            }, 1000);
        }
    } catch (error) {
        console.error('Ошибка при загрузке имени по IP:', error);
    }
}

// Сохранение имени пользователя по IP в localStorage
function saveUserNameByIP(name) {
    try {
        const ipData = JSON.parse(localStorage.getItem(IP_STORAGE_KEY) || '{}');
        ipData[userIP] = name;
        localStorage.setItem(IP_STORAGE_KEY, JSON.stringify(ipData));
        console.log('Имя пользователя сохранено по IP:', name);
    } catch (error) {
        console.error('Ошибка при сохранении имени по IP:', error);
    }
}

// Инициализация Quill редактора
function initQuillEditor() {
    if (document.getElementById('editor')) {
        // Добавляем красивый эффект загрузки редактора
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.classList.add('loading-editor');
        }
        
        // Настройка редактора с расширенными опциями
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
                ],
                clipboard: {
                    matchVisual: false
                },
                history: {
                    delay: 1000,
                    maxStack: 50,
                    userOnly: true
                }
            }
        });
        
        // Добавляем классы для стилизации
        document.querySelector('.ql-toolbar').classList.add('editor-toolbar');
        document.querySelector('.ql-container').classList.add('editor-container');
        
        // Убираем класс загрузки
        setTimeout(() => {
            if (editorContainer) {
                editorContainer.classList.remove('loading-editor');
            }
            
            // Фокус на редактор при открытии
            setTimeout(() => {
                editor.focus();
            }, 100);
        }, 300);
        
        // Добавляем подсказки для кнопок панели инструментов
        const toolbarButtons = document.querySelectorAll('.ql-toolbar button');
        const tooltips = {
            'ql-bold': 'Полужирный',
            'ql-italic': 'Курсив',
            'ql-underline': 'Подчеркнутый',
            'ql-strike': 'Зачеркнутый',
            'ql-link': 'Вставить ссылку',
            'ql-image': 'Вставить изображение',
            'ql-clean': 'Очистить форматирование'
        };
        
        toolbarButtons.forEach(button => {
            for (const className in tooltips) {
                if (button.classList.contains(className)) {
                    button.setAttribute('title', tooltips[className]);
                    break;
                }
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
        postsContainer.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке публикаций: ${error.message || 'Неизвестная ошибка'}</p>`;
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
        
        // Проверяем, защищена ли статья паролем
        if (data.password && !isAdmin) {
            // Показываем модальное окно для ввода пароля
            showPasswordModal(data);
        } else {
            // Если пароля нет или пользователь - админ, показываем статью
            displayArticle(data);
        }
    } catch (error) {
        console.error('Ошибка при загрузке статьи:', error);
        document.querySelector('main').innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке статьи: ${error.message || 'Неизвестная ошибка'}</div>`;
    }
}

// Показать модальное окно для ввода пароля
function showPasswordModal(post) {
    // Сбрасываем предыдущие значения
    postAccessPasswordInput.value = '';
    passwordError.classList.remove('show');
    currentPostPassword = post.password;
    
    // Показываем модальное окно
    passwordModal.style.display = 'flex';
    setTimeout(() => {
        passwordModal.classList.add('show');
    }, 10);
    
    // Фокус на поле ввода пароля
    setTimeout(() => {
        postAccessPasswordInput.focus();
    }, 100);
    
    // Обработчик нажатия Enter
    function handleEnterKey(e) {
        if (e.key === 'Enter') {
            checkPostPassword();
        }
    }
    
    // Добавляем обработчик нажатия Enter
    postAccessPasswordInput.addEventListener('keyup', handleEnterKey);
    
    // Обработчик для кнопки подтверждения
    submitPasswordModalBtn.onclick = () => {
        checkPostPassword();
        // Удаляем обработчик после использования
        postAccessPasswordInput.removeEventListener('keyup', handleEnterKey);
    };
    
    // Обработчик для кнопки отмены
    cancelPasswordModalBtn.onclick = () => {
        passwordModal.classList.remove('show');
        setTimeout(() => {
            passwordModal.style.display = 'none';
            // Перенаправляем на главную страницу
            window.location.href = 'index.html';
        }, 300);
        // Удаляем обработчик после использования
        postAccessPasswordInput.removeEventListener('keyup', handleEnterKey);
    };
}

// Проверка пароля к посту
function checkPostPassword() {
    const enteredPassword = postAccessPasswordInput.value;
    
    if (enteredPassword === currentPostPassword) {
        // Если пароль верный, скрываем модальное окно и показываем статью
        passwordModal.classList.remove('show');
        setTimeout(() => {
            passwordModal.style.display = 'none';
            displayArticle(currentArticle);
        }, 300);
    } else {
        // Если пароль неверный, показываем сообщение об ошибке
        passwordError.classList.add('show');
        postAccessPasswordInput.value = '';
        postAccessPasswordInput.focus();
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
        <a href="index.html" class="back-to-home"><i class="fas fa-arrow-left"></i><span class="btn-text">Вернуться к списку</span></a>
        
        <article class="article-page">
            <div class="article-header">
                <h1 class="article-title">${article.title}</h1>
                <div class="article-meta">
                    <div class="article-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
                    <div class="article-time"><i class="far fa-clock"></i> ${formattedTime}</div>
                </div>
                ${isAdmin ? `
                <div class="admin-buttons">
                    <button class="edit-btn" data-id="${article.id}" title="Редактировать"><i class="fas fa-edit"></i><span class="btn-text">Редактировать</span></button>
                    <button class="delete-btn" data-id="${article.id}" title="Удалить"><i class="fas fa-trash-alt"></i><span class="btn-text">Удалить</span></button>
                </div>
                ` : ''}
            </div>
            <div class="article-content">${article.content}</div>
            
            <!-- Секция комментариев -->
            <div class="comments-section">
                <div class="comments-header">
                    <h3><i class="fas fa-comments"></i> Комментарии <span class="comments-count">0</span></h3>
                </div>
                
                <div class="comment-form">
                    <textarea id="comment-text" placeholder="Напишите ваш комментарий..."></textarea>
                    <div class="comment-form-footer">
                        <div class="comment-author">
                            <i class="fas fa-user"></i> 
                            ${authorName ? `<span>${authorName}</span>` : '<button id="set-name-btn">Указать имя</button>'}
                        </div>
                        <button id="submit-comment" ${!authorName ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane"></i>
                            <span class="btn-text">Отправить</span>
                        </button>
                    </div>
                    <div id="comment-cooldown" class="comment-time-left hidden">
                        <i class="fas fa-hourglass-half"></i> Вы сможете оставить следующий комментарий через <span id="cooldown-timer">5:00</span>
                    </div>
                </div>
                
                <div class="comments-list">
                    <!-- Здесь будут отображаться комментарии -->
                    <div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...</div>
                </div>
            </div>
        </article>
    `;
    
    document.querySelector('main').innerHTML = articleHTML;
    
    // Добавляем обработчики событий для кнопок админа
    if (isAdmin) {
        document.querySelector('.edit-btn').addEventListener('click', () => {
            editPost(article);
        });
        
        document.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить эту публикацию?')) {
                deletePost(article.id);
            }
        });
    }
    
    // После отображения статьи обновляем отображение имени автора
    updateAuthorNameDisplay();
    
    // Загружаем комментарии
    loadComments(article.id);
    
    // Добавляем обработчики для комментариев
    const commentTextarea = document.getElementById('comment-text');
    const submitCommentBtn = document.getElementById('submit-comment');
    const setNameBtn = document.getElementById('set-name-btn');
    
    if (setNameBtn) {
        setNameBtn.addEventListener('click', showNameModal);
    }
    
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', () => {
            // Если имя еще не установлено, сначала показываем модальное окно
            if (!authorName) {
                showNameModal();
                return;
            }
            submitComment(article.id);
        });
    }
    
    if (commentTextarea) {
        commentTextarea.addEventListener('keyup', () => {
            submitCommentBtn.disabled = !commentTextarea.value.trim() || !authorName;
        });
        
        // Автоматически фокусируемся на поле ввода комментария
        setTimeout(() => {
            commentTextarea.focus();
        }, 500);
    }
    
    // Проверяем кулдаун комментариев
    checkCommentCooldown();
}

// Загрузка комментариев
async function loadComments(postId) {
    try {
        const commentsList = document.querySelector('.comments-list');
        if (!commentsList) return;
        
        console.log('Начинаем загрузку комментариев для поста:', postId);
        commentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...</div>';
        
        // Проверяем существование таблицы комментариев
        console.log('Проверяем существование таблицы комментариев...');
        const { count, error: checkError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true });
            
        if (checkError) {
            console.error('Ошибка при проверке таблицы комментариев:', checkError);
            if (checkError.code === '42P01') {
                console.error('Таблица комментариев не существует!');
                commentsList.innerHTML = `
                    <div class="no-comments">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Функция комментариев недоступна. Таблица комментариев не существует.</p>
                    </div>
                `;
                
                // Скрываем форму комментариев
                const commentForm = document.querySelector('.comment-form');
                if (commentForm) {
                    commentForm.style.display = 'none';
                }
                
                return;
            }
        }
        
        console.log('Таблица комментариев существует, загружаем комментарии...');
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Ошибка при загрузке комментариев:', error);
            // Если таблица не существует
            if (error.code === '42P01') {
                commentsList.innerHTML = `
                    <div class="no-comments">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Функция комментариев недоступна. Необходимо создать таблицу комментариев в базе данных.</p>
                    </div>
                `;
                
                // Скрываем форму комментариев
                const commentForm = document.querySelector('.comment-form');
                if (commentForm) {
                    commentForm.style.display = 'none';
                }
                
                return;
            }
            throw error;
        }
        
        console.log('Комментарии загружены:', data);
        const commentsCount = document.querySelector('.comments-count');
        if (commentsCount) {
            commentsCount.textContent = data ? data.length : 0;
        }
        
        if (!data || data.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comments"></i>
                    <p>Пока нет комментариев. Будьте первым!</p>
                </div>
            `;
            return;
        }
        
        let commentsHTML = '';
        
        data.forEach(comment => {
            const date = new Date(comment.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const formattedTime = date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            commentsHTML += `
                <div class="comment" data-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-author-name">
                            <i class="fas fa-user"></i> ${comment.author_name}
                        </div>
                        <div class="comment-date">
                            ${formattedDate} в ${formattedTime}
                            ${isAdmin ? `<button class="delete-comment-btn" title="Удалить комментарий" data-id="${comment.id}"><i class="fas fa-trash-alt"></i></button>` : ''}
                        </div>
                    </div>
                    <div class="comment-content">
                        ${comment.content}
                    </div>
                </div>
            `;
        });
        
        commentsList.innerHTML = commentsHTML;
        
        // Добавляем обработчики для кнопок удаления комментариев
        if (isAdmin) {
            document.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const commentId = btn.dataset.id;
                    if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
                        deleteComment(commentId, postId);
                    }
                });
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        const commentsList = document.querySelector('.comments-list');
        if (commentsList) {
            commentsList.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке комментариев: ${error.message || 'Неизвестная ошибка'}</p>`;
        }
    }
}

// Удаление комментария (только для админа)
async function deleteComment(commentId, postId) {
    try {
        if (!isAdmin) {
            showNotification('У вас нет прав для удаления комментариев', 'error');
            return;
        }
        
        console.log('Удаление комментария с ID:', commentId);
        
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
            
        if (error) throw error;
        
        showNotification('Комментарий успешно удален', 'success');
        
        // Перезагружаем комментарии
        loadComments(postId);
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        showNotification('Ошибка при удалении комментария: ' + (error.message || 'Неизвестная ошибка'), 'error');
    }
}

// Отправка комментария
async function submitComment(postId) {
    try {
        console.log('Отправка комментария для поста:', postId);
        const commentText = document.getElementById('comment-text').value.trim();
        const submitCommentBtn = document.getElementById('submit-comment');
        
        if (!commentText) {
            showNotification('Пожалуйста, введите текст комментария', 'error');
            return;
        }
        
        if (!authorName) {
            showNameModal();
            return;
        }
        
        // Проверяем кулдаун
        const now = Date.now();
        const timeSinceLastComment = now - lastCommentTime;
        
        if (timeSinceLastComment < COMMENT_COOLDOWN) {
            const remainingTime = Math.ceil((COMMENT_COOLDOWN - timeSinceLastComment) / 1000);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            showNotification(`Вы сможете оставить следующий комментарий через ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, 'error');
            return;
        }
        
        // Добавляем анимацию загрузки
        const originalBtnText = submitCommentBtn.innerHTML;
        submitCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="btn-text">Отправка...</span>';
        submitCommentBtn.disabled = true;
        
        console.log('Отправляем комментарий в базу данных...');
        console.log('Данные комментария:', {
            post_id: postId,
            author_name: authorName,
            content: commentText,
            ip_address: userIP
        });
        
        const { data, error } = await supabase
            .from('comments')
            .insert([
                {
                    post_id: postId,
                    author_name: authorName,
                    content: commentText,
                    ip_address: userIP
                }
            ])
            .select();
            
        if (error) {
            console.error('Ошибка при отправке комментария:', error);
            // Если таблица не существует
            if (error.code === '42P01') {
                showNotification('Функция комментариев недоступна. Необходимо создать таблицу комментариев в базе данных.', 'error');
                
                // Восстанавливаем кнопку
                submitCommentBtn.innerHTML = originalBtnText;
                submitCommentBtn.disabled = false;
                
                // Скрываем форму комментариев
                const commentForm = document.querySelector('.comment-form');
                if (commentForm) {
                    commentForm.style.display = 'none';
                }
                
                return;
            }
            throw error;
        }
        
        console.log('Комментарий успешно добавлен:', data);
        
        // Обновляем время последнего комментария
        lastCommentTime = now;
        localStorage.setItem('last_comment_time', now.toString());
        
        // Очищаем поле ввода
        document.getElementById('comment-text').value = '';
        
        // Восстанавливаем кнопку
        submitCommentBtn.innerHTML = originalBtnText;
        submitCommentBtn.disabled = true;
        
        // Показываем уведомление
        showNotification('Комментарий успешно добавлен', 'success');
        
        // Обновляем кулдаун
        checkCommentCooldown();
        
        // Перезагружаем комментарии
        loadComments(postId);
    } catch (error) {
        console.error('Ошибка при отправке комментария:', error);
        showNotification('Ошибка при отправке комментария: ' + (error.message || 'Неизвестная ошибка'), 'error');
        
        // Восстанавливаем кнопку
        const submitCommentBtn = document.getElementById('submit-comment');
        if (submitCommentBtn) {
            submitCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span class="btn-text">Отправить</span>';
            submitCommentBtn.disabled = false;
        }
    }
}

// Показать модальное окно для ввода имени
function showNameModal() {
    // Проверяем, есть ли уже сохраненное имя для этого IP
    const ipData = JSON.parse(localStorage.getItem(IP_STORAGE_KEY) || '{}');
    if (ipData[userIP]) {
        // Если имя уже сохранено, не показываем модальное окно
        authorName = ipData[userIP];
        
        // Обновляем UI
        const commentAuthor = document.querySelector('.comment-author');
        if (commentAuthor) {
            commentAuthor.innerHTML = `<i class="fas fa-user"></i> <span>${authorName}</span>`;
        }
        
        // Разблокируем кнопку отправки комментария, если есть текст
        const submitCommentBtn = document.getElementById('submit-comment');
        const commentText = document.getElementById('comment-text');
        if (submitCommentBtn && commentText) {
            submitCommentBtn.disabled = !commentText.value.trim();
        }
        
        return;
    }
    
    nameModal.classList.remove('hidden');
    setTimeout(() => {
        authorNameInput.focus();
    }, 100);
    
    // Добавляем текст, объясняющий, что имя нельзя будет изменить
    const nameWarning = document.getElementById('name-warning');
    if (nameWarning) {
        nameWarning.textContent = 'Внимание! После сохранения имя нельзя будет изменить.';
    } else {
        const warningElem = document.createElement('p');
        warningElem.id = 'name-warning';
        warningElem.className = 'name-warning';
        warningElem.textContent = 'Внимание! После сохранения имя нельзя будет изменить.';
        
        const nameModalContent = document.querySelector('.modal-content');
        if (nameModalContent) {
            // Вставляем предупреждение перед кнопкой отправки
            const submitBtn = document.getElementById('submit-name');
            if (submitBtn) {
                nameModalContent.insertBefore(warningElem, submitBtn.parentNode);
            } else {
                nameModalContent.appendChild(warningElem);
            }
        }
    }
}

// Сохранить имя автора
function saveAuthorName() {
    const name = authorNameInput.value.trim();
    
    if (!name) {
        nameError.classList.remove('hidden');
        nameError.animate(
            [
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ],
            { duration: 300, iterations: 1 }
        );
        return;
    }
    
    // Сохраняем имя по IP адресу
    authorName = name;
    saveUserNameByIP(name);
    
    // Закрываем модальное окно
    nameModal.classList.add('hidden');
    nameError.classList.add('hidden');
    
    // Обновляем UI
    updateAuthorNameDisplay();
    
    showNotification('Имя успешно сохранено', 'success');
}

// Проверка кулдауна комментариев
function checkCommentCooldown() {
    const cooldownElement = document.getElementById('comment-cooldown');
    const submitCommentBtn = document.getElementById('submit-comment');
    const cooldownTimer = document.getElementById('cooldown-timer');
    
    if (!cooldownElement || !submitCommentBtn || !cooldownTimer) return;
    
    const now = Date.now();
    const timeSinceLastComment = now - lastCommentTime;
    
    if (timeSinceLastComment < COMMENT_COOLDOWN) {
        // Показываем кулдаун
        cooldownElement.classList.remove('hidden');
        submitCommentBtn.disabled = true;
        
        // Обновляем таймер
        updateCooldownTimer();
        
        // Запускаем интервал для обновления таймера
        if (commentCooldownTimer) {
            clearInterval(commentCooldownTimer);
        }
        
        commentCooldownTimer = setInterval(updateCooldownTimer, 1000);
    } else {
        // Скрываем кулдаун
        cooldownElement.classList.add('hidden');
        
        // Разблокируем кнопку, если есть текст
        const commentText = document.getElementById('comment-text');
        if (commentText) {
            submitCommentBtn.disabled = !commentText.value.trim() || !authorName;
        }
        
        // Останавливаем интервал
        if (commentCooldownTimer) {
            clearInterval(commentCooldownTimer);
            commentCooldownTimer = null;
        }
    }
}

// Обновление таймера кулдауна
function updateCooldownTimer() {
    const cooldownTimer = document.getElementById('cooldown-timer');
    if (!cooldownTimer) return;
    
    const now = Date.now();
    const timeSinceLastComment = now - lastCommentTime;
    const remainingTime = Math.max(0, COMMENT_COOLDOWN - timeSinceLastComment);
    
    if (remainingTime <= 0) {
        // Кулдаун закончился
        checkCommentCooldown();
        return;
    }
    
    // Форматируем оставшееся время
    const remainingSeconds = Math.ceil(remainingTime / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    cooldownTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Отображение текущей страницы постов
function displayCurrentPagePosts() {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const postsToDisplay = allPosts.slice(start, end);
    
    displayPosts(postsToDisplay);
}

// Обновление UI пагинации
function updatePaginationUI() {
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Отображение постов
function displayPosts(posts) {
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-posts"><i class="fas fa-inbox"></i> Нет публикаций</p>';
        return;
    }

    let postsHTML = '';
    
    posts.forEach(post => {
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
        
        // Извлекаем первые 150 символов контента для превью
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content;
        const textContent = tempDiv.textContent || tempDiv.innerText;
        const preview = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
        
        // Проверяем, защищен ли пост паролем
        const isPasswordProtected = post.password ? true : false;
        
        postsHTML += `
            <div class="post" data-id="${post.id}">
                <h3 class="post-title">
                    ${post.title}
                    ${isPasswordProtected ? '<i class="fas fa-lock" title="Защищено паролем"></i>' : ''}
                </h3>
                <div class="post-header">
                    <div class="post-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
                    <div class="post-time"><i class="far fa-clock"></i> ${formattedTime}</div>
            </div>
                <p class="post-preview">${preview}</p>
            <div class="post-footer">
                    <a href="?id=${post.id}" class="read-more" title="Читать далее"><i class="fas fa-arrow-right"></i><span class="btn-text">Читать далее</span></a>
                    ${isAdmin ? `
                    <div class="admin-buttons">
                        <button class="edit-btn" data-id="${post.id}" title="Редактировать"><i class="fas fa-edit"></i><span class="btn-text">Редактировать</span></button>
                        <button class="delete-btn" data-id="${post.id}" title="Удалить"><i class="fas fa-trash-alt"></i><span class="btn-text">Удалить</span></button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    postsContainer.innerHTML = postsHTML;
    
    // Добавляем обработчики событий для кнопок админа
    if (isAdmin) {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.id;
                const post = allPosts.find(p => p.id === postId);
                if (post) {
                editPost(post);
                }
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.id;
                if (confirm('Вы уверены, что хотите удалить эту публикацию?')) {
                    deletePost(postId);
                }
            });
        });
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для пагинации
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePaginationUI();
            displayCurrentPagePosts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePaginationUI();
            displayCurrentPagePosts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // Обработчики для входа в админ-панель
    loginBtn.addEventListener('click', () => {
        if (isAdmin) {
            showAdminPanel();
        } else {
            loginModal.classList.remove('hidden');
            setTimeout(() => {
            passwordInput.focus();
            }, 100);
        }
    });
    
    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        loginError.classList.add('hidden');
        passwordInput.value = '';
    });
    
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
    
    submitPasswordBtn.addEventListener('click', checkPassword);
    
    // Обработчики для админ-панели
    closeAdminBtn.addEventListener('click', hideAdminPanel);
    
        newPostBtn.addEventListener('click', () => {
            currentPostId = null;
            postTitleInput.value = '';
            editor.root.innerHTML = '';
            editorContainer.classList.remove('hidden');
            postTitleInput.focus();
        });
    
        savePostBtn.addEventListener('click', savePost);
    
        cancelPostBtn.addEventListener('click', () => {
            editorContainer.classList.add('hidden');
        });
    
    // Добавляем обработчик для закрытия по клику вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
            loginError.classList.add('hidden');
            passwordInput.value = '';
        }
    });
    
    // Добавляем обработчик для клавиши Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!loginModal.classList.contains('hidden')) {
                loginModal.classList.add('hidden');
                loginError.classList.add('hidden');
                passwordInput.value = '';
            }
            
            if (!adminPanel.classList.contains('hidden')) {
                hideAdminPanel();
            }
        }
    });
    
    // Обработчики для модального окна ввода имени
    if (closeNameModalBtn) {
        closeNameModalBtn.addEventListener('click', () => {
            nameModal.classList.add('hidden');
            nameError.classList.add('hidden');
        });
    }
    
    if (submitNameBtn) {
        submitNameBtn.addEventListener('click', saveAuthorName);
    }
    
    if (authorNameInput) {
        authorNameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                saveAuthorName();
            }
        });
    }
    
    // Добавляем обработчик для закрытия модального окна ввода имени по клику вне его
    window.addEventListener('click', (e) => {
        if (e.target === nameModal) {
            nameModal.classList.add('hidden');
            nameError.classList.add('hidden');
        }
    });
    
    // Обработчики для поиска
    if (searchInput) {
        // Поиск по нажатию Enter
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (closeSearchResultsBtn) {
        closeSearchResultsBtn.addEventListener('click', () => {
            searchResultsModal.classList.add('hidden');
            // Разблокируем прокрутку страницы
            document.body.style.overflow = 'auto';
        });
    }
    
    // Закрытие модальных окон по клику вне их содержимого
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        } else if (e.target === nameModal) {
            nameModal.classList.add('hidden');
        } else if (e.target === searchResultsModal) {
            searchResultsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
}

// Загрузка поста для редактирования
async function loadPostForEdit(id) {
    try {
        editorContainer.classList.add('loading-editor');
        
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        
        if (data) {
            postTitleInput.value = data.title;
            editor.root.innerHTML = data.content;
            currentPostId = data.id;
        } else {
            throw new Error('Публикация не найдена');
        }
        
        editorContainer.classList.remove('loading-editor');
    } catch (error) {
        console.error('Ошибка при загрузке публикации для редактирования:', error);
        showNotification('Ошибка при загрузке публикации: ' + (error.message || 'Неизвестная ошибка'), 'error');
        editorContainer.classList.remove('loading-editor');
        hideAdminPanel(); // Закрываем панель администратора при ошибке
    }
}

// Проверка статуса администратора
function checkAdminStatus() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken === 'true') {
        isAdmin = true;
        loginBtn.innerHTML = '<i class="fas fa-cog"></i><span class="btn-text">Админ панель</span>';
        loginBtn.title = 'Админ панель';
    }
}

// Проверка пароля
function checkPassword() {
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        localStorage.setItem('adminToken', 'true');
        loginBtn.innerHTML = '<i class="fas fa-cog"></i><span class="btn-text">Админ панель</span>';
        loginBtn.title = 'Админ панель';
        loginModal.classList.add('hidden');
        passwordInput.value = '';
        loginError.classList.add('hidden');
        
        // Перезагружаем страницу для обновления UI
        location.reload();
    } else {
        loginError.classList.remove('hidden');
        passwordInput.value = '';
        passwordInput.focus();
        
        // Анимация ошибки
        loginError.animate(
            [
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ],
            { duration: 300, iterations: 1 }
        );
    }
}

// Показ админ-панели
function showAdminPanel() {
            adminPanel.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Запрет прокрутки основной страницы
    
    // Анимация появления
    const adminContent = document.querySelector('.admin-content');
    adminContent.style.opacity = '0';
    adminContent.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        adminContent.style.opacity = '1';
        adminContent.style.transform = 'translateY(0)';
    }, 10);
}

// Скрытие админ-панели
function hideAdminPanel() {
    // Анимация скрытия
    const adminContent = document.querySelector('.admin-content');
    adminContent.style.opacity = '0';
    adminContent.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
            adminPanel.classList.add('hidden');
        document.body.style.overflow = ''; // Восстановление прокрутки
        
        // Скрываем редактор
            editorContainer.classList.add('hidden');
        
        // Сбрасываем значения полей
        postTitleInput.value = '';
        if (editor) {
            editor.root.innerHTML = '';
        }
        currentPostId = null;
    }, 300);
}

// Сохранение поста
async function savePost() {
    try {
    const title = postTitleInput.value.trim();
        const content = editor.root.innerHTML.trim();
        const password = postPasswordInput ? postPasswordInput.value.trim() : '';
    
    if (!title) {
            showNotification('Пожалуйста, введите заголовок публикации', 'error');
        postTitleInput.focus();
        return;
    }
    
        if (!content || content === '<p><br></p>') {
            showNotification('Пожалуйста, введите содержимое публикации', 'error');
        editor.focus();
        return;
    }
    
        // Добавляем анимацию загрузки
        savePostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="btn-text">Сохранение...</span>';
        savePostBtn.disabled = true;
        
        if (currentPostId) {
            // Обновление существующего поста
            const { error } = await supabase
                .from('posts')
                .update({
                    title,
                    content,
                    password: password || null // Если пароль пустой, сохраняем как null
                })
                .eq('id', currentPostId);
                
            if (error) throw error;
            
            showNotification('Публикация успешно обновлена', 'success');
        } else {
            // Создание нового поста
            const { error } = await supabase
                .from('posts')
                .insert([
                    {
                        title,
                        content,
                        password: password || null // Если пароль пустой, сохраняем как null
        }
                ]);
        
            if (error) throw error;
        
            showNotification('Публикация успешно создана', 'success');
        }
        
        // Сбрасываем значения полей
        postTitleInput.value = '';
        editor.root.innerHTML = '';
        currentPostId = null;
        
        // Скрываем редактор
        editorContainer.classList.add('hidden');
        
        // Восстанавливаем кнопку
        savePostBtn.innerHTML = '<i class="fas fa-floppy-disk"></i><span class="btn-text">Сохранить</span>';
        savePostBtn.disabled = false;
        
        // Перезагружаем посты
        loadPosts();
    } catch (error) {
        console.error('Ошибка при сохранении публикации:', error);
        showNotification('Ошибка при сохранении публикации: ' + (error.message || 'Неизвестная ошибка'), 'error');
        
        // Восстанавливаем кнопку
        savePostBtn.innerHTML = '<i class="fas fa-floppy-disk"></i><span class="btn-text">Сохранить</span>';
        savePostBtn.disabled = false;
    }
}

// Показ уведомления
function showNotification(message, type = 'info') {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Добавляем иконку в зависимости от типа уведомления
    let icon;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        default:
            icon = 'fas fa-info-circle';
    }
    
    notification.innerHTML = `<i class="${icon}"></i> ${message}`;
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Показываем уведомление с анимацией
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Автоматически скрываем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Удаляем элемент после завершения анимации
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Редактирование поста
function editPost(post) {
    showAdminPanel();
    
    setTimeout(() => {
        editorContainer.classList.remove('hidden');
        
        // Загружаем данные поста в редактор
    currentPostId = post.id;
    postTitleInput.value = post.title;
    postPasswordInput.value = post.password || '';
    
        // Добавляем эффект загрузки
        editorContainer.classList.add('loading-editor');
    
        setTimeout(() => {
            editor.root.innerHTML = post.content;
            editorContainer.classList.remove('loading-editor');
    
            // Устанавливаем фокус на заголовок
    postTitleInput.focus();
        }, 300);
    }, 300);
}

// Удаление поста
async function deletePost(id) {
    try {
        // Показываем уведомление о процессе удаления
        showNotification('Удаление публикации...', 'info');
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        showNotification('Публикация успешно удалена', 'success');
        
        // Если мы находимся на странице статьи, перенаправляем на главную
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        
        if (articleId === id) {
            window.location.href = 'index.html';
        } else {
            // Иначе просто обновляем список постов
        loadPosts();
        }
    } catch (error) {
        console.error('Ошибка при удалении публикации:', error);
        showNotification('Ошибка при удалении публикации: ' + (error.message || 'Неизвестная ошибка'), 'error');
    }
}

// Предотвращение копирования и масштабирования
function preventCopyAndZoom() {
    // Предотвращение контекстного меню
    document.addEventListener('contextmenu', (e) => {
        if (isAdmin) return; // Разрешаем контекстное меню для админа
        e.preventDefault();
    });
    
    // Предотвращение выделения текста
    document.addEventListener('selectstart', (e) => {
        if (isAdmin) return; // Разрешаем выделение для админа
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.classList.contains('ql-editor')) {
            return; // Разрешаем выделение в полях ввода
        }
        e.preventDefault();
    });
    
    // Предотвращение масштабирования на мобильных устройствах
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Предотвращение масштабирования с помощью колесика мыши
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Проверка соединения с базой данных
async function checkDatabaseConnection() {
    try {
        const { error } = await supabase.from('posts').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('Ошибка подключения к базе данных:', error);
            showNotification('Ошибка подключения к базе данных: ' + (error.message || 'Неизвестная ошибка'), 'error');
        } else {
            console.log('Подключение к базе данных успешно установлено');
            // Проверяем существование таблицы комментариев
            checkCommentsTable();
        }
    } catch (error) {
        console.error('Ошибка при проверке подключения к базе данных:', error);
        showNotification('Ошибка подключения к базе данных: ' + (error.message || 'Неизвестная ошибка'), 'error');
    }
}

// Проверка существования таблицы комментариев
async function checkCommentsTable() {
    try {
        // Пытаемся выполнить запрос к таблице комментариев
        const { error } = await supabase.from('comments').select('count', { count: 'exact', head: true });
        
        if (error) {
            // Если таблица не существует, показываем уведомление
            if (error.code === '42P01') { // Код ошибки для "таблица не существует"
                console.error('Таблица комментариев не существует:', error);
                showNotification('Функция комментариев недоступна. Пожалуйста, создайте таблицу комментариев в базе данных.', 'error');
            } else {
                console.error('Ошибка при проверке таблицы комментариев:', error);
            }
        } else {
            console.log('Таблица комментариев существует и доступна');
        }
    } catch (error) {
        console.error('Ошибка при проверке таблицы комментариев:', error);
    }
}

// Обновление отображения имени автора в интерфейсе
function updateAuthorNameDisplay() {
    // Находим все элементы с классом comment-author и обновляем их
    const commentAuthors = document.querySelectorAll('.comment-author');
    commentAuthors.forEach(element => {
        if (authorName) {
            element.innerHTML = `<i class="fas fa-user"></i> <span>${authorName}</span>`;
        }
    });
    
    // Разблокируем кнопки отправки комментариев, если есть текст
    const submitCommentBtns = document.querySelectorAll('#submit-comment');
    submitCommentBtns.forEach(btn => {
        const commentTextarea = btn.closest('.comment-form').querySelector('#comment-text');
        if (commentTextarea) {
            btn.disabled = !commentTextarea.value.trim() || !authorName;
        }
    });
    
    console.log('Отображение имени автора обновлено:', authorName);
}

// Функция поиска
async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Введите поисковый запрос', 'error');
        return;
    }
    
    if (query.length < 2) {
        showNotification('Поисковый запрос должен содержать минимум 2 символа', 'error');
        return;
    }
    
    try {
        // Блокируем прокрутку страницы при открытии модального окна
        document.body.style.overflow = 'hidden';
        
        // Показываем модальное окно результатов поиска с индикатором загрузки
        searchResultsModal.classList.remove('hidden');
        searchQueryDisplay.textContent = `Поиск по запросу: "${query}"`;
        searchResultsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Выполняется поиск...</div>';
        noResultsDiv.classList.add('hidden');
        
        console.log('Выполняем поиск по запросу:', query);
        
        // Загружаем все посты для поиска
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!posts || posts.length === 0) {
            searchResultsContainer.innerHTML = '';
            noResultsDiv.classList.remove('hidden');
            return;
        }
        
        // Выполняем поиск по заголовкам и содержимому
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
        
        // Оцениваем релевантность результатов
        const results = posts
            .map(post => {
                const title = post.title.toLowerCase();
                const content = stripHtml(post.content).toLowerCase();
                
                // Подсчитываем количество совпадений для каждого ключевого слова
                let relevance = 0;
                let matchesTitle = false;
                let matchesContent = false;
                
                keywords.forEach(keyword => {
                    // Совпадения в заголовке имеют больший вес
                    const titleMatches = (title.match(new RegExp(keyword, 'gi')) || []).length;
                    if (titleMatches > 0) {
                        matchesTitle = true;
                        relevance += titleMatches * 3; // Больший вес для заголовков
                    }
                    
                    // Совпадения в содержимом
                    const contentMatches = (content.match(new RegExp(keyword, 'gi')) || []).length;
                    if (contentMatches > 0) {
                        matchesContent = true;
                        relevance += contentMatches;
                    }
                });
                
                // Возвращаем пост с его релевантностью
                return {
                    post,
                    relevance,
                    matchesTitle,
                    matchesContent
                };
            })
            // Фильтруем результаты, где есть хотя бы одно совпадение
            .filter(item => item.relevance > 0)
            // Сортируем по релевантности
            .sort((a, b) => b.relevance - a.relevance);
        
        console.log(`Найдено ${results.length} результатов`);
        
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '';
            noResultsDiv.classList.remove('hidden');
            return;
        }
        
        // Отображаем результаты
        let resultsHTML = '';
        
        results.forEach(({ post }) => {
            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const title = highlightKeywords(post.title, keywords);
            const content = createSnippet(post.content, keywords);
            
            resultsHTML += `
                <div class="search-result-item">
                    <div class="search-result-title">
                        <a href="index.html?id=${post.id}">${title}</a>
                    </div>
                    <div class="search-result-snippet">${content}</div>
                    <div class="search-result-date">
                        <i class="far fa-calendar-alt"></i> ${formattedDate}
                    </div>
                </div>
            `;
        });
        
        searchResultsContainer.innerHTML = resultsHTML;
        
        // Добавляем обработчики для результатов поиска
        document.querySelectorAll('.search-result-item a').forEach(link => {
            link.addEventListener('click', () => {
                // Закрываем модальное окно при клике на результат
                searchResultsModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            });
        });
        
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        searchResultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Произошла ошибка при поиске: ${error.message || 'Неизвестная ошибка'}</p>
            </div>
        `;
    }
}

// Удаление HTML тегов из текста
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

// Подсветка ключевых слов в тексте
function highlightKeywords(text, keywords) {
    let result = text;
    // Сортируем ключевые слова по длине (от длинных к коротким)
    // чтобы избежать проблем с подсветкой вложенных слов
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(keyword => {
        if (keyword.length < 2) return; // Пропускаем слишком короткие слова
        
        const regex = new RegExp(escapeRegExp(keyword), 'gi');
        result = result.replace(regex, match => `<span class="search-highlight">${match}</span>`);
    });
    return result;
}

// Экранирование специальных символов для регулярных выражений
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Создание сниппета текста с подсветкой ключевых слов
function createSnippet(html, keywords) {
    const text = stripHtml(html);
    const maxLength = 200;
    
    // Ищем первое вхождение любого ключевого слова
    let firstIndex = -1;
    let matchedKeyword = '';
    
    keywords.forEach(keyword => {
        if (keyword.length < 2) return; // Пропускаем слишком короткие слова
        
        const index = text.toLowerCase().indexOf(keyword.toLowerCase());
        if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
            firstIndex = index;
            matchedKeyword = keyword;
        }
    });
    
    // Если ключевое слово не найдено, берем начало текста
    if (firstIndex === -1) {
        return highlightKeywords(text.substring(0, maxLength) + '...', keywords);
    }
    
    // Определяем начало и конец сниппета
    let start = Math.max(0, firstIndex - 60);
    let end = Math.min(text.length, firstIndex + matchedKeyword.length + 140);
    
    // Добавляем многоточие в начале и конце, если нужно
    let snippet = '';
    if (start > 0) snippet += '...';
    snippet += text.substring(start, end);
    if (end < text.length) snippet += '...';
    
    return highlightKeywords(snippet, keywords);
} 