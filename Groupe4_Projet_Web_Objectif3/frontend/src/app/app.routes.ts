import { Routes } from '@angular/router';
import { adminGuard, connecteGuard } from './core/auth.guard';
import { MiseEnPageAdmin, MiseEnPageSite } from './layout/mises-en-page';

const t = (titre: string) => `${titre} – WIJHA`;

/* Chaque page est chargée à la demande (loadComponent). */
export const routes: Routes = [
  {
    path: 'admin',
    component: MiseEnPageAdmin,
    canActivate: [adminGuard],
    children: [
      { path: '', title: t('Tableau de bord'), loadComponent: () => import('./pages/admin/tableau').then(m => m.Tableau) },
      { path: 'flotte', title: t('Flotte'), loadComponent: () => import('./pages/admin/flotte').then(m => m.Flotte) },
      { path: 'reservations', title: t('Réservations'), loadComponent: () => import('./pages/admin/demandes').then(m => m.Demandes) },
      { path: 'messages', title: t('Messages'), loadComponent: () => import('./pages/admin/messages').then(m => m.Messages) }
    ]
  },
  {
    path: '',
    component: MiseEnPageSite,
    children: [
      { path: '', title: 'WIJHA – Location de voitures en Tunisie', loadComponent: () => import('./pages/accueil/accueil').then(m => m.Accueil) },
      { path: 'voitures', title: t('Nos voitures'), loadComponent: () => import('./pages/voitures/voitures').then(m => m.Voitures) },
      { path: 'voitures/:id', title: t('Véhicule'), loadComponent: () => import('./pages/voiture-detail/voiture-detail').then(m => m.VoitureDetail) },
      { path: 'reservation', title: t('Réservation'), canActivate: [connecteGuard], loadComponent: () => import('./pages/reservation/reservation').then(m => m.ReservationPage) },
      { path: 'road-trip', title: t('Road-trip'), loadComponent: () => import('./pages/road-trip/road-trip').then(m => m.RoadTrip) },
      { path: 'agences', title: t('Nos agences'), loadComponent: () => import('./pages/agences/agences').then(m => m.Agences) },
      { path: 'tarifs', title: t('Tarifs'), loadComponent: () => import('./pages/tarifs/tarifs').then(m => m.Tarifs) },
      { path: 'espace-client', title: t('Mon espace'), canActivate: [connecteGuard], loadComponent: () => import('./pages/espace-client/espace-client').then(m => m.EspaceClient) },
      { path: 'contact', title: t('Contact'), loadComponent: () => import('./pages/formulaires/contact').then(m => m.Contact) },
      { path: 'transfert', title: t('Transfert aéroport'), loadComponent: () => import('./pages/formulaires/transfert').then(m => m.Transfert) },
      { path: 'connexion', title: t('Se connecter'), loadComponent: () => import('./pages/formulaires/comptes').then(m => m.Connexion) },
      { path: 'inscription', title: t('Créer un compte'), loadComponent: () => import('./pages/formulaires/comptes').then(m => m.Inscription) },
      { path: 'nouveau-mot-de-passe', title: t('Nouveau mot de passe'), loadComponent: () => import('./pages/formulaires/comptes').then(m => m.NouveauMotDePasse) },
      { path: 'faq', title: t('Questions fréquentes'), loadComponent: () => import('./pages/statiques/statiques').then(m => m.Faq) },
      { path: 'services', title: t('Services'), loadComponent: () => import('./pages/statiques/statiques').then(m => m.Services) },
      { path: 'promotions', title: t('Promotions'), loadComponent: () => import('./pages/statiques/statiques').then(m => m.Promotions) },
      { path: 'conditions', title: t('Conditions de location'), loadComponent: () => import('./pages/statiques/statiques').then(m => m.Conditions) },
      { path: 'confidentialite', title: t('Confidentialité'), loadComponent: () => import('./pages/statiques/statiques').then(m => m.Confidentialite) },
      { path: 'acces-refuse', title: t('Accès réservé'), loadComponent: () => import('./pages/introuvable').then(m => m.AccesRefuse) },
      { path: '**', title: t('Page introuvable'), loadComponent: () => import('./pages/introuvable').then(m => m.Introuvable) }
    ]
  }
];
