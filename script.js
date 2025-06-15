// Инициализация Supabase
const SUPABASE_URL = 'https://ahvfmhkspoyshehnluxp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodmZtaGtzcG95c2hlaG5sdXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODYzNDMsImV4cCI6MjA2NTU2MjM0M30.t9su19GG5ra0iV2WaVEz4P0_wVonf5xWTXqy-9ooJ18';
const ADMIN_PASSWORD = 'leo563903W';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM элементы
const loginBtn = document.getElementById('loginBtn');
const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const passwordInput = document.getElementById('passwordInput');
const submitPassword = document.getElementById('submitPassword');
const postsContainer = document.getElementById('posts');
const postModal = document.getElementById('postModal');
const modalPostContent = document.getElementById('modalPostContent');
const fullPostView = document.getElementById('fullPostView');
const postContent = document.getElementById('postContent');
const backToListBtn = document.getElementById('backToList');
const commentsList = document.getElementById('commentsList');
const commentName = document.getElementById('commentName');
const commentText = document.getElementById('commentText');
const submitComment = document.getElementById('submitComment');
const closeButtons = document.querySelectorAll('.close');
const paginationContainer = document.getElementById('pagination');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');

// Константы
const POSTS_PER_PAGE = 12; // Количество постов на странице
let currentPage = 1;
let totalPosts = 0;
let totalPages = 0;

// Запрет масштабирования страницы
document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) { 
        event.preventDefault();
    }
}, { passive: false });

// Запрет копирования текста
document.addEventListener('copy', function(e) {
    e.preventDefault();
    return false;
});

// Модальные окна
function initModals() {
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
        passwordInput.focus();
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === postModal) postModal.style.display = 'none';
    });
}

// Аутентификация с сохранением сессии
function initAuth() {
    // Проверка, авторизован ли пользователь
    checkAuthStatus();
    
    submitPassword.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            // Сохраняем сессию в localStorage
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminSessionExpires', Date.now() + 24 * 60 * 60 * 1000); // 24 часа
            
            // Перенаправляем на админ-панель
            window.location.href = 'admin.html';
        } else {
            alert('Неверный пароль');
        }
    });
    
    // Кнопка перехода в админ-панель
    adminBtn.addEventListener('click', () => {
        const isAdmin = localStorage.getItem('isAdmin');
        const expiresAt = parseInt(localStorage.getItem('adminSessionExpires') || '0');
        
        if (isAdmin === 'true' && expiresAt > Date.now()) {
            // Если пользователь авторизован, перенаправляем на админ-панель
            window.location.href = 'admin.html';
        } else {
            // Если не авторизован, показываем окно входа
            loginModal.style.display = 'block';
            passwordInput.focus();
        }
    });
    
    // Проверка статуса авторизации
    function checkAuthStatus() {
        const isAdmin = localStorage.getItem('isAdmin');
        const expiresAt = parseInt(localStorage.getItem('adminSessionExpires') || '0');
        
        if (!(isAdmin === 'true' && expiresAt > Date.now())) {
            // Если сессия истекла, удаляем данные
            if (isAdmin) {
                localStorage.removeItem('isAdmin');
                localStorage.removeItem('adminSessionExpires');
            }
        }
    }
    
    // Обработчик для клавиши Enter в поле пароля
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            submitPassword.click();
        }
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

// Загрузка постов
async function loadPosts(page = 1) {
    postsContainer.innerHTML = '<div class="loading">Загрузка статей...</div>';
    currentPage = page;
    
    try {
        // Получаем общее количество постов для пагинации
        const { count, error: countError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });
            
        if (countError) throw countError;
        
        totalPosts = count;
        totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
        
        // Получаем посты для текущей страницы
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .range((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE - 1);
            
        if (error) throw error;
        
        if (data.length === 0) {
            postsContainer.innerHTML = '<div class="loading">Нет опубликованных статей</div>';
            paginationContainer.style.display = 'none';
            return;
        }
        
        postsContainer.innerHTML = '';
        
        data.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';
            postCard.setAttribute('data-id', post.id);
            
            // Извлекаем первое изображение из содержимого, если оно есть
            const imgRegex = /<img[^>]+src="([^">]+)"/i;
            const imgMatch = post.content.match(imgRegex);
            const imgSrc = imgMatch ? imgMatch[1] : '';
            
            // Извлекаем текст для отрывка (без HTML тегов)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const textContent = tempDiv.textContent.trim();
            const excerpt = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
            
            // Форматируем дату
            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Формируем HTML для карточки
            postCard.innerHTML = `
                ${imgSrc ? `<img src="${imgSrc}" alt="${post.title}">` : ''}
                <div class="post-info">
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-date">${formattedDate}</div>
                    <p class="post-excerpt">${excerpt}</p>
                </div>
            `;
            
            // Добавляем обработчик клика
            postCard.addEventListener('click', () => {
                showPost(post);
            });
            
            postsContainer.appendChild(postCard);
        });
        
        // Создаем пагинацию
        createPagination(currentPage, totalPages);
    } catch (error) {
        console.error('Ошибка при загрузке статей:', error);
        postsContainer.innerHTML = '<div class="loading">Ошибка при загрузке статей</div>';
    }
}

