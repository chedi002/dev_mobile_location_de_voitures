import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { NotificationsService } from '../../core/notifications.service';
import { Reservation, StatutReservation } from '../../core/modeles';
import { CLASSES_STATUT, LIBELLES_STATUT } from '../../core/reservations.service';
import { dateFR } from '../../core/stockage.service';

@Component({
  selector: 'app-demandes',
  imports: [FormsModule],
  template: `
    <h1>Gestion des réservations</h1>
    <p class="sous">Toutes les demandes des clients, à confirmer, refuser ou clôturer.</p>

    <div class="panel">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:end;margin-bottom:1rem">
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Statut
          <select [(ngModel)]="filtre">
            <option value="">Tous</option>
            @for (s of statuts; track s) { <option [value]="s">{{ libelles[s] }} ({{ compte(s) }})</option> }
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Recherche
          <input type="search" placeholder="Référence, client, e-mail, voiture" [(ngModel)]="q">
        </label>
        <button class="btn btn-ghost btn-sm" type="button" (click)="admin.chargerReservations()">Actualiser</button>
        <span class="note" style="margin-left:auto">{{ liste().length }} demande{{ liste().length > 1 ? 's' : '' }} sur {{ admin.reservations().length }}</span>
      </div>

      @if (admin.erreur()) { <p class="err" role="alert">{{ admin.erreur() }}</p> }
      @if (message()) { <p class="err" role="alert">{{ message() }}</p> }
      @if (admin.chargement() && !admin.reservations().length) { <p class="chargement">Chargement des demandes…</p> }

      @for (r of liste(); track r.ref) {
        <article class="resa-item">
          <header><span class="ref">{{ r.ref }}</span><span class="statut" [class]="classes[r.statut]">{{ libelles[r.statut] }}</span></header>
          <dl>
            <dt>Client</dt><dd>{{ r.client_prenom }} {{ r.client_nom }} · <a [href]="'mailto:' + r.client_email">{{ r.client_email }}</a> · {{ r.client_tel }}{{ r.vol ? ' · vol ' + r.vol : '' }}</dd>
            <dt>Voiture</dt><dd>{{ r.vehicule ? r.vehicule.marque + ' ' + r.vehicule.modele + ' · ' + r.vehicule.immatriculation : '—' }}</dd>
            <dt>Agences</dt><dd>{{ r.depart?.ville }} → {{ r.retour?.ville }}</dd>
            <dt>Période</dt><dd>{{ dateFR(r.debut, true) }} → {{ dateFR(r.fin, true) }}</dd>
            <dt>Détail</dt><dd>@for (l of r.lignes; track l.t) { {{ l.t }} : {{ l.m }} DT<br> } @empty { — }</dd>
            <dt>Montant</dt><dd><strong>{{ r.total_tnd }} DT</strong></dd>
            <dt>Reçue le</dt><dd>{{ dateFR(r.created_at, true) }}</dd>
          </dl>
          <p style="margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap">
            @switch (r.statut) {
              @case ('en_attente') {
                <button class="btn btn-green btn-sm" type="button" [disabled]="enCours() === r.ref" (click)="statuer(r, 'confirmee')">Confirmer</button>
                <button class="btn btn-ghost btn-sm" type="button" [disabled]="enCours() === r.ref" (click)="statuer(r, 'annulee')">Refuser</button>
              }
              @case ('confirmee') {
                <button class="btn btn-green btn-sm" type="button" [disabled]="enCours() === r.ref" (click)="statuer(r, 'terminee')">Marquer terminée</button>
                <button class="btn btn-ghost btn-sm" type="button" [disabled]="enCours() === r.ref" (click)="statuer(r, 'annulee')">Annuler</button>
              }
              @default {
                <button class="btn btn-ghost btn-sm" type="button" [disabled]="enCours() === r.ref" (click)="statuer(r, 'en_attente')">Remettre en attente</button>
              }
            }
          </p>
        </article>
      } @empty {
        @if (!admin.chargement()) {
          <div class="vide-etat"><p><strong>Aucune demande{{ filtre() || q() ? ' pour ces critères' : '' }}.</strong></p></div>
        }
      }
    </div>
  `
})
export class Demandes {
  readonly admin = inject(AdminService);
  private readonly notifs = inject(NotificationsService);
  readonly dateFR = dateFR;
  readonly classes = CLASSES_STATUT;
  readonly libelles = LIBELLES_STATUT;
  readonly statuts: StatutReservation[] = ['en_attente', 'confirmee', 'terminee', 'annulee'];

  readonly filtre = signal<StatutReservation | ''>('en_attente');
  readonly q = signal('');
  readonly message = signal('');
  readonly enCours = signal('');

  readonly liste = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.admin.reservations().filter(r =>
      (!this.filtre() || r.statut === this.filtre()) &&
      (!q || [r.ref, r.client_prenom, r.client_nom, r.client_email, r.vehicule?.marque, r.vehicule?.modele, r.vehicule?.immatriculation]
        .join(' ').toLowerCase().includes(q)));
  });

  constructor() {
    this.admin.chargerReservations();
  }

  compte(s: StatutReservation) { return this.admin.reservations().filter(r => r.statut === s).length; }

  async statuer(r: Reservation, statut: StatutReservation) {
    this.enCours.set(r.ref);
    const m = await this.admin.changerStatut(r.ref, statut);
    this.message.set(m);
    this.enCours.set('');
    if (!m) this.notifs.succes(`${r.ref} : ${LIBELLES_STATUT[statut]}.`);
  }
}
