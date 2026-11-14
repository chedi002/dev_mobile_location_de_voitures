import { Component, computed, input, signal } from '@angular/core';
import { Reservation, StatutReservation, Voiture } from '../core/modeles';
import { LIBELLES_STATUT } from '../core/reservations.service';
import { dateFR } from '../core/stockage.service';

const NB_JOURS = 30;
const JOUR = 864e5;
const CLASSE: Record<StatutReservation, string> = {
  en_attente: 'b-attente', confirmee: 'b-confirmee', terminee: 'b-terminee', annulee: 'b-annulee'
};

interface Barre { g: number; w: number; cls: string; titre: string; }

/**
 * Planning d'occupation de la flotte (diagramme de Gantt) : une ligne par voiture,
 * un jour par colonne, une barre par réservation. Dessiné en HTML/CSS, sans bibliothèque.
 */
@Component({
  selector: 'app-planning-flotte',
  template: `
    <div class="outils">
      <label>Agence
        <select [value]="agence()" (change)="agence.set($any($event.target).value)">
          <option value="">Toutes</option>
          @for (a of agences(); track a) { <option [value]="a">{{ a }}</option> }
        </select>
      </label>
      <label class="coche"><input type="checkbox" [checked]="occupeesSeules()" (change)="occupeesSeules.set($any($event.target).checked)"> Seulement les voitures réservées</label>
      <span class="nav">
        <button type="button" class="btn btn-ghost btn-sm" (click)="decaler(-14)" aria-label="Quinze jours plus tôt">‹</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="aujourdhui()">Aujourd’hui</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="decaler(14)" aria-label="Quinze jours plus tard">›</button>
      </span>
    </div>
    <ul class="legende">
      @for (s of statuts; track s) { <li><i [class]="'pastille ' + classe[s]"></i>{{ libelles[s] }}</li> }
    </ul>

    <div class="corps" role="region" aria-label="Planning d’occupation des voitures">
      <div class="contenu" [style.--n]="nb">
        <div class="ligne tete">
          <div class="nom"></div>
          <div class="jours">
            @for (j of jours(); track j.i) {
              <span [class.we]="j.we" [class.auj]="j.auj"><small>{{ j.mois }}</small>{{ j.num }}</span>
            }
          </div>
        </div>
        @for (v of lignes(); track v.id) {
          <div class="ligne">
            <div class="nom"><b>{{ v.nom }}</b><small>{{ v.immat }} · {{ v.base }}</small></div>
            <div class="piste">
              @for (b of v.barres; track $index) {
                <span [class]="'barre ' + b.cls" [style.left.%]="b.g" [style.width.%]="b.w" [title]="b.titre"></span>
              }
            </div>
          </div>
        } @empty {
          <p class="vide">Aucune voiture à afficher.</p>
        }
        @if (posAuj() !== null) {
          <div class="calque"><span class="repere" [style.left.%]="posAuj()"></span></div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .outils { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: .8rem; }
    .outils label { display: flex; flex-direction: column; gap: .3rem; font-weight: 600; font-size: .9rem; }
    .outils .coche { flex-direction: row; align-items: center; gap: .5rem; font-weight: 500; }
    .nav { margin-left: auto; display: flex; gap: .4rem; }
    .legende { display: flex; flex-wrap: wrap; gap: 1rem; list-style: none; padding: 0; margin: 0 0 .8rem; font-size: .86rem; color: var(--muted); }
    .legende li { display: flex; align-items: center; gap: .4rem; }
    .pastille { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
    .b-attente { background: var(--amber); }
    .b-confirmee { background: var(--green); }
    .b-terminee { background: var(--sea); }
    .b-annulee { background: #B4534A; }

    .corps { max-height: 440px; overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--white); }
    .contenu { position: relative; min-width: 820px; }
    .ligne { display: grid; grid-template-columns: 190px 1fr; border-bottom: 1px solid var(--line); }
    .ligne:last-child { border-bottom: 0; }
    .nom { position: sticky; left: 0; z-index: 3; background: var(--white); padding: .35rem .7rem; display: flex; flex-direction: column;
           justify-content: center; border-right: 1px solid var(--line); line-height: 1.25; }
    .nom b { font-size: .88rem; color: var(--night); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nom small { color: var(--muted); font-size: .74rem; }
    .tete { position: sticky; top: 0; z-index: 4; background: var(--foam); }
    .tete .nom { background: var(--foam); }
    .jours { display: grid; grid-template-columns: repeat(var(--n), 1fr); }
    .jours span { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: .25rem 0; font-size: .78rem;
                  font-weight: 600; color: var(--ink); min-height: 2.2rem; }
    .jours small { font-size: .66rem; font-weight: 600; color: var(--muted); text-transform: uppercase; min-height: .8rem; }
    .jours .we { color: var(--muted); background: rgba(10, 35, 66, .05); }
    .jours .auj { color: var(--white); background: var(--night); border-radius: 6px; }
    .jours .auj small { color: var(--green-hi); }

    .piste { position: relative; min-height: 38px;
             background-image: linear-gradient(to right, var(--line) 1px, transparent 1px);
             background-size: calc(100% / var(--n)) 100%; }
    .barre { position: absolute; top: 7px; bottom: 7px; border-radius: 6px; min-width: 6px; box-shadow: 0 1px 2px rgba(10, 35, 66, .25); cursor: help; }
    .barre.b-annulee { opacity: .5; }
    .calque { position: absolute; top: 0; bottom: 0; left: 190px; right: 0; pointer-events: none; z-index: 2; }
    .repere { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--night); opacity: .65; }
    .vide { padding: 1.4rem; text-align: center; color: var(--muted); margin: 0; }
  `
})
export class PlanningFlotte {
  readonly voitures = input.required<Voiture[]>();
  readonly reservations = input.required<Reservation[]>();
  readonly agences = input<string[]>([]);

