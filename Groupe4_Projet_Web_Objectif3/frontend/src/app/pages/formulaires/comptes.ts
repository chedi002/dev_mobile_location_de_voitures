import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationsService } from '../../core/notifications.service';
import { EMAIL } from '../../core/outils';

/* Comptes clients : Supabase Auth (e-mail + mot de passe).
   Les mots de passe ne passent que par Supabase : ils ne sont jamais stockés par le site. */

/** Adresse de retour après connexion : uniquement un chemin interne au site. */
const retourSur = (r?: string) => (r && r.startsWith('/') && !r.startsWith('//') ? r : '/espace-client');

@Component({
  selector: 'app-connexion',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Se connecter</h1>
      <p>Retrouvez vos réservations, leur statut et vos road-trips enregistrés.</p>
    </div></section>

    <section class="wrap section auth">
      <div class="panel">
        @if (retour()) {
          <p class="note" style="margin:0 0 1rem">Connectez-vous pour accéder à cette page.</p>
        }

        @if (!oubli()) {
          <form class="form-1" novalidate (ngSubmit)="connecter()">
            <label>Adresse e-mail <input type="email" name="email" autocomplete="email" [(ngModel)]="email"></label>
            <label>Mot de passe <input type="password" name="motdepasse" autocomplete="current-password" [(ngModel)]="pass"></label>
            <label style="flex-direction:row;align-items:center;gap:.5rem;font-weight:400">
              <input type="checkbox" name="memoriser" style="width:auto" [(ngModel)]="memoriser"> Rester connecté sur cet appareil
            </label>
            <p class="err" role="alert">{{ erreur() }}</p>
            <button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Connexion…' : 'Se connecter' }}</button>
          </form>
          <p class="alt">
            <button type="button" class="link-btn" (click)="ouvrirOubli()">Mot de passe oublié ?</button><br>
            Pas encore de compte ? <a routerLink="/inscription" [queryParams]="retour() ? { retour: retour() } : {}">Créer un compte</a>.
          </p>
        } @else {
          @if (!lienEnvoye()) {
            <form class="form-1" novalidate (ngSubmit)="envoyerLien()">
              <p>Indiquez l’adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
              <label>Adresse e-mail <input type="email" name="email" autocomplete="email" [(ngModel)]="email"></label>
              <p class="err" role="alert">{{ erreur() }}</p>
              <button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Envoi…' : 'Recevoir le lien' }}</button>
            </form>
          } @else {
            <div class="ok-msg">Si un compte existe pour {{ email() }}, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les indésirables.</div>
          }
          <p class="alt"><button type="button" class="link-btn" (click)="oubli.set(false)">Retour à la connexion</button></p>
        }
      </div>
    </section>
  `
})
export class Connexion {
  private readonly auth = inject(AuthService);
  private readonly notifs = inject(NotificationsService);
  private readonly router = inject(Router);
  readonly retour = input<string>();

  readonly email = signal('');
  readonly pass = signal('');
  readonly memoriser = signal(true);
  readonly erreur = signal('');
  readonly envoi = signal(false);
  readonly oubli = signal(false);
  readonly lienEnvoye = signal(false);

  constructor() {
    // Déjà connecté (ou connexion réussie) : on part vers la page demandée.
    effect(() => {
      if (this.auth.pret() && this.auth.connecte()) this.router.navigateByUrl(retourSur(this.retour()));
    });
  }

  async connecter() {
    const email = this.email().trim();
    let m = '';
    if (!EMAIL.test(email)) m = 'Saisissez une adresse e-mail valide.';
    else if (!this.pass()) m = 'Saisissez votre mot de passe.';
    this.erreur.set(m);
    if (m) return;
    this.envoi.set(true);
    const erreur = await this.auth.connexion(email, this.pass(), this.memoriser());
    this.envoi.set(false);
    this.erreur.set(erreur);
    if (!erreur) this.notifs.succes(`Bienvenue ${this.auth.nomAffiche()} !`);
  }

  ouvrirOubli() {
    this.erreur.set('');
    this.lienEnvoye.set(false);
    this.oubli.set(true);
  }

  async envoyerLien() {
    const email = this.email().trim();
    if (!EMAIL.test(email)) { this.erreur.set('Saisissez une adresse e-mail valide.'); return; }
    this.envoi.set(true);
    const m = await this.auth.motDePasseOublie(email);
    this.envoi.set(false);
    this.erreur.set(m);
    if (!m) this.lienEnvoye.set(true);
  }
}

@Component({
  selector: 'app-inscription',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Créer un compte</h1>
      <p>Un compte vous permet de suivre l’état de vos demandes et de retrouver vos récapitulatifs.</p>
    </div></section>

    <section class="wrap section auth">
      <div class="panel">
        @if (!attenteConfirmation()) {
          <form class="form-1" novalidate (ngSubmit)="inscrire()">
            <label>Prénom <input type="text" name="prenom" autocomplete="given-name" [(ngModel)]="prenom"></label>
            <label>Nom <input type="text" name="nom" autocomplete="family-name" [(ngModel)]="nom"></label>
            <label>Adresse e-mail <input type="email" name="email" autocomplete="email" [(ngModel)]="email"></label>
            <label>Téléphone <input type="tel" name="tel" autocomplete="tel" placeholder="+216 …" [(ngModel)]="tel"></label>
            <label>Mot de passe <span class="form-note">huit caractères au minimum</span>
              <input type="password" name="motdepasse" autocomplete="new-password" [(ngModel)]="pass">
            </label>
            <label>Confirmer le mot de passe <input type="password" name="confirmation" autocomplete="new-password" [(ngModel)]="pass2"></label>
            <label style="flex-direction:row;align-items:flex-start;gap:.5rem;font-weight:400">
              <input type="checkbox" name="cgu" style="width:auto;margin-top:.25rem" [(ngModel)]="cgu">
              <span>J’accepte les <a routerLink="/conditions">conditions de location</a> et la <a routerLink="/confidentialite">politique de confidentialité</a>.</span>
            </label>
            <p class="err" role="alert">{{ erreur() }}</p>
            <button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Création…' : 'Créer mon compte' }}</button>
          </form>
          <p class="alt">Vous avez déjà un compte ? <a routerLink="/connexion" [queryParams]="retour() ? { retour: retour() } : {}">Se connecter</a>.</p>
        } @else {
          <div class="ok-msg">
            <strong>Plus qu’une étape.</strong> Un e-mail de confirmation vient de partir à {{ email() }}.
            Cliquez sur le lien qu’il contient pour activer votre compte ; vous serez alors connecté automatiquement.
          </div>
          <p class="alt">Rien reçu après quelques minutes ? Regardez dans les indésirables, puis <a routerLink="/connexion">essayez de vous connecter</a>.</p>
        }
      </div>
    </section>
  `
})
export class Inscription {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly retour = input<string>();

