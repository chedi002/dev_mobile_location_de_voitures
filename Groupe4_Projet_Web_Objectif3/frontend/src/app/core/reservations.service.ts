import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { api, messageDe } from './api';
import { AuthService } from './auth.service';
import { FlotteService } from './flotte.service';
import { LignePrix, Reservation, StatutReservation } from './modeles';

export const LIBELLES_STATUT: Record<StatutReservation, string> = {
  en_attente: 'demande envoyée', confirmee: 'confirmée', annulee: 'annulée', terminee: 'terminée'
};
export const CLASSES_STATUT: Record<StatutReservation, string> = {
  en_attente: 'st-attente', confirmee: 'st-confirme', annulee: 'st-annule', terminee: 'st-confirme'
};

/** Données envoyées à POST /api/reservations. Le prix n'en fait pas partie : le serveur le calcule. */
export interface NouvelleReservation {
  vehicule: number;          // un modèle du catalogue
  depart: string;
  retour: string;
  debut: Date;
  fin: Date;
  options: string[];
  age: string;
  voyageurs: number;
  bagages: number;
  client: { prenom: string; nom: string; email: string; tel: string; vol: string };
}

export interface ReservationCreee {
  ref: string;
  immatriculation: string;
  total: number;
  nj: number;
  lignes: LignePrix[];
}

/** Réservations du client connecté, via l'API Express. */
@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private readonly auth = inject(AuthService);
  private readonly flotte = inject(FlotteService);

  readonly mesReservations = signal<Reservation[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal('');

  constructor() {
    // Rechargée à chaque connexion, vidée à la déconnexion.
    effect(() => {
      const id = this.auth.utilisateur()?.id;
      untracked(() => (id ? this.charger() : this.mesReservations.set([])));
    });
  }

  async charger() {
    this.chargement.set(true);
    try {
      this.mesReservations.set(await api<Reservation[]>('/reservations/moi', { connecte: true }));
      this.erreur.set('');
    } catch (e) {
      this.erreur.set(messageDe(e));
    } finally {
      this.chargement.set(false);
    }
  }

  /** Crée la réservation : le serveur choisit une voiture libre, calcule le prix et empêche les doublons. */
  async creer(r: NouvelleReservation): Promise<{ erreur: string; resultat?: ReservationCreee }> {
    try {
      const resultat = await api<ReservationCreee>('/reservations', {
        methode: 'POST', connecte: true,
        corps: { ...r, debut: r.debut.toISOString(), fin: r.fin.toISOString() }
      });
      await Promise.all([this.charger(), this.flotte.chargerOccupations()]);
      return { erreur: '', resultat };
    } catch (e) {
      return { erreur: messageDe(e) };
    }
  }

  async annuler(ref: string): Promise<string> {
    try {
      await api(`/reservations/${encodeURIComponent(ref)}/annuler`, { methode: 'POST', connecte: true });
      await Promise.all([this.charger(), this.flotte.chargerOccupations()]);
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }
}
