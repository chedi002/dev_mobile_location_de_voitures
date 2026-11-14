import { Injectable, inject, signal } from '@angular/core';
import { api, messageDe } from './api';
import { FlotteService } from './flotte.service';
import { Reservation, StatutReservation } from './modeles';

/** Administration de l'agence, via l'API Express (/api/admin, comptes administrateurs uniquement). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly flotte = inject(FlotteService);

  readonly reservations = signal<Reservation[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal('');

  async chargerReservations() {
    this.chargement.set(true);
    try {
      this.reservations.set(await api<Reservation[]>('/admin/reservations', { connecte: true }));
      this.erreur.set('');
    } catch (e) {
      this.erreur.set(messageDe(e));
    } finally {
      this.chargement.set(false);
    }
  }

  async changerStatut(ref: string, statut: StatutReservation): Promise<string> {
    try {
      await api(`/admin/reservations/${encodeURIComponent(ref)}`, { methode: 'PATCH', connecte: true, corps: { statut } });
      await Promise.all([this.chargerReservations(), this.flotte.chargerOccupations()]);
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }

  /** Modifie une voiture : prix et dépôt en DT, statut, agence d'attache (ville). */
  async modifierVoiture(id: number, champs: { prix?: number; depot?: number; statut?: string; agence?: string }): Promise<string> {
    try {
      await api(`/admin/vehicules/${id}`, { methode: 'PATCH', connecte: true, corps: champs });
      await this.flotte.recharger();
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }
}
