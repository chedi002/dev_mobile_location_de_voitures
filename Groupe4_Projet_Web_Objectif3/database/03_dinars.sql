-- =====================================================================
-- WIJHA – 03_dinars.sql : passage des prix de l'euro au dinar tunisien
-- Supabase > SQL Editor > New query > coller > Run
--
-- Renomme prix_jour_eur → prix_jour_tnd et depot_garantie_eur → depot_garantie_tnd,
-- puis convertit les montants au taux de 1 € = 3,4 DT :
--   - prix par jour arrondi au dinar ;
--   - dépôt de garantie arrondi à 50 DT.
-- Le site (js/supabase-data.js) lit les colonnes *_tnd dès qu'elles existent,
-- et applique la même conversion tant qu'elles n'existent pas.
--
-- Le script ne fait rien s'il a déjà été exécuté : on peut le relancer sans
-- risque de convertir deux fois.
-- =====================================================================

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vehicules'
               and column_name = 'prix_jour_eur') then

    -- La vue du catalogue (si elle existe) dépend des anciennes colonnes.
    drop view if exists public.vue_vehicules_catalogue;

    alter table public.vehicules rename column prix_jour_eur      to prix_jour_tnd;
    alter table public.vehicules rename column depot_garantie_eur to depot_garantie_tnd;

    update public.vehicules
       set prix_jour_tnd      = round(prix_jour_tnd * 3.4),
           depot_garantie_tnd = round(depot_garantie_tnd * 3.4 / 50) * 50;

    comment on column public.vehicules.prix_jour_tnd      is 'Prix par jour, en dinars tunisiens (DT)';
    comment on column public.vehicules.depot_garantie_tnd is 'Dépôt de garantie, en dinars tunisiens (DT)';
  end if;
end $$;

-- PostgREST (l'API de Supabase) recharge la structure pour voir les nouveaux noms.
notify pgrst, 'reload schema';

-- Vérification : les prix vont d'environ 68 DT à 476 DT par jour.
select min(prix_jour_tnd) as prix_min_dt, max(prix_jour_tnd) as prix_max_dt,
       min(depot_garantie_tnd) as depot_min_dt, max(depot_garantie_tnd) as depot_max_dt
from public.vehicules;