  readonly nb = NB_JOURS;
  readonly classe = CLASSE;
  readonly libelles = LIBELLES_STATUT;
  readonly statuts: StatutReservation[] = ['en_attente', 'confirmee', 'terminee'];

  readonly agence = signal('');
  readonly occupeesSeules = signal(false);
  /** Premier jour affiché (minuit) : 3 jours avant aujourd'hui au départ. */
  private readonly debut = signal(this.minuit(-3));

  private minuit(decalage: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + decalage);
    return d;
  }

  decaler(n: number) {
    const d = new Date(this.debut());
    d.setDate(d.getDate() + n);
    this.debut.set(d);
  }
  aujourdhui() {
    this.debut.set(this.minuit(-3));
  }

  readonly jours = computed(() => {
    const d0 = this.debut();
    const auj = new Date().toDateString();
    return Array.from({ length: NB_JOURS }, (_, i) => {
      const d = new Date(d0);
      d.setDate(d.getDate() + i);
      return {
        i, num: d.getDate(), we: d.getDay() === 0 || d.getDay() === 6, auj: d.toDateString() === auj,
        mois: i === 0 || d.getDate() === 1 ? d.toLocaleDateString('fr-FR', { month: 'short' }) : ''
      };
    });
  });

  /** Position de la ligne « aujourd'hui » en % de la largeur, ou null si hors de la fenêtre. */
  readonly posAuj = computed(() => {
    const p = (Date.now() - this.debut().getTime()) / JOUR;
    return p >= 0 && p <= NB_JOURS ? (p / NB_JOURS) * 100 : null;
  });

  readonly lignes = computed(() => {
    const t0 = this.debut().getTime();
    const parVoiture = new Map<number, Reservation[]>();
    for (const r of this.reservations()) {
      if (r.statut === 'annulee') continue;
      if (!parVoiture.has(r.vehicule_id)) parVoiture.set(r.vehicule_id, []);
      parVoiture.get(r.vehicule_id)!.push(r);
    }
    const lignes = this.voitures()
      .filter(v => !this.agence() || v.base === this.agence())
      .map(v => ({
        id: v.id, nom: v.nom, immat: v.immat, base: v.base,
        barres: (parVoiture.get(v.id) ?? []).flatMap((r): Barre[] => {
          // position en jours (fractionnaires) depuis le premier jour affiché
          const d = (new Date(r.debut).getTime() - t0) / JOUR;
          const f = (new Date(r.fin).getTime() - t0) / JOUR;
          if (f <= 0 || d >= NB_JOURS) return [];
          const g = Math.max(d, 0);
          const w = Math.min(f, NB_JOURS) - g;
          return [{
            g: (g / NB_JOURS) * 100, w: (w / NB_JOURS) * 100, cls: CLASSE[r.statut],
            titre: `${r.ref} — ${r.client_prenom} ${r.client_nom}\n${dateFR(r.debut)} → ${dateFR(r.fin)} · ${r.total_tnd} DT\n${LIBELLES_STATUT[r.statut]}`
          }];
        })
      }))
      .filter(l => !this.occupeesSeules() || l.barres.length);
    return lignes.sort((a, b) => a.base.localeCompare(b.base) || a.nom.localeCompare(b.nom));
  });
}