import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { NotificationsService } from '../../core/notifications.service';
import { FlotteService } from '../../core/flotte.service';
import { Voiture } from '../../core/modeles';

const ETAT: Record<string, [string, string]> = {
  disponible: ['p-ok', 'Disponible'],
  reserve: ['p-maint', 'Réservé'],
  loue: ['p-maint', 'Loué'],
  en_transfert: ['p-maint', 'En transfert'],
  maintenance: ['p-off', 'En maintenance'],
  inactif: ['p-off', 'Inactif']
};

interface Brouillon { prix: number; depot: number; statut: string; agence: string; }

@Component({
  selector: 'app-flotte',
  imports: [FormsModule],
  template: `
    <h1>Gestion de la flotte</h1>
    <p class="sous">Toutes les voitures. Cliquez sur « Modifier » pour changer le prix, le dépôt, le statut ou l’agence.</p>
    <div class="panel">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:end;margin-bottom:1rem">
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Catégorie
          <select [(ngModel)]="cat"><option value="">Toutes</option>@for (c of flotte.ordre(); track c) { <option [value]="c">{{ flotte.nomCat(c) }}</option> }</select>
        </label>
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Agence d’attache
          <select [(ngModel)]="agence"><option value="">Toutes</option>@for (a of flotte.agences(); track a) { <option [value]="a">{{ a }}</option> }</select>
        </label>
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Statut
          <select [(ngModel)]="statut"><option value="">Tous</option>@for (e of etats; track e[0]) { <option [value]="e[0]">{{ e[1][1] }}</option> }</select>
        </label>
        <label style="display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.9rem">Recherche
          <input type="search" placeholder="Marque, modèle ou immatriculation" [(ngModel)]="q">
        </label>
        <span class="note" style="margin-left:auto">{{ liste().length }} véhicule{{ liste().length > 1 ? 's' : '' }} sur {{ flotte.flotte().length }}</span>
      </div>
      @if (message()) { <p class="err" role="alert" [style.color]="messageOk() ? 'var(--green-dark)' : null">{{ message() }}</p> }
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Véhicule</th><th>Immatriculation</th><th>Année</th><th>Catégorie</th>
            <th>Agence</th><th class="num">Prix / jour</th><th class="num">Dépôt</th><th>État</th><th></th>
          </tr></thead>
          <tbody>
            @for (v of liste(); track v.id) {
              <tr>
                <td><strong>{{ v.nom }}</strong></td>
                <td style="font-family:Consolas,monospace">{{ v.immat }}</td>
                <td class="num">{{ v.annee }}</td>
                <td>{{ flotte.nomCat(v.cat) }}</td>
                @if (edition() === v.id) {
                  <td><select [(ngModel)]="brouillon().agence">@for (a of flotte.agences(); track a) { <option [value]="a">{{ a }}</option> }</select></td>
                  <td class="num"><input type="number" min="1" step="1" style="width:6rem" [(ngModel)]="brouillon().prix"></td>
                  <td class="num"><input type="number" min="0" step="50" style="width:6rem" [(ngModel)]="brouillon().depot"></td>
                  <td><select [(ngModel)]="brouillon().statut">@for (e of etats; track e[0]) { <option [value]="e[0]">{{ e[1][1] }}</option> }</select></td>
                  <td style="white-space:nowrap">
                    <button class="btn btn-green btn-sm" type="button" [disabled]="enCours()" (click)="enregistrer(v)">{{ enCours() ? '…' : 'Enregistrer' }}</button>
                    <button class="link-btn" type="button" (click)="edition.set(null)">Annuler</button>
                  </td>
                } @else {
                  <td>{{ v.base }}</td>
                  <td class="num prix">{{ v.prix }} DT</td>
                  <td class="num">{{ v.depot }} DT</td>
                  <td><span class="pastille" [class]="etat(v.statut)[0]"></span>{{ etat(v.statut)[1] }}</td>
                  <td><button class="link-btn" type="button" (click)="modifier(v)">Modifier</button></td>
                }
              </tr>
            } @empty {
              <tr><td colspan="9">{{ flotte.pret() ? 'Aucun véhicule pour ces critères.' : 'Chargement de la flotte…' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <p class="note">Les modifications sont enregistrées dans la table <code>vehicules</code> de Supabase et visibles aussitôt dans le catalogue.
        Une voiture qui n’est pas « Disponible » n’est plus proposée à la réservation.</p>
    </div>
  `
})
export class Flotte {
  readonly flotte = inject(FlotteService);
  private readonly admin = inject(AdminService);
  private readonly notifs = inject(NotificationsService);
  readonly etats = Object.entries(ETAT);
  readonly cat = signal('');
  readonly agence = signal('');
  readonly statut = signal('');
  readonly q = signal('');

  readonly edition = signal<number | null>(null);
  readonly brouillon = signal<Brouillon>({ prix: 0, depot: 0, statut: '', agence: '' });
  readonly enCours = signal(false);
  readonly message = signal('');
  readonly messageOk = signal(false);

  readonly liste = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.flotte.flotte().filter(v =>
      (!this.cat() || v.cat === this.cat()) && (!this.agence() || v.base === this.agence()) &&
      (!this.statut() || v.statut === this.statut()) &&
      (!q || v.nom.toLowerCase().includes(q) || v.immat.toLowerCase().includes(q)));
  });

  etat(s: string) { return ETAT[s] ?? ['p-off', s]; }

  modifier(v: Voiture) {
    this.message.set('');
    this.brouillon.set({ prix: v.prix, depot: v.depot, statut: v.statut, agence: v.base });
    this.edition.set(v.id);
  }

  async enregistrer(v: Voiture) {
    const b = this.brouillon();
    if (!(+b.prix > 0) || !(+b.depot >= 0)) {
      this.messageOk.set(false);
      this.message.set('Le prix doit être positif et le dépôt ne peut pas être négatif.');
      return;
    }
    this.enCours.set(true);
    const m = await this.admin.modifierVoiture(v.id, {
      prix: Math.round(+b.prix), depot: Math.round(+b.depot), statut: b.statut, agence: b.agence
    });
    this.enCours.set(false);
    this.messageOk.set(false);
    this.message.set(m);
    if (!m) {
      this.edition.set(null);
      this.notifs.succes(`${v.nom} (${v.immat}) mise à jour.`);
    }
  }
}
