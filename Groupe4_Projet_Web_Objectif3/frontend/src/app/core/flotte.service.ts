import { Injectable, computed, signal } from '@angular/core';
import { api } from './api';
import { Agence, Dispo, Occupation, Periode, Vehicule, Voiture } from './modeles';
import { day } from './outils';

type Etat = 'chargement' | 'pret' | 'erreur';

/** Zones affichées sous le nom de chaque agence (absentes de la base). */
const ZONES: Record<string, string> = {
  'Tunis': 'Capitale', 'La Marsa': 'Banlieue nord', 'Sousse': 'Sahel',
  'Monastir': 'Sahel', 'Mahdia': 'Côte est', 'Djerba': 'Île de Djerba'
};

/** Réponse de GET /api/catalogue : le regroupement par modèle est fait par le serveur. */
interface Catalogue {
  categories: { code: string; nom: string }[];
  agences: Agence[];
  flotte: Voiture[];
  modeles: Vehicule[];
}

/**
 * Flotte WIJHA, lue par l'API Express (GET /api/catalogue et /api/occupations).
 * Chargée une seule fois, au premier accès, puis partagée par toutes les pages.
 */
@Injectable({ providedIn: 'root' })
export class FlotteService {
  readonly etat = signal<Etat>('chargement');
  readonly erreur = signal('');

  /** Une entrée par voiture physique (administration). */
  readonly flotte = signal<Voiture[]>([]);
  /** Une entrée par modèle (catalogue). */
  readonly vehicules = signal<Vehicule[]>([]);
  readonly categories = signal<Record<string, string>>({});
  readonly ordre = signal<string[]>([]);
  readonly agencesInfo = signal<Agence[]>([]);
  /** Créneaux réservés, par voiture. */
  readonly occupations = signal<Map<number, Occupation[]>>(new Map());

  readonly pret = computed(() => this.etat() === 'pret');
  readonly agences = computed(() => this.agencesInfo().map(a => a.ville));

  constructor() {
    this.charger().catch(e => {
      console.error('WIJHA – chargement du catalogue :', e);
      this.erreur.set(e instanceof Error ? e.message : String(e));
      this.etat.set('erreur');
    });
  }

  nomCat = (code: string) => this.categories()[code] ?? code;
  zone = (ville: string) => ZONES[ville] ?? '';
  parId = (id: number) => this.vehicules().find(v => v.id === id);

  /**
   * Disponibilité d'un modèle pour une période, à une agence (ou dans n'importe laquelle) :
   * il faut au moins une voiture « disponible » de ce modèle sans réservation qui chevauche.
   * Calcul d'affichage : à la confirmation, le serveur revérifie tout.
   */
  dispo(v: Vehicule, s: Periode, agence = ''): Dispo {
    if (!s.ok) return { e: 'na' };
    const candidates = v.voitures.filter(c => c.statut === 'disponible' && (!agence || c.base === agence));
    if (!candidates.length) return { e: 'no', libre: day(30) };
    const occ = this.occupations();
    let libre: Date | null = null;
    for (const c of candidates) {
      const genantes = (occ.get(c.id) ?? []).filter(o => o.debut < s.fin! && o.fin > s.deb!);
      if (!genantes.length) return { e: 'ok' };
      const fin = new Date(Math.max(...genantes.map(o => o.fin.getTime())));
      if (!libre || fin < libre) libre = fin;
    }
    return { e: 'no', libre: libre! };
  }

  /** Relit les créneaux réservés (après une réservation ou une annulation). */
  async chargerOccupations() {
    try {
      const lignes = await api<{ vehicule_id: number; debut: string; fin: string }[]>('/occupations');
      const m = new Map<number, Occupation[]>();
      lignes.forEach(l => {
        if (!m.has(l.vehicule_id)) m.set(l.vehicule_id, []);
        m.get(l.vehicule_id)!.push({ debut: new Date(l.debut), fin: new Date(l.fin) });
      });
      this.occupations.set(m);
    } catch { /* API indisponible : on garde les créneaux connus */ }
  }

  /** Relit toute la flotte (après une modification dans l'administration). */
  recharger() {
    return this.charger();
  }

  private async charger() {
    const [c] = await Promise.all([api<Catalogue>('/catalogue'), this.chargerOccupations()]);
    this.categories.set(Object.fromEntries(c.categories.map(x => [x.code, x.nom])));
    this.ordre.set(c.categories.map(x => x.code));
    this.agencesInfo.set(c.agences);
    this.flotte.set(c.flotte);
    this.vehicules.set(c.modeles);
    this.etat.set('pret');
  }
}
