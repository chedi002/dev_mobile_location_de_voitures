import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { CarteAgences } from '../../shared/carte-agences';
import { PhotoDirective } from '../../shared/photo.directive';
import { Icone } from '../../shared/icone';

/** Photo de chaque ville (La Marsa : Sidi Bou Saïd, la ville voisine). */
const PHOTOS: Record<string, string> = {
  'Tunis': 'tunis', 'La Marsa': 'sidi-bou-said', 'Sousse': 'sousse',
  'Monastir': 'monastir', 'Mahdia': 'mahdia', 'Djerba': 'djerba'
};

@Component({
  selector: 'app-agences',
  imports: [RouterLink, CarteAgences, PhotoDirective, Icone],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Nos agences</h1>
      <p>Six points de retrait, de la capitale à l’île de Djerba. Choisissez une agence sur la carte pour préparer votre itinéraire.</p>
    </div></section>

    <section class="wrap section" aria-labelledby="t-ag">
      <h2 id="t-ag" class="sr">Liste des agences</h2>
      @if (flotte.pret()) {
        <div class="ag-grid">
          @for (a of flotte.agencesInfo(); track a.id; let i = $index) {
            <article class="ag-carte">
              <div class="ag-photo">
                <img appPhoto [src]="photoAgence(a.ville)" [alt]="'Vue de ' + a.ville" loading="lazy">
                <span class="ag-zone">{{ flotte.zone(a.ville) }}</span>
              </div>
              <div class="ag-corps">
                <h3>{{ a.nom }}</h3>
                <ul class="ag-infos">
                  <li><app-icone class="ag-ico" nom="adresse" /><span>{{ a.adresse }}</span></li>
                  <li><app-icone class="ag-ico" nom="telephone" /><a [href]="telLien(a.telephone)">{{ a.telephone }}</a></li>
                  <li><app-icone class="ag-ico" nom="horaires" />
                    <span>@for (h of horaires(a.horaires); track h) { {{ h }}<br> }</span></li>
                </ul>
                <div class="ag-actions">
                  <a class="btn btn-green" routerLink="/voitures" [queryParams]="{ depart: a.ville }">Voir les voitures</a>
                  <div class="ag-secondaires">
                    <button class="btn btn-ghost btn-sm" type="button" (click)="voir(i)">Sur la carte</button>
                    <a class="btn btn-ghost btn-sm" [href]="'https://www.google.com/maps/dir/?api=1&destination=' + a.latitude + ',' + a.longitude" target="_blank" rel="noopener">Itinéraire <app-icone nom="lien-externe" [taille]="15" /></a>
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
        <div #carte>
          <app-carte-agences id="mapAg" [agences]="flotte.agencesInfo()" [detaille]="true" [(actif)]="actif" />
        </div>
      } @else {
        <p class="chargement">Chargement des agences…</p>
      }
      <p class="note">Les horaires peuvent varier les jours fériés.</p>
    </section>

    <section class="wrap section" aria-labelledby="t-ret">
      <h2 id="t-ret">Retrait et restitution</h2>
      <div class="cards">
        <article class="card-x">
          <h3>Retour dans une autre agence</h3>
          <p>Possible entre les six agences, moyennant un forfait fixe de 60 DT. Pratique pour les circuits qui ne bouclent pas, comme le Grand Sud qui se termine à Djerba.</p>
        </article>
        <article class="card-x">
          <h3>Toute la flotte partout</h3>
          <p>Les véhicules circulent entre les agences : la flotte complète est proposée au retrait dans chacune d’elles, sous réserve de disponibilité aux dates demandées.</p>
        </article>
        <article class="card-x">
          <h3>Horaires</h3>
          <p>Les horaires de chaque agence sont indiqués sur sa fiche. Pour un retrait en dehors de ces horaires, signalez-le dans votre demande.</p>
        </article>
      </div>
    </section>
  `
})
export class Agences {
  readonly flotte = inject(FlotteService);
  readonly actif = signal<number | null>(null);
  private readonly carte = viewChild<ElementRef<HTMLElement>>('carte');

  photoAgence(ville: string) { return `images/destinations/${PHOTOS[ville] ?? 'tunis'}.jpg`; }
  /** « Lun-Sam 08h00-19h00 / Dim 09h00-13h00 » → une ligne par période. */
  horaires(h: string) { return (h || '').split('/').map(x => x.trim()).filter(Boolean); }

  telLien(t: string) { return 'tel:' + t.replace(/\s/g, ''); }

  voir(i: number) {
    this.actif.set(i);
    this.carte()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
