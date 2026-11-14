# WIJHA — API Express (Node.js)

Le backend de WIJHA : une API REST en **Express 5** sur **Node.js**, connectée à la base
**PostgreSQL** hébergée par Supabase. Le site Angular (`../frontend`) l'appelle pour toutes ses
données ; seule la connexion des comptes passe directement par Supabase Auth.

```
Angular (frontend)  ──►  API Express (backend)  ──►  PostgreSQL (Supabase)
        │                        │
        └── connexion ──► Supabase Auth   (l'API vérifie le jeton de l'utilisateur)
```

## Lancer

Prérequis : Node.js 22 ou plus.

```
cd backend
npm install
copy .env.example .env      # puis renseigner DATABASE_URL (voir ci-dessous)
npm start                   # http://localhost:3000/api
```

Puis, dans un second terminal, lancer le site (`cd frontend` puis `npm start`).

- `npm run dev` : redémarre l'API à chaque modification du code.
- `npm test` : tests (Vitest + Supertest), sans base de données.

### Le fichier `.env`

Il contient les secrets et **n'est jamais versionné** (voir `.gitignore`). Seule `DATABASE_URL`
est obligatoire :

1. Supabase → bouton **Connect** (en haut de la page du projet) → onglet **Connection string**.
2. Copier la chaîne **Session pooler** (port 5432).
3. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base (Project Settings → Database ;
   il peut y être réinitialisé).

Les e-mails sont facultatifs : sans `SMTP_HOST`, ils sont affichés dans le terminal de l'API.

## Routes

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/sante` | public | état du serveur |
| GET | `/api/catalogue` | public | catégories, agences, voitures et modèles regroupés |
| GET | `/api/occupations` | public | créneaux déjà réservés (sans dire par qui) |
| GET | `/api/moi` | connecté | identité et rôle (administrateur ou non) |
| POST | `/api/reservations` | connecté | créer une réservation |
| GET | `/api/reservations/moi` | connecté | mes réservations |
| POST | `/api/reservations/:ref/annuler` | connecté | annuler avant le départ |
| POST | `/api/contact` | public | message du formulaire de contact |
| POST | `/api/transferts` | public | demande de transfert aéroport |
| GET | `/api/admin/reservations` | administrateur | toutes les réservations |
| PATCH | `/api/admin/reservations/:ref` | administrateur | confirmer, refuser, clôturer |
| PATCH | `/api/admin/vehicules/:id` | administrateur | prix, dépôt, statut, agence |
| GET | `/api/admin/messages` | administrateur | messages et demandes de transfert |
| PATCH | `/api/admin/messages/:type/:id` | administrateur | marquer traité / à traiter |

Les erreurs sont renvoyées sous la forme `{ "erreur": "message lisible" }`, avec le code HTTP
adapté (400 données invalides, 401 connexion requise, 403 réservé, 404, 409 conflit).

## Ce que fait le serveur

- **Réservation** : dans une transaction, choisit la première voiture libre du modèle à l'agence
  de départ (verrou `FOR UPDATE SKIP LOCKED`), **calcule le prix lui-même** (le total envoyé par
  le navigateur est ignoré) et enregistre ; la contrainte d'exclusion de la base reste le dernier
  rempart contre les doubles réservations. Un e-mail récapitulatif est envoyé au client et à l'agence.
- **Comptes** : le jeton de connexion Supabase est vérifié avec la clé publique du projet
  (ES256, `/auth/v1/.well-known/jwks.json`) : aucun secret d'authentification à stocker.
- **Droits** : les routes `/api/admin` vérifient que le compte figure dans la table `admins`.
- **Validation** : chaque donnée reçue est contrôlée (zod), avec un message d'erreur en français.
- **Sécurité** : en-têtes HTTP (helmet), origine autorisée (CORS), limite d'envois répétés sur
  les formulaires et les réservations, taille des requêtes limitée.

## Organisation

```
src/
├── serveur.js          point d'entrée : connexion à la base, démarrage
├── app.js              application Express (routes, sécurité) — testable sans base
├── config.js           variables d'environnement
├── db.js               PostgreSQL (pg) : requêtes et transactions
├── auth.js             vérification des jetons, accès connecté / administrateur
├── tarifs.js           calcul des prix, regroupement du catalogue par modèle
├── validation.js       schémas de validation des données reçues
├── email.js            envoi des e-mails (ou affichage dans le terminal)
├── erreurs.js          erreurs HTTP et gestionnaire d'erreurs
└── routes/             catalogue, reservations, messages, admin
test/
├── tarifs.test.js      calcul des prix et regroupement
└── api.test.js         routes : validation, accès, réservation, administration
```
