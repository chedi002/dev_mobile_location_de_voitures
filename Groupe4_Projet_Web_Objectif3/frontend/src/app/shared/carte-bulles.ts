import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { Agence } from '../core/modeles';

/** Valeur à représenter pour une agence : la taille de la bulle en dépend. */
export interface Bulle { ville: string; valeur: number; detail: string; }
/** Nombre de locations qui partent d'une agence et reviennent dans une autre. */
export interface Flux { de: string; vers: string; n: number; }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Carte des agences en « bulles proportionnelles » : plus une agence a de valeur, plus sa bulle est grande.
 * Des lignes en pointillés relient les agences quand une voiture est rendue ailleurs.
 */
@Component({
  selector: 'app-carte-bulles',
  template: `<div #carte class="carte-leaflet" role="region" aria-label="Carte des agences, bulles proportionnelles à l’activité"></div>`,
  styles: `:host{display:block;position:relative;z-index:0;isolation:isolate} .carte-leaflet{width:100%;height:100%;min-height:inherit}`
})
export class CarteBulles implements OnDestroy {
  readonly agences = input.required<Agence[]>();
  readonly bulles = input.required<Bulle[]>();
  readonly flux = input<Flux[]>([]);

  private readonly hote = viewChild.required<ElementRef<HTMLDivElement>>('carte');
  private carte?: L.Map;
  private readonly calque = L.layerGroup();
  private readonly prete = signal(false);
  private cadree = false;

  constructor() {
    afterNextRender(() => {
      this.creer();
      this.prete.set(true);
    });
    effect(() => {
      if (!this.prete()) return;
      this.dessiner();
    });
  }

  private creer() {
    const carte = L.map(this.hote().nativeElement, { scrollWheelZoom: false });
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
    this.calque.addTo(carte);
    this.carte = carte;
  }

  private dessiner() {
    const carte = this.carte;
    const agences = this.agences();
    if (!carte || !agences.length) return;
    this.calque.clearLayers();

    const bulles = this.bulles();
    const flux = this.flux();
    const max = Math.max(1, ...bulles.map(b => b.valeur));
    const maxFlux = Math.max(1, ...flux.map(f => f.n));
    const place = (ville: string) => agences.find(a => a.ville === ville);

    // Lignes de retour dans une autre agence (sous les bulles)
    for (const f of flux) {
      const a = place(f.de), b = place(f.vers);
      if (!a || !b || a === b) continue;
      L.polyline([[a.latitude, a.longitude], [b.latitude, b.longitude]], {
        color: '#E8A33D', weight: 1.5 + 4 * (f.n / maxFlux), opacity: 0.85, dashArray: '7 7'
      }).bindTooltip(`${esc(f.de)} → ${esc(f.vers)} : ${f.n} retour${f.n > 1 ? 's' : ''} dans une autre agence`, { sticky: true })
        .addTo(this.calque);
    }

    for (const a of agences) {
      const b = bulles.find(x => x.ville === a.ville);
      const v = b?.valeur ?? 0;
      const rayon = v ? 12 + 34 * Math.sqrt(v / max) : 7;   // surface ∝ valeur
      L.circleMarker([a.latitude, a.longitude], {
        radius: rayon, color: '#0A2342', weight: 2, fillColor: '#0E7C9B', fillOpacity: 0.6
      })
        .bindTooltip(esc(a.ville), { permanent: true, direction: 'bottom', offset: [0, rayon], opacity: 0.92 })
        .bindPopup(`<strong>${esc(a.nom)}</strong><br>${esc(b?.detail ?? 'Aucune demande')}`)
        .addTo(this.calque);
      if (v) {
        L.marker([a.latitude, a.longitude], {
          interactive: false, keyboard: false,
          icon: L.divIcon({
            className: '', iconSize: [44, 20], iconAnchor: [22, 10],
            html: `<div style="width:44px;text-align:center;font:800 13px/20px sans-serif;color:#fff;text-shadow:0 1px 2px #0A2342">${esc(String(Math.round(v)))}</div>`
          })
        }).addTo(this.calque);
      }
    }

    if (!this.cadree) {
      carte.fitBounds(agences.map(a => [a.latitude, a.longitude] as L.LatLngTuple), { padding: [60, 60] });
      this.cadree = true;
    }
  }

  ngOnDestroy() {
    this.carte?.remove();
  }
}