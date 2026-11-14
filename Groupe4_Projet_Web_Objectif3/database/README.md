# WIJHA – Base de données véhicules (Tunisie)

**240 véhicules** · 6 agences · 7 catégories · 6 états de disponibilité.
Données d'exemple : prix, dépôts de garantie et matricules sont fictifs.

## Ce qui a changé
1. **Matricules** : tous au format `NNN TUN NNNN` avec une série **≥ 240** (de 240 à 289), tous uniques.
   La règle est aussi imposée par la base (contrainte `vehicules_immat_serie_min_240`).
2. **États de disponibilité** : 6 au lieu de 4 → `disponible`, `reserve`, `loue`, `en_transfert`, `maintenance`, `inactif`.
3. **Flotte** : 70 modèles adaptés au marché tunisien (Kia Picanto, Renault Clio / Symbol, Peugeot 208 / 301,
   Dacia Duster / Logan / Jogger, Hyundai Accent / Tucson, Toyota Corolla / Hilux / Land Cruiser, Chery, MG,
   Mercedes, BMW, Audi…) répartis selon le profil de chaque agence (4x4 à Djerba, premium à La Marsa, etc.).
4. Nouvelle catégorie **Premium** (id 7).

## Répartition
| État | Nombre |
|---|---|
| disponible | 129 |
| reserve | 23 |
| loue | 55 |
| en_transfert | 9 |
| maintenance | 15 |
| inactif | 9 |

| Agence | Véhicules |
|---|---|
| WIJHA Tunis | 56 |
| WIJHA La Marsa | 36 |
| WIJHA Sousse | 42 |
| WIJHA Monastir | 32 |
| WIJHA Mahdia | 24 |
| WIJHA Djerba | 50 |

## Scripts, dans l'ordre

À exécuter dans Supabase, **SQL Editor → New query → coller → Run**, un script après l'autre :

| Script | Rôle |
|---|---|
| `01_schema.sql` | Tables `categories`, `agences`, `statuts_vehicule`, `vehicules`, vue du catalogue |
| `02_seed.sql` | Données d'exemple (flotte, agences, catégories) |
| `03_dinars.sql` | Prix en dinars : colonnes `prix_jour_tnd` et `depot_garantie_tnd` |
| `04_reservations.sql` | Réservations liées aux comptes, sans chevauchement possible |
| `05_admin.sql` | Droits administrateur (table `admins`) |
| `06_messages.sql` | Messages de contact et demandes de transfert |
| `07_nettoyage.sql` | Retire les fonctions SQL remplacées par l'API Express et l'ancienne table archivée |

Ordre obligatoire : chaque script s'appuie sur les précédents.

## Structure
```
categories (id, code, nom, description)
agences (id, nom, ville, adresse, telephone, horaires, latitude, longitude)
statuts_vehicule (code, libelle, description, reservable)
vehicules (id, marque, modele, annee, categorie_id → categories, places, portes, bagages_valises,
           transmission, carburant, climatisation, prix_jour_eur, depot_garantie_eur,
           agence_id → agences, immatriculation (unique), statut → statuts_vehicule,
           equipements text[], tags_voyage text[], image_principale, description, created_at, updated_at)
vue_vehicules_catalogue  → vue avec catégorie, agence et libellé de statut déjà joints
```
La lecture est publique (RLS activé) ; l'écriture passe par la clé `service_role` ou vos propres policies.

## Exemple d'appel depuis le site
```js
const { data } = await supabase
  .from('vue_vehicules_catalogue')
  .select('*')
  .eq('ville', 'Djerba')
  .eq('reservable', true)
  .contains('tags_voyage', ['sud']);
```

## À compléter
- Les photos de la flotte sont dans le bucket Supabase `vehicules` (voir `../archives/conception/donnees/`).
