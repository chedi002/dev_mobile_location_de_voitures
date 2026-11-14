import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { AdminService } from '../../core/admin.service';
import { FlotteService } from '../../core/flotte.service';
import { MessagesService } from '../../core/messages.service';
import { StatutReservation } from '../../core/modeles';
import { prixDT } from '../../core/outils';
import { CLASSES_STATUT, LIBELLES_STATUT } from '../../core/reservations.service';
import { dateFR } from '../../core/stockage.service';
import { Bulle, CarteBulles, Flux } from '../../shared/carte-bulles';
import { COULEURS, Graphique } from '../../shared/graphique';
import { PlanningFlotte } from '../../shared/planning-flotte';
import { AFaire } from './a-faire';

const NB_MOIS = 12;
const COULEUR_STATUT: Record<StatutReservation, string> = {
  en_attente: COULEURS.ambre, confirmee: COULEURS.vert, terminee: COULEURS.mer, annulee: COULEURS.rouge
};

const cleMois = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

@Component({
  selector: 'app-tableau',
  imports: [RouterLink, Graphique, AFaire, PlanningFlotte, CarteBulles],
  styles: `
    .graphs { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.2rem; margin-bottom: 1.4rem; }
    .graphs .panel { margin-top: 0; }
    .graphs .note { margin-bottom: 0; }
    .plein { margin-bottom: 1.4rem; }
    .entete { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: 1rem; }
    .entete h2 { margin: 0; }
    .bascule { display: flex; gap: .4rem; }
    app-carte-bulles { height: 380px; border-radius: 10px; overflow: hidden; }
  `,
  template: `
    <h1>Tableau de bord</h1>
    <p class="sous">Vue d’ensemble des demandes et de la flotte.</p>
    <div class="kpis">
      <div class="kpi ambre"><b>{{ enAttente() }}</b><span>demande{{ enAttente() > 1 ? 's' : '' }} à traiter</span></div>
      <div class="kpi vert"><b>{{ aVenir() }}</b><span>location{{ aVenir() > 1 ? 's' : '' }} confirmée{{ aVenir() > 1 ? 's' : '' }} à venir</span></div>
      <div class="kpi"><b>{{ prixDT(ca()) }}</b><span>chiffre d’affaires confirmé</span></div>
      <div class="kpi"><b>{{ libres() }} / {{ flotte.flotte().length }}</b><span>voitures disponibles</span></div>
    </div>

    <div class="plein">
      <app-a-faire [reservations]="admin.reservations()" [voitures]="flotte.flotte()"
                   [contacts]="messages.contacts()" [transferts]="messages.transferts()" />
    </div>

    @if (admin.reservations().length) {
      <div class="graphs">
        <div class="panel">
          <h2>Chiffre d’affaires par mois</h2>
          <app-graphique [config]="grapheCA()" titre="Histogramme du chiffre d’affaires par mois" />
          <p class="note">Réservations confirmées ou terminées, comptées au mois de départ (en DT).</p>
        </div>
        <div class="panel">
          <h2>Demandes reçues par mois</h2>
          <app-graphique [config]="grapheDemandes()" titre="Courbe du nombre de demandes par mois" />
          <p class="note">Toutes les demandes, au mois où elles ont été faites.</p>
        </div>
        <div class="panel">
          <h2>Réservations par statut</h2>
          <app-graphique [config]="grapheStatuts()" titre="Répartition des réservations par statut" />
        </div>
        <div class="panel">
          <h2>Demandes par agence de départ</h2>
          <app-graphique [config]="grapheAgences()" titre="Nombre de demandes par agence de départ" />
        </div>
      </div>
    }

    <div class="panel plein">
      <h2>Planning d’occupation de la flotte</h2>
      <p class="note" style="margin-top:0">Une ligne par voiture, une barre par réservation. Survolez une barre pour voir le client et les dates.</p>
      <app-planning-flotte [voitures]="flotte.flotte()" [reservations]="admin.reservations()" [agences]="flotte.agences()" />
    </div>

    <div class="panel plein">
      <div class="entete">
        <h2>Activité par agence</h2>
        <div class="bascule" role="group" aria-label="Mesure représentée par les bulles">
          <button type="button" class="btn btn-sm" [class.btn-green]="metrique() === 'demandes'" [class.btn-ghost]="metrique() !== 'demandes'" (click)="metrique.set('demandes')">Demandes</button>
          <button type="button" class="btn btn-sm" [class.btn-green]="metrique() === 'ca'" [class.btn-ghost]="metrique() !== 'ca'" (click)="metrique.set('ca')">Chiffre d’affaires</button>
        </div>
      </div>
      <app-carte-bulles [agences]="flotte.agencesInfo()" [bulles]="bulles()" [flux]="flux()" />
      <p class="note">Taille de la bulle : {{ metrique() === 'ca' ? 'chiffre d’affaires (DT)' : 'nombre de demandes' }} par agence de départ (hors demandes refusées). Les lignes en pointillés montrent les voitures rendues dans une autre agence : plus elles sont épaisses, plus il y a de retours.</p>
    </div>

    <div class="cols-2">
      <div class="panel">
        <h2>Dernières demandes</h2>
        @if (admin.erreur()) { <p class="err" role="alert">{{ admin.erreur() }}</p> }
        @for (r of dernieres(); track r.ref) {
          <article class="resa-item">
            <header><span class="ref">{{ r.ref }}</span><span class="statut" [class]="classes[r.statut]">{{ libelles[r.statut] }}</span></header>
            <dl>
              <dt>Client</dt><dd>{{ r.client_prenom }} {{ r.client_nom }}</dd>
              <dt>Voiture</dt><dd>{{ r.vehicule ? r.vehicule.marque + ' ' + r.vehicule.modele : '—' }}</dd>
              <dt>Période</dt><dd>{{ dateFR(r.debut) }} → {{ dateFR(r.fin) }}</dd>
              <dt>Montant</dt><dd><strong>{{ r.total_tnd }} DT</strong></dd>
            </dl>
          </article>
        } @empty {
          <div class="vide-etat"><p>{{ admin.chargement() ? 'Chargement…' : 'Aucune demande pour l’instant.' }}</p></div>
        }
        <p style="margin-top:1rem"><a class="btn btn-green btn-sm" routerLink="/admin/reservations">Toutes les demandes</a></p>
      </div>
      <div class="panel">
        <h2>Répartition de la flotte</h2>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Catégorie</th><th class="num">Voitures</th><th class="num">Disponibles</th><th class="num">Prix moyen</th></tr></thead>
            <tbody>
              @for (l of repartition(); track l.code) {
                <tr><td>{{ l.nom }}</td><td class="num">{{ l.n }}</td><td class="num">{{ l.libres }}</td><td class="num">{{ prixDT(l.moy) }}</td></tr>
              }
              <tr><td><strong>Total</strong></td><td class="num"><strong>{{ flotte.flotte().length }}</strong></td><td class="num"><strong>{{ libres() }}</strong></td><td class="num"></td></tr>
            </tbody>
          </table>
        </div>
        <p class="note">Source : base Supabase, tables <code>vehicules</code> et <code>reservations</code>.</p>
      </div>
    </div>
  `
})
export class Tableau {
  readonly flotte = inject(FlotteService);
  readonly admin = inject(AdminService);
  readonly messages = inject(MessagesService);
  readonly prixDT = prixDT;
  readonly dateFR = dateFR;
  readonly classes = CLASSES_STATUT;
  readonly libelles = LIBELLES_STATUT;

