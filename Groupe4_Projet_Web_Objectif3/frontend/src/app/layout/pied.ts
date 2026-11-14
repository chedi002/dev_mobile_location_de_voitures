import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-pied',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="wrap foot-in">
        <div>
          <a class="logo logo-footer" routerLink="/" aria-label="WIJHA, retour à l'accueil">
            <img class="logo-complet" src="images/logo-complet.png" alt="WIJHA – وجهة, location de voitures" width="240" height="176">
          </a>
          <p class="foot-text">Location de voitures en Tunisie.</p>
        </div>
        <nav aria-label="Pied de page">
          <a routerLink="/agences">Agences</a><a routerLink="/services">Services</a><a routerLink="/tarifs">Tarifs</a>
          <a routerLink="/promotions">Promotions</a><a routerLink="/faq">FAQ</a><a routerLink="/contact">Contact</a>
        </nav>
        <nav aria-label="Informations légales">
          <a routerLink="/conditions">Conditions de location</a><a routerLink="/conditions" fragment="annulation">Annulation</a>
          <a routerLink="/confidentialite">Confidentialité</a><a routerLink="/espace-client">Espace client</a>
          @if (auth.estAdmin()) { <a routerLink="/admin">Administration</a> }
        </nav>
      </div>
      <p class="copy">© 2026 WIJHA</p>
    </footer>
  `
})
export class Pied {
  readonly auth = inject(AuthService);
}
