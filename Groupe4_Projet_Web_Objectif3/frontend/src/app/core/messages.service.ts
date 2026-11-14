import { Injectable, signal } from '@angular/core';
import { api, messageDe } from './api';

export interface MessageContact {
  id: number;
  created_at: string;
  prenom: string;
  nom: string;
  email: string;
  tel: string | null;
  sujet: string;
  reference: string | null;
  message: string;
  traite: boolean;
}

export interface DemandeTransfert {
  id: number;
  created_at: string;
  sens: 'arrivee' | 'depart';
  aeroport: string;
  lieu: string;
  quand: string;
  vol: string | null;
  passagers: number;
  bagages: number;
  besoins: string | null;
  nom: string;
  email: string;
  traite: boolean;
}

export type NouveauMessage = Omit<MessageContact, 'id' | 'created_at' | 'traite'>;
export type NouvelleDemande = Omit<DemandeTransfert, 'id' | 'created_at' | 'traite'>;

/**
 * Messages de contact et demandes de transfert, via l'API Express.
 * Envoi ouvert à tous (POST /api/contact, /api/transferts) ; lecture réservée aux administrateurs.
 */
@Injectable({ providedIn: 'root' })
export class MessagesService {
  readonly contacts = signal<MessageContact[]>([]);
  readonly transferts = signal<DemandeTransfert[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal('');

  async envoyerContact(m: NouveauMessage): Promise<string> {
    try {
      await api('/contact', { methode: 'POST', corps: m, connecte: true });
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }

  async envoyerTransfert(d: NouvelleDemande): Promise<string> {
    try {
      await api('/transferts', { methode: 'POST', corps: d, connecte: true });
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }

  /* ---------- Administration ---------- */
  async charger() {
    this.chargement.set(true);
    try {
      const r = await api<{ contacts: MessageContact[]; transferts: DemandeTransfert[] }>('/admin/messages', { connecte: true });
      this.contacts.set(r.contacts);
      this.transferts.set(r.transferts);
      this.erreur.set('');
    } catch (e) {
      this.erreur.set(messageDe(e));
    } finally {
      this.chargement.set(false);
    }
  }

  async marquer(table: 'messages_contact' | 'demandes_transfert', id: number, traite: boolean): Promise<string> {
    const type = table === 'messages_contact' ? 'contact' : 'transfert';
    try {
      await api(`/admin/messages/${type}/${id}`, { methode: 'PATCH', connecte: true, corps: { traite } });
      await this.charger();
      return '';
    } catch (e) {
      return messageDe(e);
    }
  }
}
