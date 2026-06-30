-- Fix: garante que upserts em `profiles` autenticados como auth.uid() = id
-- consigam INSERT e UPDATE. As policies originais cobriam só `using` no UPDATE
-- e a migracao de INSERT foi adicionada depois — esta migração é idempotente
-- e re-cria tudo com `using` E `with check`, evitando 42501 no fluxo de
-- onboarding anônimo (signInAnonymously → upsert).

-- INSERT
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- UPDATE (with check garante que o id permaneça o do dono)
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
