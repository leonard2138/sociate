-- Создание таблицы для хранения постов
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Настройка RLS (Row Level Security)
alter table public.posts enable row level security;

-- Политики безопасности
create policy "Публичный доступ на чтение постов"
  on public.posts for select
  using (true);

-- Политика для анонимных пользователей (так как мы используем пароль в клиенте)
create policy "Анонимный доступ на вставку"
  on public.posts for insert
  to anon
  with check (true);

create policy "Анонимный доступ на обновление"
  on public.posts for update
  to anon
  using (true);

create policy "Анонимный доступ на удаление"
  on public.posts for delete
  to anon
  using (true);

-- Индекс для ускорения сортировки по дате
create index posts_created_at_idx on public.posts (created_at desc);

-- Комментарий к таблице
comment on table public.posts is 'Таблица для хранения блоговых постов'; 