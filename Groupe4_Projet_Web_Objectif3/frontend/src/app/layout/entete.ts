import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationsService } from '../core/notifications.service';
import { Icone } from '../shared/icone';

@Component({
  selector: 'app-entete',
  imports: [RouterLink, RouterLinkActive, Icone],
  template: `
    <a class="skip" href="#contenu">Aller au contenu</a>

    <header class="header">
      <div class="wrap header-in">
        <a class="logo" routerLink="/" aria-label="WIJHA, retour à l'accueil">
          <img class="logo-icon" src="images/logo-embleme.png" alt="" width="96" height="58">
          <span class="logo-words">
            <span class="logo-text">WIJHA</span>
            <span class="logo-sub">Location de voitures</span>
          </span>
        </a>

        <button class="burger" type="button" aria-controls="menu" [attr.aria-expanded]="ouvert()" (click)="ouvert.set(!ouvert())">Menu</button>

        <nav id="menu" class="menu" [class.open]="ouvert()" aria-label="Navigation principale">
          @for (l of liens; track l.url) {
            <a [routerLink]="l.url" routerLinkActive #rla="routerLinkActive" [routerLinkActiveOptions]="{ exact: l.url === '/' }"
               [attr.aria-current]="rla.isActive ? 'page' : null">{{ l.txt }}</a>
          }
          <!-- Compte, dans le menu mobile (les boutons de droite y sont masqués) -->
          @if (auth.connecte()) {
            <a class="menu-compte" routerLink="/espace-client">Mon espace</a>
            @if (auth.estAdmin()) { <a class="menu-compte" routerLink="/admin">Administration</a> }
            <button class="menu-compte" type="button" (click)="deconnecter()">Se déconnecter</button>
          } @else {
            <a class="menu-compte" routerLink="/connexion">Se connecter</a>
          }
        </nav>

        <div class="header-cta">
          @if (auth.connecte()) {
            <div class="compte">
              <button class="compte-btn" type="button" aria-haspopup="menu" [attr.aria-expanded]="compteOuvert()"
                      [title]="'Mon compte : ' + nomComplet()" (click)="compteOuvert.set(!compteOuvert())">
                <span class="avatar" aria-hidden="true">{{ initiale() }}</span>
                <span class="sr">Mon compte : {{ nomComplet() }}</span>
                <app-icone class="chevron" nom="chevron-bas" [taille]="16" />
              </button>
              @if (compteOuvert()) {
                <div class="compte-menu" role="menu">
                  <div class="compte-tete">
                    <strong>{{ nomComplet() }}</strong>
                    <small>{{ auth.email() }}</small>
                    @if (auth.estAdmin()) { <span class="role">Administrateur</span> }
                  </div>
                  <a role="menuitem" routerLink="/espace-client">Mon espace</a>
                  @if (auth.estAdmin()) { <a role="menuitem" routerLink="/admin">Administration</a> }
                  <button role="menuitem" type="button" class="sortie" (click)="deconnecter()">Se déconnecter</button>
                </div>
              }
            </div>
          } @else if (auth.pret()) {
            <a class="btn btn-ghost" routerLink="/connexion">Se connecter</a>
          }
        </div>
      </div>
    </header>
  `
})
export class Entete {
  readonly auth = inject(AuthService);
  private readonly notifs = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly ouvert = signal(false);
  readonly compteOuvert = signal(false);
  readonly liens = [
    { url: '/', txt: 'Accueil' },
    { url: '/voitures', txt: 'Voitures' },
    { url: '/reservation', txt: 'Réservation' },
    { url: '/road-trip', txt: 'Road-trip' },
    { url: '/agences', txt: 'Agences' },
    { url: '/services', txt: 'Services' },
    { url: '/contact', txt: 'Contact' }
  ];

  readonly initiale = computed(() => (this.auth.nomAffiche()[0] ?? '?').toUpperCase());
  readonly nomComplet = computed(() => {
    const p = this.auth.profil();
    return [p?.prenom, p?.nom].filter(Boolean).join(' ') || this.auth.nomAffiche();
  });

  constructor() {
    // Les menus se referment à chaque changement de page.
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.ouvert.set(false);
      this.compteOuvert.set(false);
    });
  }

  /** Clic en dehors du menu de compte : on le referme. */
  @HostListener('document:click', ['$event'])
  clicDocument(e: MouseEvent) {
    const compte = this.hote.nativeElement.querySelector('.compte');
    if (this.compteOuvert() && compte && !compte.contains(e.target as Node)) this.compteOuvert.set(false);
  }

  @HostListener('document:keydown.escape')
  echap() {
    this.compteOuvert.set(false);
  }

  async deconnecter() {
    this.compteOuvert.set(false);
    await this.auth.deconnexion();
    this.notifs.info('Vous êtes déconnecté.');
    this.router.navigate(['/']);
  }
}
