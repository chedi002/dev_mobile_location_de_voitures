import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemandeTransfert, MessageContact } from '../../core/messages.service';
import { Reservation, Voiture } from '../../core/modeles';

const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const HEURE = 36e5;

interface Tache { cle: string; titre: string; n: number; lignes: string[]; lien: string; urgent: boolean; }

/** « À faire aujourd'hui » : ce que l'administrateur doit traiter en ouvrant le tableau de bord. */
@Component({
  selector: 'app-a-faire',
  imports: [RouterLink],
  template: `
    <div class="panel">
      <h2>À faire aujourd’hui <small>{{ jour }}</small></h2>
      <div class="taches">
        @for (t of taches(); track t.cle) {
          <a class="tache" [class.zero]="!t.n" [class.urgent]="t.urgent && t.n" [routerLink]="t.lien">
            <b>{{ t.n }}</b>
            <span class="titre">{{ t.titre }}</span>
            @for (l of t.lignes; track l) { <span class="ligne">{{ l }}</span> }
            @if (t.n > t.lignes.length) { <span class="ligne plus">+ {{ t.n - t.lignes.length }} autre{{ t.n - t.lignes.length > 1 ? 's' : '' }}</span> }
          </a>
        }
      </div>
      @if (toutEstCalme()) { <p class="note">Rien d’urgent aujourd’hui : aucun départ, retour ni demande en retard.</p> }
    </div>
  `,
  styles: `
    h2 small { font: 500 .9rem var(--font-b); color: var(--muted); margin-left: .6rem; text-transform: capitalize; }
    .taches { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: .9rem; }
    .tache { display: flex; flex-direction: column; gap: .2rem; padding: .9rem 1rem; border: 1px solid var(--line); border-radius: 12px;
             background: var(--foam); color: var(--ink); text-decoration: none; transition: transform .15s, box-shadow .15s; }
    .tache:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(10, 35, 66, .1); }
    .tache b { font: 800 1.9rem var(--font-d); color: var(--green); line-height: 1; }
    .tache.urgent { background: var(--amber-soft); border-color: var(--amber); }
    .tache.urgent b { color: var(--amber-deep); }
    .tache.zero { opacity: .65; }
    .tache.zero b { color: var(--muted); }
    .titre { font-weight: 700; margin-bottom: .3rem; }
    .ligne { font-size: .84rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .plus { font-style: italic; }
  `
})
export class AFaire {
  readonly reservations = input.required<Reservation[]>();
  readonly voitures = input.required<Voiture[]>();
  readonly contacts = input<MessageContact[]>([]);
  readonly transferts = input<DemandeTransfert[]>([]);

  readonly jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  private static client = (r: Reservation) => `${r.client_prenom} ${r.client_nom}`;
  private static voiture = (r: Reservation) => (r.vehicule ? `${r.vehicule.marque} ${r.vehicule.modele}` : 'voiture');

  readonly taches = computed<Tache[]>(() => {
    const auj = new Date();
    const R = this.reservations();
    const departs = R.filter(r => r.statut === 'confirmee' && memeJour(new Date(r.debut), auj));
    const retours = R.filter(r => r.statut === 'confirmee' && memeJour(new Date(r.fin), auj));
    const retard = R.filter(r => r.statut === 'en_attente' && auj.getTime() - new Date(r.created_at).getTime() > 24 * HEURE);
    const maint = this.voitures().filter(v => v.statut === 'maintenance');
    const msgs = this.contacts().filter(m => !m.traite).length + this.transferts().filter(t => !t.traite).length;
    const msgsLignes = [
      ...this.contacts().filter(m => !m.traite).map(m => `${m.prenom} ${m.nom} — ${m.sujet}`),
      ...this.transferts().filter(t => !t.traite).map(t => `${t.nom} — transfert ${t.aeroport}`)
    ];
    const age = (r: Reservation) => {
      const h = Math.floor((auj.getTime() - new Date(r.created_at).getTime()) / HEURE);
      return h >= 48 ? `${Math.floor(h / 24)} j` : `${h} h`;
    };
    return [
      {
        cle: 'departs', titre: 'Départs du jour', n: departs.length, lien: '/admin/reservations', urgent: false,
        lignes: departs.slice(0, 3).map(r => `${AFaire.client(r)} · ${AFaire.voiture(r)} · ${r.depart?.ville ?? ''}`)
      },
      {
        cle: 'retours', titre: 'Retours du jour', n: retours.length, lien: '/admin/reservations', urgent: false,
        lignes: retours.slice(0, 3).map(r => `${AFaire.client(r)} · ${AFaire.voiture(r)} · ${r.retour?.ville ?? ''}`)
      },
      {
        cle: 'retard', titre: 'Demandes sans réponse depuis plus de 24 h', n: retard.length, lien: '/admin/reservations', urgent: true,
        lignes: retard.slice(0, 3).map(r => `${r.ref} · ${AFaire.client(r)} · il y a ${age(r)}`)
      },
      {
        cle: 'messages', titre: 'Messages non traités', n: msgs, lien: '/admin/messages', urgent: true,
        lignes: msgsLignes.slice(0, 3)
      },
      {
        cle: 'maintenance', titre: 'Voitures en maintenance', n: maint.length, lien: '/admin/flotte', urgent: false,
        lignes: maint.slice(0, 3).map(v => `${v.nom} · ${v.base}`)
      }
    ];
  });

  readonly toutEstCalme = computed(() => this.taches().every(t => !t.n));
}