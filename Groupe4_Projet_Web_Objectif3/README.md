# WIJHA — Location de voitures en Tunisie

**Groupe 4** — Mohamed Yassine Kamoun, Chedi Ben Salem
SUP'COM, module Projet Web — Dr. Maroua Nouioua

WIJHA (وجهة, « destination ») est un site de location de voitures en Tunisie : catalogue de la
flotte, réservation en quatre étapes avec prix détaillé, planificateur de road-trip, six agences
sur carte, espace client et administration de l'agence.

> **Livrable de l'Objectif 3** — développement et intégration des fonctionnalités principales.

| Dossier | Contenu |
|---|---|
| [`frontend/`](frontend/) | le site, en **Angular 22** |
| [`backend/`](backend/) | l'API REST, en **Express 5 / Node.js** |
| [`database/`](database/) | les scripts SQL de la base **PostgreSQL** (Supabase) |

```
frontend (Angular)  ──►  backend (Express / Node.js)  ──►  PostgreSQL (Supabase)
        └── connexion des comptes ──► Supabase Auth
```

---

## Choix techniques

| Couche | Technologie | Pourquoi |
|---|---|---|
| Frontend | **Angular 22** (TypeScript) | Framework complet : composants, routage, formulaires, services et injection de dépendances sont fournis, sans bibliothèque supplémentaire. Sa structure imposée convient à un site de 20 pages avec espace client et administration, développé à deux. TypeScript détecte les erreurs avant l'exécution. |
| Gestion d'état | **Signaux Angular** | État réactif simple : quand une donnée change (filtre, dates, options), les prix et la disponibilité se recalculent seuls. |
| Backend | **Express 5 sur Node.js** | API REST écrite en JavaScript : catalogue, réservations, formulaires et administration. Le serveur vérifie les droits, valide chaque donnée, **calcule lui-même le prix** des réservations et envoie les e-mails. Même langage que le frontend, écosystème npm, simple à tester (Vitest + Supertest). |
| Services | **Supabase** | Héberge la base PostgreSQL, gère les **comptes** (inscription, connexion, mot de passe oublié — plus sûr que de les réécrire) et stocke les photos. L'API vérifie les jetons de connexion avec la clé publique du projet. |
| Base de données | **PostgreSQL** | Données relationnelles (véhicules, agences, réservations, comptes) et règles garanties par la base : une contrainte d'exclusion interdit qu'une même voiture soit réservée deux fois sur des dates qui se chevauchent. |
| Cartographie | **Leaflet** + fond Esri | Carte des agences gratuite et sans clé d'API. |

---

## Fonctionnalités développées

**Catalogue et réservation**
- Catalogue de la flotte lu par l'API : filtres (type de voyage, agence, catégorie, boîte,
  places, budget), tri, prix par jour ou total selon les dates, comparateur de 3 véhicules.
- Disponibilité réelle : un modèle est proposé s'il reste une voiture libre à l'agence choisie
  pour les dates demandées.
- Fiche véhicule : caractéristiques, équipements, calcul du prix avec options, véhicules similaires.
- Réservation en 4 étapes avec « ticket de voyage » mis à jour en direct, recommandation de
  catégorie selon voyageurs et bagages, options (GPS, siège bébé, chauffeur, retour ailleurs).
- À la confirmation, le serveur attribue une voiture précise, calcule le prix et bloque les dates ;
  référence unique, e-mail récapitulatif, ajout au calendrier (.ics), impression.

**Comptes clients**
- Inscription avec e-mail de confirmation, connexion, « rester connecté », mot de passe oublié.
- Espace client : réservations et leur statut, annulation avant le départ, profil modifiable.

**Administration (comptes administrateurs uniquement)**
- Tableau de bord : demandes à traiter, chiffre d'affaires confirmé, état de la flotte.
- Gestion des réservations : confirmer, refuser, clôturer (le client est prévenu par e-mail).
- Gestion de la flotte : prix, dépôt, statut et agence de chaque voiture.
- Messages de contact et demandes de transfert, avec suivi « traité / à traiter ».

