import { Component, inject } from '@angular/core';
import { NotificationsService } from '../core/notifications.service';

/** Zone d'affichage des notifications, placée une fois dans chaque mise en page. */
@Component({
  selector: 'app-notifications',
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (n of notifs.liste(); track n.id) {
        <div class="toast" [class]="'toast toast-' + n.type" role="status">
          <span class="toast-texte">{{ n.texte }}</span>
          <button type="button" class="toast-fermer" aria-label="Fermer" (click)="notifs.fermer(n.id)">×</button>
        </div>
      }
    </div>
  `
})
export class Notifications {
  readonly notifs = inject(NotificationsService);
}
