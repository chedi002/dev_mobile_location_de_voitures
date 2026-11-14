import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessagesService } from '../../core/messages.service';
import { NotificationsService } from '../../core/notifications.service';
import { EMAIL } from '../../core/outils';

const REF = /^WJH-\d{6}-[A-Z0-9]{4}$/i;

/** Formulaire de contact : validation puis enregistrement dans Supabase (table messages_contact). */
@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Nous contacter</h1>
      <p>Une question sur une réservation, un devis longue durée, une demande de groupe ? Écrivez-nous, nous répondons sous un jour ouvré.</p>
    </div></section>

    <section class="wrap section">
      <div class="cols-side">
        <div class="panel">
          <h2>Formulaire de contact</h2>
          @if (!envoye()) {
            <form class="form-grid" novalidate (ngSubmit)="envoyer()">
              <label>Prénom <input type="text" name="prenom" autocomplete="given-name" [(ngModel)]="prenom"></label>
              <label>Nom <input type="text" name="nom" autocomplete="family-name" [(ngModel)]="nom"></label>
              <label>Adresse e-mail <input type="email" name="email" autocomplete="email" [(ngModel)]="email"></label>
              <label>Téléphone <input type="tel" name="tel" autocomplete="tel" placeholder="+216 …" [(ngModel)]="tel"></label>
              <label class="full">Sujet
                <select name="sujet" [(ngModel)]="sujet">
                  <option value="">Choisir…</option>
                  @for (s of sujets; track s) { <option>{{ s }}</option> }
                </select>
              </label>
              <label class="full">Référence de réservation <span class="form-note">facultatif, au format WJH-AAMMJJ-XXXX</span>
                <input type="text" name="reference" placeholder="WJH-261116-A1B2" [(ngModel)]="reference">
              </label>
              <label class="full">Message <textarea name="message" [(ngModel)]="message"></textarea></label>
              <p class="err full" role="alert">{{ erreur() }}</p>
              <div class="full"><button class="btn btn-green" type="submit" [disabled]="envoi()">{{ envoi() ? 'Envoi…' : 'Envoyer le message' }}</button></div>
            </form>
          } @else {
            <div class="ok-msg">Merci, votre message est enregistré. Nous vous répondons sous un jour ouvré à l’adresse indiquée.</div>
          }
        </div>

        <aside>
          <div class="panel panel-sticky">
            <h3>Coordonnées</h3>
            <dl class="ag-fiche" style="border:0;padding:0">
              <dt>Téléphone</dt><dd>+216 00 000 000</dd>
              <dt>E-mail</dt><dd>contact&#64;wijha.tn</dd>
              <dt>Horaires</dt><dd>Lundi au samedi, 8 h – 19 h</dd>
              <dt>Siège</dt><dd>Tunis, Tunisie</dd>
            </dl>
            <p class="note">Pour une urgence pendant une location en cours, appelez directement le numéro figurant sur votre contrat.</p>
            <p><a class="btn btn-ghost" routerLink="/agences">Les six agences</a></p>
          </div>
        </aside>
      </div>
    </section>
  `
})
export class Contact {
  private readonly messages = inject(MessagesService);
  private readonly notifs = inject(NotificationsService);
  readonly envoi = signal(false);
  readonly sujets = ['Question sur une réservation', 'Devis longue durée', 'Demande de groupe ou mariage', 'Transfert aéroport', 'Réclamation', 'Autre'];
  readonly prenom = signal('');
  readonly nom = signal('');
  readonly email = signal('');
  readonly tel = signal('');
  readonly sujet = signal('');
  readonly reference = signal('');
  readonly message = signal('');
  readonly erreur = signal('');
  readonly envoye = signal(false);

  private valider() {
    if (!this.prenom().trim() || !this.nom().trim()) return 'Indiquez votre prénom et votre nom.';
    if (!EMAIL.test(this.email().trim())) return 'Saisissez une adresse e-mail valide, par exemple nom@exemple.tn.';
    if (this.tel().trim() && this.tel().replace(/\D/g, '').length < 8) return 'Le numéro de téléphone doit comporter au moins 8 chiffres.';
    if (!this.sujet()) return 'Choisissez un sujet.';
    if (this.reference().trim() && !REF.test(this.reference().trim())) return 'La référence doit ressembler à WJH-261116-A1B2.';
    if (this.message().trim().length < 20) return 'Détaillez un peu votre message, 20 caractères au minimum.';
    return '';
  }

  async envoyer() {
    let m = this.valider();
    this.erreur.set(m);
    if (m || this.envoi()) return;
    this.envoi.set(true);
    m = await this.messages.envoyerContact({
      prenom: this.prenom().trim(), nom: this.nom().trim(), email: this.email().trim(),
      tel: this.tel().trim() || null, sujet: this.sujet(), reference: this.reference().trim().toUpperCase() || null,
      message: this.message().trim()
    });
    this.envoi.set(false);
    this.erreur.set(m);
    if (!m) {
      this.envoye.set(true);
      this.notifs.succes('Message envoyé. Nous vous répondons sous un jour ouvré.');
    }
  }
}