  readonly prenom = signal('');
  readonly nom = signal('');
  readonly email = signal('');
  readonly tel = signal('');
  readonly pass = signal('');
  readonly pass2 = signal('');
  readonly cgu = signal(false);
  readonly erreur = signal('');
  readonly envoi = signal(false);
  readonly attenteConfirmation = signal(false);

  constructor() {
    effect(() => {
      if (this.auth.pret() && this.auth.connecte()) this.router.navigateByUrl(retourSur(this.retour()));
    });
  }

  private valider() {
    if (!this.prenom().trim() || !this.nom().trim()) return 'Indiquez votre prénom et votre nom.';
    if (!EMAIL.test(this.email().trim())) return 'Saisissez une adresse e-mail valide.';
    if (this.tel().replace(/\D/g, '').length < 8) return 'Saisissez un numéro de téléphone d’au moins 8 chiffres.';
    if (this.pass().length < 8) return 'Le mot de passe doit comporter au moins 8 caractères.';
    if (this.pass() !== this.pass2()) return 'Les deux mots de passe ne correspondent pas.';
    if (!this.cgu()) return 'Acceptez les conditions pour créer votre compte.';
    return '';
  }

  async inscrire() {
    const m = this.valider();
    this.erreur.set(m);
    if (m) return;
    this.envoi.set(true);
    const r = await this.auth.inscription(this.email().trim(), this.pass(), {
      prenom: this.prenom().trim(), nom: this.nom().trim(), tel: this.tel().trim()
    });
    this.envoi.set(false);
    this.erreur.set(r.erreur);
    if (r.confirmation) this.attenteConfirmation.set(true);
  }
}

/** Page ouverte depuis le lien « mot de passe oublié » reçu par e-mail. */
@Component({
  selector: 'app-nouveau-mot-de-passe',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Nouveau mot de passe</h1>
      <p>Choisissez le mot de passe de votre compte WIJHA.</p>
    </div></section>

    <section class="wrap section auth">
      <div class="panel">
        @if (!auth.pret()) {
          <p class="chargement">Vérification du lien…</p>
        } @else if (fait()) {
          <div class="ok-msg">Mot de passe modifié. Vous êtes connecté.</div>
          <p class="alt"><a class="btn btn-green" routerLink="/espace-client">Aller à mon espace</a></p>
        } @else if (!auth.connecte()) {
          <p class="err">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis la page de connexion.</p>
          <p class="alt"><a class="btn btn-ghost" routerLink="/connexion">Se connecter</a></p>
        } @else {
          <form class="form-1" novalidate (ngSubmit)="enregistrer()">
            <label>Nouveau mot de passe <span class="form-note">huit caractères au minimum</span>
              <input type="password" name="motdepasse" autocomplete="new-password" [(ngModel)]="pass">
            </label>
            <label>Confirmer <input type="password" name="confirmation" autocomplete="new-password" [(ngModel)]="pass2"></label>
            <p class="err" role="alert">{{ erreur() }}</p>
            <button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </form>
        }
      </div>
    </section>
  `
})
export class NouveauMotDePasse {
  readonly auth = inject(AuthService);
  readonly pass = signal('');
  readonly pass2 = signal('');
  readonly erreur = signal('');
  readonly envoi = signal(false);
  readonly fait = signal(false);

  async enregistrer() {
    let m = '';
    if (this.pass().length < 8) m = 'Le mot de passe doit comporter au moins 8 caractères.';
    else if (this.pass() !== this.pass2()) m = 'Les deux mots de passe ne correspondent pas.';
    this.erreur.set(m);
    if (m) return;
    this.envoi.set(true);
    m = await this.auth.changerMotDePasse(this.pass());
    this.envoi.set(false);
    this.erreur.set(m);
    if (!m) this.fait.set(true);
  }
}
