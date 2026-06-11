create extension if not exists vector;

create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding vector(1024) not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_question text not null,
  ai_answer text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chat_logs(id) on delete cascade,
  score int not null check (score in (-1, 1)),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_base_embedding_idx
on knowledge_base
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create index if not exists chat_logs_created_at_idx
on chat_logs (created_at desc);

create index if not exists feedback_chat_id_idx
on feedback (chat_id);

create or replace function match_knowledge_base(
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.created_at,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where 1 - (knowledge_base.embedding <=> query_embedding) >= match_threshold
  order by knowledge_base.embedding <=> query_embedding
  limit match_count;
$$;
