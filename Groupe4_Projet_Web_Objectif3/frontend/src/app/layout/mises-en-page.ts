import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FlotteService } from '../core/flotte.service';
import { Notifications } from '../shared/notifications';
import { Entete } from './entete';
import { Pied } from './pied';

/** Bandeau affiché si Supabase est injoignable. */
@Component({
  selector: 'app-erreur-donnees',
  template: `@if (flotte.etat() === 'erreur') {
    <p class="erreur-donnees" role="alert">Impossible de charger la flotte depuis la base de données ({{ flotte.erreur() }}).
      Vérifiez votre connexion et rechargez la page.</p>
  }`
})
export class ErreurDonnees {
  readonly flotte = inject(FlotteService);
}

/** Pages publiques : en-tête, contenu, pied de page. */
@Component({
  selector: 'app-site',
  imports: [RouterOutlet, Entete, Pied, ErreurDonnees, Notifications],
  template: `
    <app-entete />
    <main id="contenu">
      <app-erreur-donnees />
      <router-outlet />
    </main>
    <app-pied />
    <app-notifications />
  `
})
export class MiseEnPageSite {}

/** Administration : barre sombre et navigation propre. */
@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ErreurDonnees, Notifications],
  template: `
    <a class="skip" href="#contenu">Aller au contenu</a>
    <div class="admin-bar">
      <div class="wrap">
        <span class="marque">WIJHA<small>ADMINISTRATION</small></span>
        <nav aria-label="Navigation de l’administration">
          @for (l of liens; track l.url) {
            <a [routerLink]="l.url" routerLinkActive #rla="routerLinkActive" [routerLinkActiveOptions]="{ exact: true }"
               [attr.aria-current]="rla.isActive ? 'page' : null">{{ l.txt }}</a>
          }
        </nav>
        <span class="sortie"><a routerLink="/" style="color:inherit">Quitter</a></span>
      </div>
    </div>
    <main id="contenu" class="admin-main">
      <div class="wrap">
        <app-erreur-donnees />
        <router-outlet />
      </div>
    </main>
    <app-notifications />
  `
})
export class MiseEnPageAdmin {
  readonly liens = [
    { url: '/admin', txt: 'Tableau de bord' },
    { url: '/admin/flotte', txt: 'Flotte' },
    { url: '/admin/reservations', txt: 'Réservations' },
    { url: '/admin/messages', txt: 'Messages' }
  ];
}