**Formulaires**
- Contact et demande de transfert aéroport, enregistrés et transmis à l'agence.
- Validation de chaque champ (dans le navigateur et sur le serveur) avec messages clairs ;
  notifications de confirmation après les actions principales.

**Autres pages**
- Road-trip : cinq circuits, itinéraire jour par jour, budget (location, carburant, péages).
- Agences sur carte interactive, tarifs calculés depuis la flotte, services, FAQ, conditions,
  confidentialité.
- Prix en dinars tunisiens, site responsive (téléphone, tablette, ordinateur).

---

## Lancer le projet

**Prérequis :** [Node.js](https://nodejs.org) 22 ou plus. Deux terminaux : un pour l'API, un pour le site.

**1. L'API** (terminal 1)

```
cd backend
npm install
npm start
```

L'API lit sa connexion à la base dans `backend/.env`. **Ce fichier est fourni avec le livrable
(zip)** : rien à configurer. Il n'est jamais versionné sur GitHub ; depuis le dépôt, le créer avec
`copy .env.example .env` puis renseigner `DATABASE_URL` (Supabase → **Connect** →
**Connection string** → *Session pooler*, avec le mot de passe de la base).
L'API écoute sur **http://localhost:3000/api**.

**2. Le site** (terminal 2)

```
cd frontend
npm install
npm start
```

Le site s'ouvre sur **http://localhost:4200**.

- Version de production : `npm run build` dans `frontend` (résultat dans `dist/wijha/browser`).
- Tests : `npm test` dans chaque dossier.
  - `frontend` (Vitest) : durée de location, recommandation de catégorie, options, disponibilité
    réelle des véhicules, notifications ;
  - `backend` (Vitest + Supertest) : calcul des prix, validation, accès connecté /
    administrateur, réservation, routes de l'API.
- Au premier `npm start`, Angular demande s'il peut envoyer des statistiques d'usage : répondre `N`.
- Sous Windows, si PowerShell refuse `npm` (« l'exécution de scripts est désactivée »), taper
  `npm.cmd` à la place, ou utiliser l'invite de commandes.

### Recréer la base sur un autre projet Supabase

1. Exécuter dans le **SQL Editor**, dans l'ordre, les scripts de `database/` :
   `01_schema.sql` → `02_seed.sql` → `03_dinars.sql` → `04_reservations.sql` → `05_admin.sql`
   → `06_messages.sql` → `07_nettoyage.sql`.
2. Dans **Authentication → URL Configuration**, ajouter `http://localhost:4200/**` aux *Redirect URLs*.
3. Créer le bucket public `vehicules` (Storage) et y déposer les photos de la flotte (dans le dépôt
   GitHub : `archives/prototype-html/images/vehicules/`).
4. Reporter l'URL et la clé publique du projet dans `frontend/src/app/core/outils.ts`, et la
   chaîne de connexion dans `backend/.env`.

### Devenir administrateur

Après s'être inscrit sur le site, exécuter dans le SQL Editor :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'votre.adresse@exemple.com';
```

---

## Organisation

```
├── README.md      ce document
├── frontend/      site Angular        → frontend/README.md (architecture, pages, tests)
├── backend/       API Express          → backend/README.md (routes, .env, sécurité)
├── database/      scripts SQL 01 à 07  → database/README.md
└── archives/      étapes précédentes du projet (dépôt GitHub uniquement, hors livrable)
```

`archives/` regroupe les énoncés, les livrables des Objectifs 1 et 2, la conception (cahier des
charges, diagrammes UML) et le prototype HTML/CSS/JS de l'Objectif 2. Voir `archives/README.md`.

---

## Limites connues

- Les e-mails ne partent réellement que si un serveur SMTP est configuré dans `backend/.env` ;
  sinon ils s'affichent dans le terminal de l'API.
- Aucun paiement en ligne : la réservation est une demande, confirmée ensuite par l'agence.
- Les données de la flotte (prix, immatriculations) sont simulées.

Photos : Wikimedia Commons, licences libres — crédits dans `frontend/public/images/*/CREDITS.md`
et, pour la flotte, dans `archives/conception/donnees/photos-a-collecter.csv`.