// Создание пагинации
function createPagination(currentPage, totalPages) {
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    // Максимальное количество кнопок страниц (не считая кнопок навигации)
    const maxPageButtons = 5;
    
    // Создаем кнопку "Назад"
    const prevButton = document.createElement('button');
    prevButton.className = 'page-nav-btn';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            loadPosts(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // Определяем диапазон страниц для отображения
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // Корректируем начальную страницу, если достигли конца
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    // Создаем кнопки для страниц
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'page-btn';
        pageButton.textContent = i;
        
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        
        pageButton.addEventListener('click', () => {
            loadPosts(i);
        });
        
        paginationContainer.appendChild(pageButton);
    }
    
    // Создаем кнопку "Вперед"
    const nextButton = document.createElement('button');
    nextButton.className = 'page-nav-btn';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            loadPosts(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// Показ статьи
function showPost(post) {
    // Скрываем список статей и показываем полную статью
    postsContainer.style.display = 'none';
    paginationContainer.style.display = 'none';
    fullPostView.classList.remove('hidden');
    
    // Форматируем дату
    const date = new Date(post.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Заполняем содержимое
    postContent.innerHTML = `
        <h1>${post.title}</h1>
        <div class="post-date">${formattedDate}</div>
        ${post.content}
    `;
    
    // Загружаем комментарии
    loadComments(post.id);
    
    // Настраиваем форму отправки комментариев
    setupCommentSubmit(post.id);
    
    // Прокручиваем страницу вверх
    window.scrollTo(0, 0);
}

// Загрузка комментариев
async function loadComments(postId) {
    commentsList.innerHTML = '<div class="loading">Загрузка комментариев...</div>';
    
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
            
        if (error) {
            if (error.code === '42P01') {
                // Таблица не существует, создаем её
                await initCommentsDatabase();
                commentsList.innerHTML = '<div class="loading">Нет комментариев</div>';
                return;
            }
            throw error;
        }
        
        if (!data || data.length === 0) {
            commentsList.innerHTML = '<div class="loading">Нет комментариев</div>';
            return;
        }
        
        // Очищаем список
        commentsList.innerHTML = '';
        
        // Проверяем, нужна ли оптимизация для мобильных устройств
        if (window.optimizeComments && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            window.optimizeComments(commentsList, data);
        } else {
            // Добавляем комментарии
            data.forEach(comment => {
                renderComment(commentsList, comment);
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        commentsList.innerHTML = '<div class="loading">Ошибка при загрузке комментариев</div>';
    }
}

// Настройка отправки комментариев
function setupCommentSubmit(postId) {
    // Удаляем предыдущие обработчики, если они есть
    submitComment.removeEventListener('click', submitCommentHandler);
    
    // Очищаем поля формы
    commentName.value = '';
    commentText.value = '';
    
    // Добавляем новый обработчик
    submitComment.addEventListener('click', submitCommentHandler);
    
    async function submitCommentHandler() {
        if (!commentName.value.trim() || !commentText.value.trim()) {
            alert('Пожалуйста, заполните имя и текст комментария');
            return;
        }
        
        const newComment = {
            post_id: postId,
            author_name: commentName.value.trim(),
            comment_text: commentText.value.trim(),
            created_at: new Date().toISOString()
        };
        
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([newComment]);
                
            if (error) {
                if (error.code === '42P01') {
                    // Таблица не существует, создаем её
                    await initCommentsDatabase();
                    // Повторяем попытку добавления
                    const { data, error: retryError } = await supabase
                        .from('comments')
                        .insert([newComment]);
                        
                    if (retryError) throw retryError;
                } else {
                    throw error;
                }
            }
            
            // Очищаем поля формы
            commentName.value = '';
            commentText.value = '';
            
            // Перезагружаем комментарии
            loadComments(postId);
        } catch (error) {
            console.error('Ошибка при отправке комментария:', error);
            alert('Ошибка при отправке комментария');
        }
    }
}

// Удаление комментария
async function deleteComment(commentId, postId) {
    if (confirm('Вы действительно хотите удалить этот комментарий?')) {
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
                
            if (error) throw error;
            
            // Перезагружаем комментарии
            loadComments(postId);
        } catch (error) {
            console.error('Ошибка при удалении комментария:', error);
            alert('Ошибка при удалении комментария');
        }
    }
}

// Инициализация базы данных для комментариев
async function initCommentsDatabase() {
    try {
        // Проверяем существование таблицы comments
        const { data, error } = await supabase
            .from('comments')
            .select('id')
            .limit(1);
            
        if (error && error.code === '42P01') {
            // Таблица не существует, создаем её
            const { error: rpcError } = await supabase.rpc('create_comments_table');
            
            if (rpcError) {
                console.error('Ошибка при создании таблицы комментариев:', rpcError);
                
                // Выполняем SQL напрямую, если RPC не сработал
                const { error: sqlError } = await supabase.sql(`
                    CREATE TABLE IF NOT EXISTS comments (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                        author_name TEXT NOT NULL,
                        comment_text TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    
                    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
                    
                    CREATE POLICY "Разрешить чтение комментариев всем" ON comments
                        FOR SELECT USING (true);
                    
                    CREATE POLICY "Разрешить вставку комментариев всем" ON comments
                        FOR INSERT WITH CHECK (true);
                    
                    CREATE POLICY "Разрешить удаление комментариев аутентифицированным" ON comments
                        FOR DELETE USING (true);
                `);
                
                if (sqlError) {
                    console.error('Ошибка при прямом создании таблицы комментариев:', sqlError);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при инициализации базы данных комментариев:', error);
    }
}

// Оптимизация производительности для мобильных устройств
function optimizeForMobile() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Отложенная загрузка некритичных элементов
        window.addEventListener('load', function() {
            // Отложенная загрузка изображений
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
            });
            
            // Оптимизация событий прокрутки
            let scrollTimeout;
            window.addEventListener('scroll', function() {
                if (!scrollTimeout) {
                    scrollTimeout = setTimeout(function() {
                        scrollTimeout = null;
                        // Обработка событий прокрутки с ограничением частоты
                    }, 100);
                }
            }, { passive: true });
            
            // Упрощаем анимации
            document.body.classList.add('mobile-optimized');
        });
        
        // Оптимизация обработчиков событий для сенсорного ввода
        document.querySelectorAll('.btn, .tool-btn, .action-btn').forEach(button => {
            // Удаляем эффекты наведения
            button.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            
            button.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            });
        });
    }
}

