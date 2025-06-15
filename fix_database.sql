-- Удаление существующих функций, если они есть
DROP FUNCTION IF EXISTS create_posts_table();
DROP FUNCTION IF EXISTS create_comments_table();

-- Проверка и создание таблицы posts, если она не существует
DO $$
BEGIN
    -- Проверяем существование таблицы posts
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts') THEN
        CREATE TABLE posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Включаем RLS для таблицы posts
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
        
        -- Создаем политики безопасности
        CREATE POLICY "Разрешить чтение всем" ON posts
            FOR SELECT USING (true);
        
        CREATE POLICY "Разрешить вставку аутентифицированным" ON posts
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Разрешить обновление аутентифицированным" ON posts
            FOR UPDATE USING (true);
        
        CREATE POLICY "Разрешить удаление аутентифицированным" ON posts
            FOR DELETE USING (true);
            
        RAISE NOTICE 'Таблица posts успешно создана';
    ELSE
        RAISE NOTICE 'Таблица posts уже существует';
    END IF;
END $$;

-- Проверка и создание таблицы comments, если она не существует
DO $$
BEGIN
    -- Проверяем существование таблицы comments
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
        CREATE TABLE comments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            comment_text TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Включаем RLS для таблицы comments
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        
        -- Создаем политики безопасности
        CREATE POLICY "Разрешить чтение комментариев всем" ON comments
            FOR SELECT USING (true);
        
        CREATE POLICY "Разрешить вставку комментариев всем" ON comments
            FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Разрешить удаление комментариев аутентифицированным" ON comments
            FOR DELETE USING (true);
            
        RAISE NOTICE 'Таблица comments успешно создана';
    ELSE
        RAISE NOTICE 'Таблица comments уже существует';
    END IF;
END $$;

-- Создание новой функции для создания таблицы comments
CREATE OR REPLACE FUNCTION create_comments_table()
RETURNS void AS $$
BEGIN
    -- Проверяем существование таблицы comments
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments') THEN
        CREATE TABLE comments (
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
            
        RAISE NOTICE 'Таблица comments успешно создана функцией';
    ELSE
        RAISE NOTICE 'Таблица comments уже существует';
    END IF;
END;
$$ LANGUAGE plpgsql; 