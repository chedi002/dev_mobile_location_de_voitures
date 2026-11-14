import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationsService } from '../../core/notifications.service';
import { FlotteService } from '../../core/flotte.service';
import { Reservation } from '../../core/modeles';
import { CLASSES_STATUT, LIBELLES_STATUT, ReservationsService } from '../../core/reservations.service';
import { StockageService, dateFR } from '../../core/stockage.service';

/** Espace client (réservé aux comptes connectés) : réservations lues dans Supabase, profil, annulation. */
@Component({
  selector: 'app-espace-client',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Bonjour {{ auth.nomAffiche() }}</h1>
      <p>Vos demandes de réservation, leur statut, et les road-trips que vous avez préparés.</p>
    </div></section>

    <section class="wrap section">
      <div class="cols-side">
        <div>
          <div class="kpis">
            <div class="kpi"><b>{{ resas().length }}</b><span>réservation{{ resas().length > 1 ? 's' : '' }}</span></div>
            <div class="kpi vert"><b>{{ aVenir() }}</b><span>à venir</span></div>
            <div class="kpi ambre"><b>{{ total() }} DT</b><span>montant cumulé</span></div>
          </div>

          <div class="panel">
            <h2>Mes réservations</h2>
            @if (service.erreur()) { <p class="err" role="alert">{{ service.erreur() }}</p> }
            @if (messageAnnulation()) { <p class="err" role="alert">{{ messageAnnulation() }}</p> }
            @if (service.chargement() && !resas().length) { <p class="chargement">Chargement de vos réservations…</p> }
            @for (r of resas(); track r.ref) {
              <article class="resa-item">
                <header>
                  <span class="ref">{{ r.ref }}</span>
                  <span class="statut" [class]="classes[r.statut]">{{ libelles[r.statut] }}</span>
                </header>
                <dl>
                  <dt>Véhicule</dt><dd>{{ r.vehicule ? r.vehicule.marque + ' ' + r.vehicule.modele + ' · ' + r.vehicule.immatriculation : '—' }}</dd>
                  <dt>Agences</dt><dd>{{ r.depart?.ville }}{{ r.retour && r.retour.ville !== r.depart?.ville ? ' → ' + r.retour.ville : ' (retour identique)' }}</dd>
                  <dt>Dates</dt><dd>{{ dateFR(r.debut, true) }} → {{ dateFR(r.fin, true) }}</dd>
                  <dt>Détail</dt><dd>@for (l of r.lignes; track l.t) { {{ l.t }} : {{ l.m }} DT<br> } @empty { — }</dd>
                  <dt>Total</dt><dd><strong>{{ r.total_tnd }} DT</strong></dd>
                </dl>
                <p style="margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap">
                  @if (annulable(r)) {
                    @if (aConfirmer() === r.ref) {
                      <button class="btn btn-amber btn-sm" type="button" (click)="annuler(r.ref)">Oui, annuler {{ r.ref }}</button>
                      <button class="btn btn-ghost btn-sm" type="button" (click)="aConfirmer.set('')">Garder</button>
                    } @else {
                      <button class="btn btn-ghost btn-sm" type="button" (click)="aConfirmer.set(r.ref)">Annuler la réservation</button>
                    }
                  }
                  <button class="btn btn-ghost btn-sm" type="button" (click)="imprimer()">Imprimer</button>
                  <a class="btn btn-ghost btn-sm" routerLink="/conditions" fragment="annulation">Conditions d’annulation</a>
                </p>
              </article>
            } @empty {
              <div class="vide-etat">
                <p><strong>Aucune réservation pour l’instant.</strong></p>
                <p>Les demandes que vous confirmez apparaissent ici, avec leur référence et leur statut.</p>
                <p style="margin-top:1rem"><a class="btn btn-green" routerLink="/voitures">Choisir une voiture</a></p>
              </div>
            }
          </div>

          <div class="panel">
            <h2>Mon road-trip enregistré</h2>
            @if (rt(); as rt) {
              <p><strong>{{ rt.nom || 'Itinéraire enregistré' }}</strong></p>
              <p style="color:var(--muted)">{{ rt.from || '?' }} → {{ rt.to || '?' }}{{ rt.jours ? ' · ' + rt.jours + ' jours' : '' }}{{ rt.km ? ' · ' + rt.km + ' km' : '' }}
                · {{ rt.trav }} voyageur{{ rt.trav > 1 ? 's' : '' }}</p>
              <p style="margin-top:.8rem"><a class="btn btn-green btn-sm" routerLink="/reservation">Réserver ce road-trip</a>
                <a class="btn btn-ghost btn-sm" routerLink="/road-trip">Changer de circuit</a></p>
            } @else {
              <div class="vide-etat">
                <p>Aucun road-trip enregistré.</p>
                <p style="margin-top:1rem"><a class="btn btn-ghost" routerLink="/road-trip">Découvrir les circuits</a></p>
              </div>
            }
          </div>
        </div>

        <aside>
          <div class="panel panel-sticky profil">
            <div class="profil-tete">
              <span class="avatar avatar-lg" aria-hidden="true">{{ initiale() }}</span>
              <div class="profil-ident">
                <h3>{{ auth.profil()?.prenom }} {{ auth.profil()?.nom }}</h3>
                <p [title]="auth.email()">{{ auth.email() }}</p>
              </div>
            </div>

            @if (!edition()) {
              <dl class="profil-infos">
                <div><dt>Téléphone</dt><dd>{{ auth.profil()?.tel || '—' }}</dd></div>
              </dl>
              <button class="link-btn profil-modifier" type="button" (click)="edition.set(true)">Modifier mes informations</button>
            } @else {
              <form class="form-1 profil-form" novalidate (ngSubmit)="enregistrerProfil()">
                <label>Prénom <input name="prenom" autocomplete="given-name" [(ngModel)]="prenom"></label>
                <label>Nom <input name="nom" autocomplete="family-name" [(ngModel)]="nom"></label>
                <label>Téléphone <input name="tel" type="tel" autocomplete="tel" [(ngModel)]="tel"></label>
                <p class="err" role="alert">{{ erreurProfil() }}</p>
                <div class="profil-actions-form">
                  <button class="btn btn-green btn-sm" type="submit">Enregistrer</button>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="annulerEdition()">Annuler</button>
                </div>
              </form>
            }

            <div class="profil-actions">
              <button class="btn profil-sortie" type="button" (click)="deconnecter()">Se déconnecter</button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `
})
export class EspaceClient {
  readonly flotte = inject(FlotteService);
  readonly auth = inject(AuthService);
  private readonly notifs = inject(NotificationsService);
  private readonly stockage = inject(StockageService);
  readonly service = inject(ReservationsService);
  readonly classes = CLASSES_STATUT;
  readonly libelles = LIBELLES_STATUT;
  private readonly router = inject(Router);
  readonly dateFR = dateFR;

  readonly resas = this.service.mesReservations;
  readonly rt = computed(() => { const r = this.stockage.roadtrip(); return r && (r.from || r.to) ? r : null; });
  private readonly actives = computed(() => this.resas().filter(r => r.statut === 'en_attente' || r.statut === 'confirmee'));
  readonly aVenir = computed(() => this.actives().filter(r => new Date(r.debut) > new Date()).length);
  readonly total = computed(() => this.actives().reduce((s, r) => s + (+r.total_tnd || 0), 0));

  /* Annulation (confirmée en deux clics) */
  readonly aConfirmer = signal('');
  readonly messageAnnulation = signal('');
  annulable(r: Reservation) { return (r.statut === 'en_attente' || r.statut === 'confirmee') && new Date(r.debut) > new Date(); }
  async annuler(ref: string) {
    const m = await this.service.annuler(ref);
    this.messageAnnulation.set(m);
    this.aConfirmer.set('');
    if (!m) this.notifs.succes(`Réservation ${ref} annulée.`);
  }

  readonly initiale = computed(() => (this.auth.nomAffiche()[0] ?? '?').toUpperCase());

  /* Modification du profil (métadonnées du compte Supabase) */
  readonly edition = signal(false);
  readonly erreurProfil = signal('');
  readonly prenom = linkedSignal(() => this.auth.profil()?.prenom ?? '');
  readonly nom = linkedSignal(() => this.auth.profil()?.nom ?? '');
  readonly tel = linkedSignal(() => this.auth.profil()?.tel ?? '');

  async enregistrerProfil() {
    let m = '';
    if (!this.prenom().trim() || !this.nom().trim()) m = 'Indiquez votre prénom et votre nom.';
    else if (this.tel().replace(/\D/g, '').length < 8) m = 'Saisissez un numéro de téléphone d’au moins 8 chiffres.';
    if (!m) m = await this.auth.modifierProfil({ prenom: this.prenom().trim(), nom: this.nom().trim(), tel: this.tel().trim() });
    this.erreurProfil.set(m);
    if (!m) { this.edition.set(false); this.notifs.succes('Profil enregistré.'); }
  }

  annulerEdition() {
    const p = this.auth.profil();
    this.prenom.set(p?.prenom ?? ''); this.nom.set(p?.nom ?? ''); this.tel.set(p?.tel ?? '');
    this.erreurProfil.set('');
    this.edition.set(false);
  }

  async deconnecter() {
    await this.auth.deconnexion();
    this.router.navigate(['/']);
  }

  imprimer() { window.print(); }
}
