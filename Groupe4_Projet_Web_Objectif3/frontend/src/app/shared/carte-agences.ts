import { Component, ElementRef, OnDestroy, afterNextRender, effect, inject, input, model, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { Agence } from '../core/modeles';

/**
 * Carte Leaflet des agences. `actif` (index de l'agence sélectionnée) est lié dans
 * les deux sens : cliquer un repère le met à jour, le changer recentre la carte.
 */
@Component({
  selector: 'app-carte-agences',
  template: `<div #carte class="carte-leaflet" role="region" aria-label="Carte des agences WIJHA en Tunisie">
    <p class="map-fallback" style="padding:1rem;color:var(--muted)">La carte nécessite une connexion internet.</p>
  </div>`,
  // isolation : les z-index internes de Leaflet (400 à 1000) restent confinés à la carte
  // et ne passent plus au-dessus de l'en-tête collant (z-index 50).
  styles: `:host{display:block;position:relative;z-index:0;isolation:isolate} .carte-leaflet{width:100%;height:100%;min-height:inherit}`
})
export class CarteAgences implements OnDestroy {
  readonly agences = input.required<Agence[]>();
  readonly actif = model<number | null>(null);
  /** Contenu du popup : nom seul, ou adresse et horaires. */
  readonly detaille = input(false);
  readonly zone = input<(ville: string) => string>(() => '');

  private readonly hote = viewChild.required<ElementRef<HTMLDivElement>>('carte');
  private carte?: L.Map;
  private reperes: L.Marker[] = [];

  constructor() {
    afterNextRender(() => this.creer());
    effect(() => {
      const i = this.actif();
      if (i == null || !this.carte) return;
      const a = this.agences()[i];
      this.carte.flyTo([a.latitude, a.longitude], 12, { duration: 0.8 });
      this.reperes[i]?.openPopup();
      this.reperes.forEach((m, k) => m.getElement()?.classList.toggle('on', k === i));
    });
  }

  private creer() {
    const el = this.hote().nativeElement;
    el.innerHTML = '';
    const carte = L.map(el, { scrollWheelZoom: false });
    // Fond de carte Esri (sans clé) ; repli sur OpenStreetMap si une tuile échoue.
    const fond = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors'
    }).addTo(carte);
    let repli = false;
    fond.on('tileerror', () => {
      if (repli) return;
      repli = true;
      carte.removeLayer(fond);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(carte);
    });

    const icone = L.divIcon({
      className: 'pin-wrap', html: '<span class="pin-marker"></span>',
      iconSize: [30, 40], iconAnchor: [15, 38], popupAnchor: [0, -34]
    });
    const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    this.reperes = this.agences().map((a, i) =>
      L.marker([a.latitude, a.longitude], { icon: icone, title: 'Agence ' + a.ville })
        .addTo(carte)
        .bindPopup(this.detaille()
          ? `<strong>${esc(a.nom)}</strong><br>${esc(a.adresse)}<br>${esc(a.horaires)}`
          : `<strong>${esc(a.nom)}</strong><br>${esc(this.zone()(a.ville))}`)
        .on('click', () => this.actif.set(i)));
    carte.fitBounds(this.agences().map(a => [a.latitude, a.longitude] as L.LatLngTuple), { padding: [40, 40] });
    this.carte = carte;
  }

  ngOnDestroy() {
    this.carte?.remove();
  }
}
