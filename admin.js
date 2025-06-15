// Инициализация Supabase
const SUPABASE_URL = 'https://ahvfmhkspoyshehnluxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodmZtaGtzcG95c2hlaG5sdXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODYzNDMsImV4cCI6MjA2NTU2MjM0M30.t9su19GG5ra0iV2WaVEz4P0_wVonf5xWTXqy-9ooJ18';
const ADMIN_PASSWORD = 'leo563903W';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM элементы
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');
const adminContent = document.getElementById('adminContent');
const noAccess = document.getElementById('noAccess');
const postTitle = document.getElementById('postTitle');
const editor = document.getElementById('editor');
const publishBtn = document.getElementById('publishBtn');
const toSiteBtn = document.getElementById('toSiteBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeButtons = document.querySelectorAll('.close');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');

// Инициализация приложения
async function init() {
    // Проверка авторизации
    checkAuthStatus();
    
    // Инициализация обработчиков событий
    initEventHandlers();
    
    // Инициализация редактора
    initEditor();
    
    // Инициализация вкладок
    initTabs();
    
    // Обновление времени и даты
    updateDateTime();
    setInterval(updateDateTime, 60000); // Обновление каждую минуту
    
    // Загрузка статей для управления
    loadAdminPosts();
    
    // Инициализация базы данных
    await initDatabase();
}

// Проверка статуса авторизации
function checkAuthStatus() {
    const isAdmin = localStorage.getItem('isAdmin');
    const expiresAt = parseInt(localStorage.getItem('adminSessionExpires') || '0');
    
    if (isAdmin === 'true' && expiresAt > Date.now()) {
        activateAdminMode();
    } else {
        // Если сессия истекла, удаляем данные
        if (isAdmin) {
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminSessionExpires');
        }
        
        deactivateAdminMode();
    }
}

// Функция для активации режима администратора
function activateAdminMode() {
    adminContent.classList.remove('hidden');
    noAccess.classList.add('hidden');
    loginModal.style.display = 'none';
}

// Функция для деактивации режима администратора
function deactivateAdminMode() {
    adminContent.classList.add('hidden');
    noAccess.classList.remove('hidden');
}

// Инициализация обработчиков событий
function initEventHandlers() {
    // Обработчик для кнопки входа
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
        passwordInput.focus();
    });
    
    // Обработчик для кнопки выхода
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminSessionExpires');
        deactivateAdminMode();
    });
    
    // Обработчик для кнопки возврата на сайт
    toSiteBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Обработчик для кнопки отправки пароля
    submitPassword.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            // Сохраняем сессию в localStorage
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminSessionExpires', Date.now() + 24 * 60 * 60 * 1000); // 24 часа
            
            activateAdminMode();
        } else {
            alert('Неверный пароль');
        }
    });
    
    // Обработчик для закрытия модальных окон
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Обработчик для клика вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
    });
    
    // Обработчик для кнопки публикации/сохранения
    publishBtn.addEventListener('click', async () => {
        const editingId = document.getElementById('editingPostId').value;
        
        if (editingId) {
            // Режим редактирования
            await updatePost(editingId);
        } else {
            // Режим создания нового поста
            await publishPost();
        }
    });
    
    // Обработчик для кнопки очистки
    document.getElementById('clearBtn').addEventListener('click', clearEditor);
    
    // Обработчик для клавиши Enter в поле пароля
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            submitPassword.click();
        }
    });
}

// Инициализация редактора
function initEditor() {
    const buttons = document.querySelectorAll('.tool-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const command = this.dataset.command;
            
            if (command === 'createLink') {
                const url = prompt('Введите URL ссылки:');
                if (url) document.execCommand(command, false, url);
            } else if (command === 'insertImage') {
                const url = prompt('Введите URL изображения:');
                if (url) document.execCommand(command, false, url);
            } else {
                document.execCommand(command, false, null);
            }
            
            editor.focus();
        });
    });
}

// Инициализация вкладок
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаляем активный класс у всех кнопок и содержимого вкладок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            button.classList.add('active');
            
            // Активируем соответствующее содержимое вкладки
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}Tab`).classList.add('active');
            
            // Если это вкладка управления, загружаем список статей
            if (tabId === 'manage') {
                loadAdminPosts();
            }
        });
    });
}

// Обновление времени и даты
function updateDateTime() {
    const now = new Date();
    
    // Форматирование времени (часы:минуты)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}`;
    
    // Форматирование даты (день.месяц.год)
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    currentDateElement.textContent = `${day}.${month}.${year}`;
}

