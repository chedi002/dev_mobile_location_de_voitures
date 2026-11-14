# WIJHA — application Angular

Version Angular du site, qui remplace le prototype HTML/JS de `../archives/prototype-html/` (conservé tel quel,
c'est celui que décrit le livrable de l'Objectif 2).

**Angular 22**, composants autonomes (standalone), signaux, chargement des pages à la demande.
Les données passent par l'**API Express** (`../backend`, à lancer avant le site) ; la connexion
des comptes passe par **Supabase Auth** et les photos par Supabase Storage.

## Lancer

Il faut [Node.js](https://nodejs.org) 20 ou plus.

```
npm install      # une seule fois
npm start        # http://localhost:4200
npm run build    # version de production dans dist/wijha/browser
npm test         # tests unitaires (Vitest)
```

## Organisation

```
src/
├── index.html, styles.css         styles = CSS du prototype, réunis en une feuille
├── app/
│   ├── app.routes.ts              toutes les adresses du site
│   ├── core/
│   │   ├── flotte.service.ts      catalogue (GET /api/catalogue) et disponibilité
│   │   ├── auth.service.ts        comptes Supabase (connexion, inscription, profil)
│   │   ├── auth.guard.ts          pages réservées (comptes connectés, administrateurs)
│   │   ├── admin.service.ts       administration : toutes les réservations, flotte
│   │   ├── messages.service.ts    messages de contact et demandes de transfert
│   │   ├── notifications.service.ts notifications de confirmation (toasts)
│   │   ├── reservations.service.ts réservations du client (/api/reservations)
│   │   ├── stockage.service.ts    road-trip choisi, gardé dans le navigateur
│   │   ├── api.ts                 appels à l'API Express (jeton de connexion joint)
│   │   ├── outils.ts              dates, prix, options, clé publique Supabase (connexion)
│   │   └── modeles.ts             types (Vehicule, Voiture, Agence, Reservation…)
│   ├── layout/                    en-tête, pied de page, mise en page admin
│   ├── shared/                    carte Leaflet, icônes SVG, notifications, repli des photos
│   └── pages/                     une page = un composant
│       ├── accueil, voitures, voiture-detail, reservation, road-trip
│       ├── agences, tarifs, espace-client
│       ├── formulaires/           contact, transfert, connexion, inscription
│       ├── statiques/             faq, services, promotions, conditions, confidentialité
│       └── admin/                 tableau de bord, flotte, réservations, messages
└── public/images/                 logo, hero, destinations, services (crédits dans CREDITS.md)
```

## Adresses

| Adresse | Page |
|---|---|
| `/` | accueil |
| `/voitures` · `/voitures/:id` | catalogue · fiche véhicule |
| `/reservation` | parcours en 4 étapes |
| `/road-trip`, `/agences`, `/tarifs`, `/promotions`, `/services`, `/transfert` | |
| `/faq`, `/contact`, `/conditions`, `/confidentialite` | |
| `/connexion`, `/inscription`, `/nouveau-mot-de-passe` | comptes |
| `/espace-client` | réservé aux comptes connectés |
| `/admin` · `/admin/flotte` · `/admin/reservations` · `/admin/messages` | administration (administrateurs seulement, sinon `/acces-refuse`) |

Les paramètres passent par l'adresse (`/voitures?depart=Sousse&cat=suv`, `/reservation?vehicule=22`)
et arrivent dans les pages comme `input()` grâce à `withComponentInputBinding()`.

## Comptes (Supabase Auth)

`core/auth.service.ts` gère l'inscription, la connexion, la déconnexion, le mot de passe oublié
et le profil (prénom, nom, téléphone, rangés dans les métadonnées du compte). `/espace-client`
est protégé par `connecteGuard` : sans session, renvoi vers `/connexion?retour=…`.

Réglages à faire dans le tableau de bord Supabase, **Authentication** :

- **URL Configuration** : *Site URL* = l'adresse du site (`http://localhost:4200` en local) et,
  dans *Redirect URLs*, ajouter `http://localhost:4200/**` — sinon les liens de confirmation et
  de mot de passe oublié renvoient vers une mauvaise adresse.
- **E-mails** : sans serveur SMTP personnalisé, Supabase n'envoie les e-mails qu'aux membres de
  l'organisation, avec un débit très limité. Pour les tests, on peut désactiver *Confirm email*
  (Sign In / Providers → Email) ; pour la mise en ligne, configurer un SMTP (Brevo, Resend…).

## Réservations, messages et administration

Toutes ces données passent par l'API (`../backend/README.md`, tableau des routes) :

- **Réservation** : `POST /api/reservations`. Le serveur attribue une voiture libre, calcule le prix
  et envoie le récapitulatif par e-mail ; le site n'affiche qu'une estimation.
- **Espace client** : `GET /api/reservations/moi`, annulation par `POST /api/reservations/:ref/annuler`.
- **Formulaires** : `POST /api/contact` et `POST /api/transferts`.
- **Administration** : routes `/api/admin/…`, réservées aux comptes de la table `admins`
  (vérifié par l'API) ; `adminGuard` empêche en plus d'afficher les pages.

## Tests

`npm test` lance les tests unitaires (Vitest, fichiers `*.spec.ts`) :

- `core/outils.spec.ts` : durée de location par tranche de 24 h, recommandation de catégorie,
  montant des options, format des prix ;
- `core/flotte.service.spec.ts` : disponibilité réelle (réservations qui se chevauchent, agence,
  voitures en location ou en entretien) ;
- `core/notifications.service.spec.ts` : affichage et disparition des notifications.

## Ce qui reste à brancher
- Le total d'une réservation est calculé par le site ; la base ne le recalcule pas encore.
- Hébergement : une application Angular a besoin que le serveur renvoie `index.html` pour toute
  adresse inconnue (Netlify, Vercel, Firebase Hosting le font en une ligne de configuration).
