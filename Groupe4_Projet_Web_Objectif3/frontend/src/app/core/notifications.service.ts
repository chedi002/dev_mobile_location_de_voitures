import { Injectable, signal } from '@angular/core';

export type TypeNotification = 'succes' | 'erreur' | 'info';

export interface Notification {
  id: number;
  type: TypeNotification;
  texte: string;
}

/**
 * Petits messages de confirmation (« toasts ») affichés en bas à droite,
 * qui disparaissent seuls après quelques secondes.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  readonly liste = signal<Notification[]>([]);
  private prochainId = 1;

  succes(texte: string) { this.afficher('succes', texte); }
  erreur(texte: string) { this.afficher('erreur', texte, 7000); }
  info(texte: string) { this.afficher('info', texte); }

  fermer(id: number) {
    this.liste.update(l => l.filter(n => n.id !== id));
  }

  private afficher(type: TypeNotification, texte: string, duree = 4500) {
    const id = this.prochainId++;
    this.liste.update(l => [...l.slice(-2), { id, type, texte }]); // trois au plus à l'écran
    setTimeout(() => this.fermer(id), duree);
  }
}
