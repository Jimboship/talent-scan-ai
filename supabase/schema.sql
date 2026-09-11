-- TalentScan AI — run this in the Supabase SQL Editor (Dashboard → SQL).
-- Requires: Authentication enabled. Re-running this file is safe (idempotent).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text not null,
  extracted_text text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resumes_user_id_fkey'
      and conrelid = 'public.resumes'::regclass
  ) then
    alter table public.resumes
      add constraint resumes_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

create index if not exists resumes_user_id_idx
  on public.resumes (user_id);

create index if not exists resumes_embedding_idx
  on public.resumes using hnsw (embedding vector_cosine_ops);

alter table public.resumes enable row level security;

drop policy if exists "Users can view own resumes" on public.resumes;
create policy "Users can view own resumes"
  on public.resumes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
  on public.resumes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own resumes" on public.resumes;
create policy "Users can update own resumes"
  on public.resumes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
  on public.resumes
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Semantic search: cosine similarity, scoped to the signed-in user, top 10
-- similarity = 1 - cosine distance (1.0 = identical)
-- ---------------------------------------------------------------------------
create or replace function public.match_resumes(
  query_embedding vector(1536),
  match_count int default 10
)
returns table (
  id uuid,
  file_name text,
  extracted_text text,
  created_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.file_name,
    r.extracted_text,
    r.created_at,
    (1 - (r.embedding <=> query_embedding))::double precision as similarity
  from public.resumes r
  where r.user_id = auth.uid()
    and r.embedding is not null
  order by r.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 10), 1), 10);
$$;

grant execute on function public.match_resumes(vector, int) to authenticated;
revoke all on function public.match_resumes(vector, int) from public, anon;

-- ---------------------------------------------------------------------------
-- Storage: private bucket. Objects are stored as {user_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own resume files" on storage.objects;
create policy "Users can update own resume files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