  readonly enAttente = computed(() => this.admin.reservations().filter(r => r.statut === 'en_attente').length);
  readonly aVenir = computed(() => this.admin.reservations().filter(r => r.statut === 'confirmee' && new Date(r.debut) > new Date()).length);
  readonly ca = computed(() => this.admin.reservations()
    .filter(r => r.statut === 'confirmee' || r.statut === 'terminee').reduce((s, r) => s + (+r.total_tnd || 0), 0));
  readonly dernieres = computed(() => this.admin.reservations().slice(0, 5));
  readonly libres = computed(() => this.flotte.flotte().filter(v => v.statut === 'disponible').length);
  readonly repartition = computed(() => this.flotte.ordre().map(code => {
    const L = this.flotte.flotte().filter(v => v.cat === code);
    return {
      code, nom: this.flotte.nomCat(code), n: L.length, libres: L.filter(v => v.statut === 'disponible').length,
      moy: L.reduce((s, v) => s + v.prix, 0) / (L.length || 1)
    };
  }).filter(l => l.n));

  /** Les 12 derniers mois (le mois courant en dernier) : clé de regroupement + libellé court. */
  private readonly mois = computed(() => {
    const auj = new Date();
    return Array.from({ length: NB_MOIS }, (_, i) => {
      const d = new Date(auj.getFullYear(), auj.getMonth() - (NB_MOIS - 1 - i), 1);
      return { cle: cleMois(d), label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) };
    });
  });

  /** Chiffre d'affaires mensuel (histogramme). */
  readonly grapheCA = computed<ChartConfiguration>(() => {
    const somme = new Map<string, number>();
    for (const r of this.admin.reservations()) {
      if (r.statut !== 'confirmee' && r.statut !== 'terminee') continue;
      const k = cleMois(new Date(r.debut));
      somme.set(k, (somme.get(k) ?? 0) + (+r.total_tnd || 0));
    }
    return {
      type: 'bar',
      data: {
        labels: this.mois().map(m => m.label),
        datasets: [{ label: 'CA (DT)', data: this.mois().map(m => somme.get(m.cle) ?? 0), backgroundColor: COULEURS.vert, borderRadius: 6 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    };
  });

  /** Nombre de demandes reçues chaque mois (courbe). */
  readonly grapheDemandes = computed<ChartConfiguration>(() => {
    const n = new Map<string, number>();
    for (const r of this.admin.reservations()) {
      const k = cleMois(new Date(r.created_at));
      n.set(k, (n.get(k) ?? 0) + 1);
    }
    return {
      type: 'line',
      data: {
        labels: this.mois().map(m => m.label),
        datasets: [{
          label: 'Demandes', data: this.mois().map(m => n.get(m.cle) ?? 0), borderColor: COULEURS.mer,
          backgroundColor: 'rgba(14,124,155,.15)', fill: true, tension: 0.3, pointRadius: 3
        }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    };
  });

  /** Réservations par statut (anneau). */
  readonly grapheStatuts = computed<ChartConfiguration>(() => {
    const ordre: StatutReservation[] = ['en_attente', 'confirmee', 'terminee', 'annulee'];
    const R = this.admin.reservations();
    return {
      type: 'doughnut',
      data: {
        labels: ordre.map(s => LIBELLES_STATUT[s]),
        datasets: [{ data: ordre.map(s => R.filter(r => r.statut === s).length), backgroundColor: ordre.map(s => COULEUR_STATUT[s]) }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
    };
  });

  /** Demandes par agence de départ (barres horizontales, de la plus demandée à la moins demandée). */
  readonly grapheAgences = computed<ChartConfiguration>(() => {
    const n = new Map<string, number>();
    for (const r of this.admin.reservations()) {
      const ville = r.depart?.ville ?? 'Non précisée';
      n.set(ville, (n.get(ville) ?? 0) + 1);
    }
    const tri = [...n].sort((a, b) => b[1] - a[1]);
    return {
      type: 'bar',
      data: {
        labels: tri.map(([v]) => v),
        datasets: [{ label: 'Demandes', data: tri.map(([, c]) => c), backgroundColor: COULEURS.mer, borderRadius: 6 }]
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
    };
  });

  /** Mesure représentée par la carte à bulles. */
  readonly metrique = signal<'demandes' | 'ca'>('demandes');

  /** Une bulle par agence de départ. */
  readonly bulles = computed<Bulle[]>(() => {
    const par = new Map<string, { n: number; ca: number }>();
    for (const r of this.admin.reservations()) {
      if (r.statut === 'annulee') continue;
      const ville = r.depart?.ville;
      if (!ville) continue;
      const a = par.get(ville) ?? { n: 0, ca: 0 };
      a.n++;
      if (r.statut === 'confirmee' || r.statut === 'terminee') a.ca += +r.total_tnd || 0;
      par.set(ville, a);
    }
    const ca = this.metrique() === 'ca';
    return [...par].map(([ville, a]) => ({
      ville, valeur: ca ? a.ca : a.n,
      detail: `${a.n} demande${a.n > 1 ? 's' : ''} · ${prixDT(a.ca)} confirmés`
    }));
  });

  /** Retours dans une autre agence, regroupés par trajet. */
  readonly flux = computed<Flux[]>(() => {
    const n = new Map<string, Flux>();
    for (const r of this.admin.reservations()) {
      const de = r.depart?.ville, vers = r.retour?.ville;
      if (r.statut === 'annulee' || !de || !vers || de === vers) continue;
      const cle = `${de}>${vers}`;
      const f = n.get(cle) ?? { de, vers, n: 0 };
      f.n++;
      n.set(cle, f);
    }
    return [...n.values()];
  });

  constructor() {
    this.admin.chargerReservations();
    this.messages.charger();
  }
}