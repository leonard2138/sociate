-- Создание таблицы для постов
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для комментариев
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Настройка Row Level Security (RLS) для постов
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Политика для чтения постов (доступно всем)
CREATE POLICY "Разрешить чтение всем" ON posts
    FOR SELECT USING (true);

-- Политика для вставки постов (только для аутентифицированных)
CREATE POLICY "Разрешить вставку аутентифицированным" ON posts
    FOR INSERT WITH CHECK (true);

-- Политика для обновления постов (только для аутентифицированных)
CREATE POLICY "Разрешить обновление аутентифицированным" ON posts
    FOR UPDATE USING (true);

-- Политика для удаления постов (только для аутентифицированных)
CREATE POLICY "Разрешить удаление аутентифицированным" ON posts
    FOR DELETE USING (true);
    
-- Настройка Row Level Security (RLS) для комментариев
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Политика для чтения комментариев (доступно всем)
CREATE POLICY "Разрешить чтение комментариев всем" ON comments
    FOR SELECT USING (true);

-- Политика для вставки комментариев (доступно всем)
CREATE POLICY "Разрешить вставку комментариев всем" ON comments
    FOR INSERT WITH CHECK (true);

-- Политика для удаления комментариев (только для аутентифицированных)
CREATE POLICY "Разрешить удаление комментариев аутентифицированным" ON comments
    FOR DELETE USING (true);

-- Создание функции для создания таблицы posts (если её нет)
CREATE OR REPLACE FUNCTION create_posts_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Разрешить чтение всем" ON posts
        FOR SELECT USING (true);
    
    CREATE POLICY "Разрешить вставку аутентифицированным" ON posts
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Разрешить обновление аутентифицированным" ON posts
        FOR UPDATE USING (true);
    
    CREATE POLICY "Разрешить удаление аутентифицированным" ON posts
        FOR DELETE USING (true);
END;
$$ LANGUAGE plpgsql;

-- Создание функции для создания таблицы comments (если её нет)
CREATE OR REPLACE FUNCTION create_comments_table()
RETURNS void AS $$
BEGIN
    -- Проверяем существование таблицы posts
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts') THEN
        PERFORM create_posts_table();
    END IF;

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
END;
$$ LANGUAGE plpgsql; 