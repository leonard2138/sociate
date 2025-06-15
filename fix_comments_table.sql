-- Проверка существования таблицы comments и её создание при необходимости
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Проверяем существование таблицы comments
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comments'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Создаем таблицу comments...';
        
        -- Создание таблицы для хранения комментариев
        CREATE TABLE public.comments (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          author_name text NOT NULL,
          content text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        -- Настройка RLS для комментариев
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

        -- Политики безопасности для комментариев
        CREATE POLICY "Публичный доступ на чтение комментариев"
          ON public.comments FOR SELECT
          USING (true);

        CREATE POLICY "Анонимный доступ на вставку комментариев"
          ON public.comments FOR INSERT
          TO anon
          WITH CHECK (true);

        -- Индекс для ускорения выборки комментариев по посту
        CREATE INDEX comments_post_id_idx ON public.comments (post_id);
        CREATE INDEX comments_created_at_idx ON public.comments (created_at DESC);

        -- Комментарий к таблице
        COMMENT ON TABLE public.comments IS 'Таблица для хранения комментариев к постам';
        
        RAISE NOTICE 'Таблица comments успешно создана';
    ELSE
        RAISE NOTICE 'Таблица comments уже существует, проверяем политики безопасности...';
        
        -- Проверяем и добавляем политики безопасности, если они отсутствуют
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'comments' 
            AND policyname = 'Публичный доступ на чтение комментариев'
        ) THEN
            CREATE POLICY "Публичный доступ на чтение комментариев"
              ON public.comments FOR SELECT
              USING (true);
            RAISE NOTICE 'Добавлена политика для чтения комментариев';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'comments' 
            AND policyname = 'Анонимный доступ на вставку комментариев'
        ) THEN
            CREATE POLICY "Анонимный доступ на вставку комментариев"
              ON public.comments FOR INSERT
              TO anon
              WITH CHECK (true);
            RAISE NOTICE 'Добавлена политика для вставки комментариев';
        END IF;
        
        -- Проверяем включен ли RLS
        IF NOT EXISTS (
            SELECT FROM pg_tables 
            WHERE tablename = 'comments' 
            AND rowsecurity = true
        ) THEN
            ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
            RAISE NOTICE 'Включена защита на уровне строк (RLS)';
        END IF;
    END IF;
    
    -- Проверяем наличие тестовых данных
    IF NOT EXISTS (SELECT FROM public.comments LIMIT 1) THEN
        RAISE NOTICE 'Добавляем тестовый комментарий для проверки...';
        
        -- Получаем ID первого поста
        DECLARE
            first_post_id uuid;
        BEGIN
            SELECT id INTO first_post_id FROM public.posts LIMIT 1;
            
            IF first_post_id IS NOT NULL THEN
                INSERT INTO public.comments (post_id, author_name, content)
                VALUES (first_post_id, 'Тестовый пользователь', 'Это тестовый комментарий для проверки работы системы комментариев.');
                RAISE NOTICE 'Тестовый комментарий добавлен';
            ELSE
                RAISE NOTICE 'Нет постов для добавления тестового комментария';
            END IF;
        END;
    END IF;
    
    -- Выводим информацию о таблице
    RAISE NOTICE 'Информация о таблице comments:';
    RAISE NOTICE 'Количество комментариев: %', (SELECT COUNT(*) FROM public.comments);
END
$$; 