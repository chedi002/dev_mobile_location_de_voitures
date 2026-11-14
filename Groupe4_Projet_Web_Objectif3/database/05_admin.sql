-- =====================================================================
-- WIJHA – 05_admin.sql : droits administrateur (agence)
-- Supabase > SQL Editor > New query > coller > Run
-- (après 04_reservations.sql ; suppose 03_dinars.sql exécuté : colonnes *_tnd)
--
--   - admins : liste des comptes administrateurs ;
--   - est_admin() : vrai si le compte connecté en fait partie ;
--   - un admin lit toutes les réservations et change leur statut
--     (changer_statut_reservation) ;
--   - un admin modifie la flotte (prix, dépôt, statut, agence) ;
--   - un client ordinaire ne peut rien de tout cela, même en appelant l'API directement.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Table des administrateurs
-- ---------------------------------------------------------------------
create table if not exists public.admins (
    user_id     uuid primary key references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now()
);
comment on table public.admins is 'Comptes autorisés à gérer les réservations et la flotte';

alter table public.admins enable row level security;
-- Chacun peut seulement vérifier s'il est lui-même admin ; aucune écriture par l'API.
drop policy if exists "admin se voit" on public.admins;
create policy "admin se voit" on public.admins
    for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2) est_admin()
-- ---------------------------------------------------------------------
create or replace function public.est_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Réservations : un admin lit tout et change le statut
-- ---------------------------------------------------------------------
drop policy if exists "admin lit toutes les reservations" on public.reservations;
create policy "admin lit toutes les reservations" on public.reservations
    for select to authenticated using (public.est_admin());

create or replace function public.changer_statut_reservation(p_ref text, p_statut text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
    n int;
begin
    if not public.est_admin() then
        raise exception 'Réservé aux administrateurs' using errcode = '42501';
    end if;
    if p_statut not in ('en_attente', 'confirmee', 'annulee', 'terminee') then
        raise exception 'Statut inconnu : %', p_statut using errcode = '22023';
    end if;
    -- Remettre en attente ou confirmer une réservation annulée peut créer un chevauchement :
    -- la contrainte d'exclusion de la table le refusera (erreur 23P01).
    update public.reservations set statut = p_statut where ref = p_ref;
    get diagnostics n = row_count;
    return n > 0;
end $$;
revoke all on function public.changer_statut_reservation(text, text) from public;
grant execute on function public.changer_statut_reservation(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4) Flotte : un admin modifie les voitures
--    (la lecture publique existante n'est pas touchée)
-- ---------------------------------------------------------------------
-- RLS activée (sinon les règles ci-dessous ne protégeraient rien), lecture publique garantie
-- pour que le catalogue reste visible.
alter table public.vehicules enable row level security;
drop policy if exists "lecture publique flotte" on public.vehicules;
create policy "lecture publique flotte" on public.vehicules
    for select to anon, authenticated using (true);

drop policy if exists "admin modifie la flotte" on public.vehicules;
create policy "admin modifie la flotte" on public.vehicules
    for update to authenticated using (public.est_admin()) with check (public.est_admin());

-- Seules ces colonnes sont modifiables depuis le site.
revoke update on public.vehicules from anon, authenticated;
grant update (prix_jour_tnd, depot_garantie_tnd, statut, agence_id) on public.vehicules to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5) Nommer un administrateur : remplacez l'adresse puis exécutez cette ligne.
--    (Le compte doit déjà exister : inscrivez-vous d'abord sur le site.)
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'votre.adresse@exemple.com'
-- on conflict do nothing;