// Оптимизация для просмотра статей
function optimizePostView() {
    // Ограничиваем количество одновременно отображаемых комментариев
    const MAX_VISIBLE_COMMENTS = 10;
    
    // Функция для оптимизации отображения комментариев
    window.optimizeComments = function(commentsList, comments) {
        if (!comments || !comments.length) return;
        
        if (comments.length > MAX_VISIBLE_COMMENTS) {
            // Показываем только первые MAX_VISIBLE_COMMENTS комментариев
            const visibleComments = comments.slice(0, MAX_VISIBLE_COMMENTS);
            const remainingCount = comments.length - MAX_VISIBLE_COMMENTS;
            
            // Очищаем список
            commentsList.innerHTML = '';
            
            // Добавляем видимые комментарии
            visibleComments.forEach(comment => {
                renderComment(commentsList, comment);
            });
            
            // Добавляем кнопку "Показать еще"
            if (remainingCount > 0) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'btn load-more-btn';
                loadMoreBtn.textContent = `Показать еще ${remainingCount} комментариев`;
                loadMoreBtn.addEventListener('click', function() {
                    // Показываем все комментарии
                    commentsList.innerHTML = '';
                    comments.forEach(comment => {
                        renderComment(commentsList, comment);
                    });
                });
                commentsList.appendChild(loadMoreBtn);
            }
        } else {
            // Если комментариев немного, показываем их все
            commentsList.innerHTML = '';
            comments.forEach(comment => {
                renderComment(commentsList, comment);
            });
        }
    };
}

// Функция для рендеринга одного комментария
function renderComment(container, comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    
    // Форматируем дату
    const date = new Date(comment.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Проверяем, авторизован ли админ для отображения кнопки удаления
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const deleteButton = isAdmin ? 
        `<div class="comment-actions">
            <button class="delete-comment" data-id="${comment.id}">
                <i class="fas fa-trash"></i> Удалить
            </button>
        </div>` : '';
    
    // Формируем HTML комментария
    commentEl.innerHTML = `
        <div class="comment-header">
            <div class="comment-author">${comment.author_name}</div>
            <div class="comment-date">${formattedDate}</div>
        </div>
        <div class="comment-text">${comment.comment_text}</div>
        ${deleteButton}
    `;
    
    // Добавляем обработчик для кнопки удаления, если она есть
    const deleteBtn = commentEl.querySelector('.delete-comment');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteComment(comment.id, comment.post_id);
        });
    }
    
    container.appendChild(commentEl);
}

// Инициализация оптимизаций
function initOptimizations() {
    optimizeForMobile();
    optimizePostView();
    
    // Добавляем класс для определения типа устройства
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile-device');
    } else {
        document.body.classList.add('desktop-device');
    }
}

// Инициализация приложения
async function init() {
    initModals();
    initAuth();
    initOptimizations();
    
    // Обработчик для кнопки возврата к списку статей
    backToListBtn.addEventListener('click', () => {
        fullPostView.classList.add('hidden');
        postsContainer.style.display = 'grid';
        paginationContainer.style.display = 'flex';
    });
    
    // Инициализация базы данных и загрузка постов
    await initDatabase();
    await initCommentsDatabase();
    loadPosts();
    
    // Обновление времени и даты
    updateDateTime();
    setInterval(updateDateTime, 60000); // Обновление каждую минуту
}

// Запуск инициализации
document.addEventListener('DOMContentLoaded', init); 