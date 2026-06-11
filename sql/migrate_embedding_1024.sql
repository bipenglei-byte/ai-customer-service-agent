create extension if not exists vector;

drop index if exists knowledge_base_embedding_idx;
drop function if exists match_knowledge_base(vector(1536), float, int);
drop function if exists match_knowledge_base(vector(1024), float, int);

truncate table knowledge_base;

alter table knowledge_base
alter column embedding drop not null;

alter table knowledge_base
alter column embedding type vector(1024)
using null;

alter table knowledge_base
alter column embedding set not null;

create index if not exists knowledge_base_embedding_idx
on knowledge_base
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

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
