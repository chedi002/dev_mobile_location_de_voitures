import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../core/messages.service';
import { NotificationsService } from '../../core/notifications.service';
import { EMAIL, loc } from '../../core/outils';

/** Demande de transfert aéroport : validation puis enregistrement dans Supabase (table demandes_transfert). */
@Component({
  selector: 'app-transfert',
  imports: [FormsModule],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Transfert aéroport</h1>
      <p>Un chauffeur vous attend à l’arrivée de votre vol et vous conduit à destination, sans passage par le comptoir.</p>
    </div></section>

    <section class="wrap section">
      <div class="cols-side">
        <div class="panel">
          <h2>Votre demande de transfert</h2>
          @if (!envoye()) {
            <form class="form-grid" novalidate (ngSubmit)="envoyer()">
              <label>Sens du trajet
                <select name="sens" [(ngModel)]="sens">
                  <option value="arrivee">Aéroport → destination</option>
                  <option value="depart">Destination → aéroport</option>
                </select>
              </label>
              <label>Aéroport
                <select name="aero" [(ngModel)]="aeroport">@for (a of aeroports; track a) { <option>{{ a }}</option> }</select>
              </label>
              <label class="full">Adresse ou hôtel <input type="text" name="lieu" [placeholder]="libelleLieu()" [(ngModel)]="lieu"></label>
              <label>Date et heure <input type="datetime-local" name="quand" [min]="maintenant" [(ngModel)]="quand"></label>
              <label>Numéro de vol <span class="form-note">pour suivre les retards</span>
                <input type="text" name="vol" placeholder="TU 0712" [(ngModel)]="vol">
              </label>
              <label>Passagers <input type="number" name="pax" min="1" max="16" [(ngModel)]="pax"></label>
              <label>Bagages <input type="number" name="bag" min="0" max="20" [(ngModel)]="bag"></label>
              <label class="full">Besoins particuliers <span class="form-note">siège bébé, mobilité réduite, véhicule de groupe</span>
                <textarea name="note" rows="3" [(ngModel)]="note"></textarea>
              </label>
              <label>Prénom et nom <input type="text" name="nomComplet" autocomplete="name" [(ngModel)]="nom"></label>
              <label>Adresse e-mail <input type="email" name="email" autocomplete="email" [(ngModel)]="email"></label>
              <p class="err full" role="alert">{{ erreur() }}</p>
              <div class="full"><button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Envoi…' : 'Demander un devis' }}</button></div>
            </form>
          } @else {
            <div class="ok-msg">
              @if (+pax() > 8) {
                Demande enregistrée. Au-delà de huit passagers, deux véhicules sont prévus : l’agence vous envoie un devis ferme sous un jour ouvré.
              } @else {
                Demande enregistrée. L’agence vous envoie un devis ferme sous un jour ouvré.
              }
            </div>
          }
        </div>

        <aside>
          <div class="panel panel-sticky">
            <h3>Comment ça se passe</h3>
            <ol style="margin-left:1.1rem;color:var(--muted);font-size:.93rem">
              <li>Vous décrivez le trajet et votre vol.</li>
              <li>L’agence confirme le prix au forfait.</li>
              <li>Le chauffeur suit votre vol et s’adapte aux retards.</li>
              <li>Il vous attend à la sortie, pancarte au nom indiqué.</li>
            </ol>
            <h3 style="margin-top:1.2rem">Bon à savoir</h3>
            <p class="note" style="margin-top:.3rem">Le prix dépend de la distance et du nombre de passagers. Pour plus de huit personnes, deux véhicules sont prévus. Le transfert peut être combiné à une location : indiquez-le dans les besoins particuliers.</p>
          </div>
        </aside>
      </div>
    </section>
  `
})
export class Transfert {
  private readonly messages = inject(MessagesService);
  private readonly notifs = inject(NotificationsService);
  readonly envoi = signal(false);
  readonly aeroports = ['Tunis-Carthage', 'Enfidha-Hammamet', 'Monastir Habib-Bourguiba', 'Djerba-Zarzis'];
  readonly maintenant = loc(new Date()); // un transfert se prépare à l'avance : pas de date passée
  readonly sens = signal('arrivee');
  readonly aeroport = signal(this.aeroports[0]);
  readonly lieu = signal('');
  readonly quand = signal('');
  readonly vol = signal('');
  readonly pax = signal(2);
  readonly bag = signal(2);
  readonly note = signal('');
  readonly nom = signal('');
  readonly email = signal('');
  readonly erreur = signal('');
  readonly envoye = signal(false);

  readonly libelleLieu = computed(() => this.sens() === 'arrivee'
    ? 'Où vous déposer : hôtel, quartier et ville'
    : 'Où vous prendre en charge : hôtel, quartier et ville');

  private valider() {
    if (!this.lieu().trim()) return 'Indiquez l’adresse ou le nom de l’hôtel.';
    if (!this.quand()) return 'Indiquez la date et l’heure du transfert.';
    if (new Date(this.quand()) < new Date()) return 'La date du transfert doit être dans le futur.';
    if (!(+this.pax() >= 1)) return 'Indiquez au moins un passager.';
    if (!this.nom().trim()) return 'Indiquez le nom qui figurera sur la pancarte du chauffeur.';
    if (!EMAIL.test(this.email().trim())) return 'Saisissez une adresse e-mail valide.';
    return '';
  }

  async envoyer() {
    let m = this.valider();
    this.erreur.set(m);
    if (m || this.envoi()) return;
    this.envoi.set(true);
    m = await this.messages.envoyerTransfert({
      sens: this.sens() as 'arrivee' | 'depart', aeroport: this.aeroport(), lieu: this.lieu().trim(),
      quand: new Date(this.quand()).toISOString(), vol: this.vol().trim() || null,
      passagers: +this.pax(), bagages: +this.bag() || 0, besoins: this.note().trim() || null,
      nom: this.nom().trim(), email: this.email().trim()
    });
    this.envoi.set(false);
    this.erreur.set(m);
    if (!m) {
      this.envoye.set(true);
      this.notifs.succes('Demande de transfert envoyée.');
    }
  }
}