// Создание таблицы в Supabase, если её нет
async function initDatabase() {
    try {
        // Проверяем существование таблицы posts
        const { data, error } = await supabase
            .from('posts')
            .select('id')
            .limit(1);
            
        if (error && error.code === '42P01') {
            // Таблица не существует, создаем её
            await supabase.rpc('create_posts_table');
        }
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
    }
}

// Публикация поста
async function publishPost() {
    if (!postTitle.value.trim() || !editor.innerHTML.trim()) {
        alert('Заполните заголовок и содержание статьи');
        return;
    }
    
    const newPost = {
        title: postTitle.value.trim(),
        content: editor.innerHTML,
        created_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase
            .from('posts')
            .insert([newPost]);
            
        if (error) throw error;
        
        alert('Статья успешно опубликована!');
        clearEditor();
        loadAdminPosts();
    } catch (error) {
        console.error('Ошибка при публикации статьи:', error);
        alert('Ошибка при публикации статьи');
    }
}

// Обновление поста
async function updatePost(postId) {
    if (!postTitle.value.trim() || !editor.innerHTML.trim()) {
        alert('Заполните заголовок и содержание статьи');
        return;
    }
    
    const updatedPost = {
        title: postTitle.value.trim(),
        content: editor.innerHTML
    };
    
    try {
        const { data, error } = await supabase
            .from('posts')
            .update(updatedPost)
            .eq('id', postId);
            
        if (error) throw error;
        
        alert('Статья успешно обновлена!');
        clearEditor();
        loadAdminPosts();
    } catch (error) {
        console.error('Ошибка при обновлении статьи:', error);
        alert('Ошибка при обновлении статьи');
    }
}

// Загрузка списка статей для админ-панели
async function loadAdminPosts() {
    const adminPostsList = document.getElementById('adminPostsList');
    adminPostsList.innerHTML = '<div class="loading">Загрузка статей...</div>';
    
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (data.length === 0) {
            adminPostsList.innerHTML = '<div class="loading">Нет опубликованных статей</div>';
            return;
        }
        
        adminPostsList.innerHTML = '';
        
        data.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'admin-post-item';
            
            // Формируем HTML для элемента списка - только с кнопками редактирования и удаления
            postItem.innerHTML = `
                <div class="admin-post-actions">
                    <button class="action-btn edit" data-id="${post.id}" title="Редактировать">
                        <i class="fas fa-edit"></i> ${post.title}
                    </button>
                    <button class="action-btn delete" data-id="${post.id}" title="Удалить">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            // Добавляем обработчики для кнопок редактирования и удаления
            const editBtn = postItem.querySelector('.edit');
            const deleteBtn = postItem.querySelector('.delete');
            
            editBtn.addEventListener('click', () => {
                editPost(post);
            });
            
            deleteBtn.addEventListener('click', () => {
                deletePost(post.id);
            });
            
            adminPostsList.appendChild(postItem);
        });
    } catch (error) {
        console.error('Ошибка при загрузке статей:', error);
        adminPostsList.innerHTML = '<div class="loading">Ошибка при загрузке статей</div>';
    }
}

// Редактирование поста
function editPost(post) {
    // Переключаемся на вкладку создания
    document.querySelector('.tab-btn[data-tab="create"]').click();
    
    // Заполняем поля формы данными поста
    postTitle.value = post.title;
    editor.innerHTML = post.content;
    document.getElementById('editingPostId').value = post.id;
    
    // Меняем текст кнопки публикации
    publishBtn.textContent = 'Сохранить изменения';
    
    // Прокручиваем к редактору
    document.querySelector('.editor-container').scrollIntoView({ behavior: 'smooth' });
}

// Удаление поста
async function deletePost(postId) {
    if (confirm('Вы действительно хотите удалить эту статью?')) {
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);
                
            if (error) throw error;
            
            alert('Статья успешно удалена!');
            loadAdminPosts();
        } catch (error) {
            console.error('Ошибка при удалении статьи:', error);
            alert('Ошибка при удалении статьи');
        }
    }
}

// Очистка формы редактора
function clearEditor() {
    postTitle.value = '';
    editor.innerHTML = '';
    document.getElementById('editingPostId').value = '';
    publishBtn.textContent = 'Опубликовать';
}

// Запуск инициализации
document.addEventListener('DOMContentLoaded', init); 