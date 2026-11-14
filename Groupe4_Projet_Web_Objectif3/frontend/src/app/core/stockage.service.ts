import { Injectable, signal } from '@angular/core';
import { RoadtripEnregistre } from './modeles';

const CLE_RT = 'wijha_roadtrip';

/**
 * Road-trip choisi, gardé dans le navigateur le temps de passer à la réservation.
 * (Les réservations, elles, sont dans Supabase : voir ReservationsService.)
 */
@Injectable({ providedIn: 'root' })
export class StockageService {
  readonly roadtrip = signal<RoadtripEnregistre | null>(lire());

  enregistrerRoadtrip(rt: RoadtripEnregistre) {
    this.roadtrip.set(rt);
    try { localStorage.setItem(CLE_RT, JSON.stringify(rt)); } catch { /* stockage indisponible */ }
  }
}

function lire(): RoadtripEnregistre | null {
  try {
    const v = localStorage.getItem(CLE_RT);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function dateFR(v: string | Date, avecHeure = false) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return avecHeure
    ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
