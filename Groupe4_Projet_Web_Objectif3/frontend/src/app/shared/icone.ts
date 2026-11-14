import { Component, input } from '@angular/core';

export type NomIcone =
  | 'adresse' | 'telephone' | 'horaires' | 'places' | 'bagages' | 'boite'
  | 'chevron-bas' | 'lien-externe' | 'valide' | 'fleche-gauche' | 'fleche-droite' | 'route' | 'saison'
  | 'gps' | 'bebe' | 'volant' | 'groupe' | 'calendrier' | 'avion' | 'forfait';

/**
 * Icônes au trait (SVG), dans le style de Lucide (lucide.dev, licence ISC).
 * Elles prennent la couleur du texte (currentColor) : <app-icone nom="adresse" />
 */
@Component({
  selector: 'app-icone',
  host: { class: 'icone', 'aria-hidden': 'true' },
  template: `
    <svg [attr.width]="taille()" [attr.height]="taille()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         [attr.stroke-width]="trait()" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (nom()) {
        @case ('adresse') {
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('telephone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        }
        @case ('horaires') {
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        }
        @case ('places') {
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        }
        @case ('bagages') {
          <path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" />
          <path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" /><path d="M10 20h4" />
          <circle cx="16" cy="20" r="2" /><circle cx="8" cy="20" r="2" />
        }
        @case ('boite') {
          <!-- grille de levier de vitesses -->
          <circle cx="6" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="18" cy="5" r="2" />
          <circle cx="6" cy="19" r="2" /><circle cx="12" cy="19" r="2" />
          <path d="M6 7v10M12 7v10M18 7v5H6" />
        }
        @case ('route') {
          <circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" />
        }
        @case ('saison') {
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        }
        @case ('gps') { <polygon points="3 11 22 2 13 21 11 13 3 11" /> }
        @case ('bebe') {
          <path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
          <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
        }
        @case ('volant') {
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" /><path d="M12 14v8" /><path d="M10 12H2.05" /><path d="M14 12h7.95" />
        }
        @case ('groupe') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('calendrier') { <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /> }
        @case ('avion') {
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        }
        @case ('forfait') {
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r="1" />
        }
        @case ('chevron-bas') { <path d="m6 9 6 6 6-6" /> }
        @case ('lien-externe') { <path d="M7 7h10v10" /><path d="M7 17 17 7" /> }
        @case ('valide') { <path d="M20 6 9 17l-5-5" /> }
        @case ('fleche-gauche') { <path d="m12 19-7-7 7-7" /><path d="M19 12H5" /> }
        @case ('fleche-droite') { <path d="M5 12h14" /><path d="m12 5 7 7-7 7" /> }
      }
    </svg>
  `
})
export class Icone {
  readonly nom = input.required<NomIcone>();
  readonly taille = input(18);
  readonly trait = input(2);
}
