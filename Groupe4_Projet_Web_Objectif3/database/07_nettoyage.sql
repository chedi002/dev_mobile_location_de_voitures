-- =====================================================================
-- WIJHA – 07_nettoyage.sql : retrait de ce qui ne sert plus depuis l'API Express
-- Supabase > SQL Editor > New query > coller > Run
--
-- Depuis l'API (Projet Web/7-backend), le site ne crée, n'annule et ne lit plus les
-- réservations par des fonctions SQL : le serveur le fait lui-même. Ces fonctions restaient
-- appelables depuis l'extérieur sans utilité ; on les retire.
--
-- Conservé volontairement :
--   - est_admin() : utilisée par les règles de sécurité (RLS) des réservations, de la flotte
--     et des messages ; la supprimer supprimerait aussi ces règles ;
--   - toutes les règles RLS : seconde protection si quelqu'un interroge la base directement ;
--   - la contrainte anti-chevauchement de la table reservations.
-- =====================================================================

-- 1) Fonctions remplacées par l'API
drop function if exists public.creer_reservation(
    bigint[], text, text, timestamptz, timestamptz, text[], jsonb, numeric, text, smallint, smallint, text, text, text, text, text);
drop function if exists public.annuler_reservation(text);
drop function if exists public.periodes_occupees();
drop function if exists public.changer_statut_reservation(text, text);

-- 2) Ancienne table « reservations » (autre modèle), mise de côté par 04_reservations.sql
drop table if exists archive.reservations cascade;
-- Le schéma archive est retiré s'il est désormais vide (sinon, il est laissé tel quel).
do $$
begin
    if exists (select 1 from information_schema.schemata where schema_name = 'archive')
       and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'archive') then
        drop schema archive;
    end if;
end $$;

notify pgrst, 'reload schema';
