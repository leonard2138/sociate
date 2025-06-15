-- Проверяем существование таблицы posts перед созданием
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- Создание таблицы для хранения постов
        CREATE TABLE public.posts (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          title text NOT NULL,
          content text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        -- Настройка RLS (Row Level Security)
        ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

        -- Политики безопасности
        CREATE POLICY "Публичный доступ на чтение постов"
          ON public.posts FOR SELECT
          USING (true);

        -- Политика для анонимных пользователей (так как мы используем пароль в клиенте)
        CREATE POLICY "Анонимный доступ на вставку"
          ON public.posts FOR INSERT
          TO anon
          WITH CHECK (true);

        CREATE POLICY "Анонимный доступ на обновление"
          ON public.posts FOR UPDATE
          TO anon
          USING (true);

        CREATE POLICY "Анонимный доступ на удаление"
          ON public.posts FOR DELETE
          TO anon
          USING (true);

        -- Индекс для ускорения сортировки по дате
        CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);

        -- Комментарий к таблице
        COMMENT ON TABLE public.posts IS 'Таблица для хранения блоговых постов';
        
        RAISE NOTICE 'Таблица posts успешно создана';
    ELSE
        RAISE NOTICE 'Таблица posts уже существует';
    END IF;
END
$$;

-- Проверяем существование таблицы comments перед созданием
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
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
        RAISE NOTICE 'Таблица comments уже существует';
    END IF;
END
$$; 