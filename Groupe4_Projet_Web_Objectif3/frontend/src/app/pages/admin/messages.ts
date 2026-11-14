import { Component, computed, inject, signal } from '@angular/core';
import { MessagesService } from '../../core/messages.service';
import { NotificationsService } from '../../core/notifications.service';
import { dateFR } from '../../core/stockage.service';

type Onglet = 'contact' | 'transfert';

@Component({
  selector: 'app-messages',
  template: `
    <h1>Messages</h1>
    <p class="sous">Messages du formulaire de contact et demandes de transfert aéroport.</p>

    <div class="panel">
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
        <button class="btn btn-sm" type="button" [class.btn-green]="onglet() === 'contact'" [class.btn-ghost]="onglet() !== 'contact'"
                (click)="onglet.set('contact')">Contact ({{ nonTraites().contact }})</button>
        <button class="btn btn-sm" type="button" [class.btn-green]="onglet() === 'transfert'" [class.btn-ghost]="onglet() !== 'transfert'"
                (click)="onglet.set('transfert')">Transferts ({{ nonTraites().transfert }})</button>
        <label style="display:flex;align-items:center;gap:.4rem;margin-left:auto;font-size:.9rem">
          <input type="checkbox" [checked]="masquerTraites()" (change)="masquerTraites.set($any($event.target).checked)"> Masquer les messages traités
        </label>
        <button class="btn btn-ghost btn-sm" type="button" (click)="service.charger()">Actualiser</button>
      </div>

      @if (service.erreur()) { <p class="err" role="alert">{{ service.erreur() }}</p> }
      @if (service.chargement() && !service.contacts().length && !service.transferts().length) { <p class="chargement">Chargement…</p> }

      @if (onglet() === 'contact') {
        @for (m of contacts(); track m.id) {
          <article class="resa-item" [style.opacity]="m.traite ? .6 : 1">
            <header><span class="ref">{{ m.sujet }}</span><span class="statut" [class]="m.traite ? 'st-confirme' : 'st-attente'">{{ m.traite ? 'traité' : 'à traiter' }}</span></header>
            <dl>
              <dt>De</dt><dd>{{ m.prenom }} {{ m.nom }} · <a [href]="'mailto:' + m.email">{{ m.email }}</a>{{ m.tel ? ' · ' + m.tel : '' }}</dd>
              @if (m.reference) { <dt>Réservation</dt><dd>{{ m.reference }}</dd> }
              <dt>Reçu le</dt><dd>{{ dateFR(m.created_at, true) }}</dd>
              <dt>Message</dt><dd style="white-space:pre-line">{{ m.message }}</dd>
            </dl>
            <p style="margin-top:.8rem">
              <button class="btn btn-sm" [class.btn-green]="!m.traite" [class.btn-ghost]="m.traite" type="button"
                      (click)="marquer('messages_contact', m.id, !m.traite)">{{ m.traite ? 'Remettre à traiter' : 'Marquer comme traité' }}</button>
            </p>
          </article>
        } @empty {
          @if (!service.chargement()) { <div class="vide-etat"><p>Aucun message{{ masquerTraites() ? ' à traiter' : '' }}.</p></div> }
        }
      } @else {
        @for (d of transferts(); track d.id) {
          <article class="resa-item" [style.opacity]="d.traite ? .6 : 1">
            <header><span class="ref">{{ d.sens === 'arrivee' ? d.aeroport + ' → ' + d.lieu : d.lieu + ' → ' + d.aeroport }}</span>
              <span class="statut" [class]="d.traite ? 'st-confirme' : 'st-attente'">{{ d.traite ? 'traité' : 'à traiter' }}</span></header>
            <dl>
              <dt>Client</dt><dd>{{ d.nom }} · <a [href]="'mailto:' + d.email">{{ d.email }}</a></dd>
              <dt>Date</dt><dd>{{ dateFR(d.quand, true) }}{{ d.vol ? ' · vol ' + d.vol : '' }}</dd>
              <dt>Passagers</dt><dd>{{ d.passagers }} · {{ d.bagages }} bagage{{ d.bagages > 1 ? 's' : '' }}</dd>
              @if (d.besoins) { <dt>Besoins</dt><dd>{{ d.besoins }}</dd> }
              <dt>Reçue le</dt><dd>{{ dateFR(d.created_at, true) }}</dd>
            </dl>
            <p style="margin-top:.8rem">
              <button class="btn btn-sm" [class.btn-green]="!d.traite" [class.btn-ghost]="d.traite" type="button"
                      (click)="marquer('demandes_transfert', d.id, !d.traite)">{{ d.traite ? 'Remettre à traiter' : 'Marquer comme traitée' }}</button>
            </p>
          </article>
        } @empty {
          @if (!service.chargement()) { <div class="vide-etat"><p>Aucune demande{{ masquerTraites() ? ' à traiter' : '' }}.</p></div> }
        }
      }
    </div>
  `
})
export class Messages {
  readonly service = inject(MessagesService);
  private readonly notifs = inject(NotificationsService);
  readonly dateFR = dateFR;
  readonly onglet = signal<Onglet>('contact');
  readonly masquerTraites = signal(true);

  readonly contacts = computed(() => this.service.contacts().filter(m => !this.masquerTraites() || !m.traite));
  readonly transferts = computed(() => this.service.transferts().filter(d => !this.masquerTraites() || !d.traite));
  readonly nonTraites = computed(() => ({
    contact: this.service.contacts().filter(m => !m.traite).length,
    transfert: this.service.transferts().filter(d => !d.traite).length
  }));

  constructor() {
    this.service.charger();
  }

  async marquer(table: 'messages_contact' | 'demandes_transfert', id: number, traite: boolean) {
    const m = await this.service.marquer(table, id, traite);
    if (m) this.notifs.erreur(m);
    else this.notifs.succes(traite ? 'Marqué comme traité.' : 'Remis à traiter.');
  }
}
