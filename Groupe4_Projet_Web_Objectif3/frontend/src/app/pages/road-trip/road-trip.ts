import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { StockageService } from '../../core/stockage.service';
import { OPTIONS, montantOption, nombre, prixDT } from '../../core/outils';
import { PhotoDirective } from '../../shared/photo.directive';
import { Icone } from '../../shared/icone';
import { CIRCUITS, CONSO, Circuit } from './circuits';

const WA = '21600000000'; // numéro WhatsApp de l'agence (sans + ni espaces)

const km = (c: Circuit) => c.etapes.reduce((s, e) => s + e.km, 0);
const jours = (c: Circuit) => c.etapes.length;
const duree = (c: Circuit) => (jours(c) <= 3 ? 'court' : jours(c) <= 5 ? 'moyen' : 'long');

@Component({
  selector: 'app-road-trip',
  imports: [FormsModule, PhotoDirective, Icone],
  templateUrl: './road-trip.html'
})
export class RoadTrip {
  readonly flotte = inject(FlotteService);
  private readonly stockage = inject(StockageService);
  private readonly router = inject(Router);
  readonly prixDT = prixDT;
  readonly nombre = nombre;
  readonly km = km;
  readonly jours = jours;

  readonly fDuree = signal('');
  readonly fType = signal('');
  readonly courant = signal<Circuit | null>(null);
  readonly bVoiture = signal('citadine');
  readonly bTrav = signal(2);
  readonly bPrix = signal(2.525);
  private readonly detail = viewChild<ElementRef<HTMLElement>>('detail');

  /** Voitures par catégorie : prix = le moins cher de la catégorie dans la flotte. */
  readonly voitures = computed(() => {
    const out: Record<string, { nom: string; prix: number; conso: number }> = {};
    Object.keys(CONSO).forEach(k => {
      const prix = this.flotte.vehicules().filter(v => v.cat === k).map(v => v.prix);
      if (prix.length) out[k] = { nom: this.flotte.nomCat(k), prix: Math.min(...prix), conso: CONSO[k] };
    });
    return out;
  });
  readonly listeVoitures = computed(() => Object.entries(this.voitures()));

  readonly circuits = computed(() =>
    CIRCUITS.filter(c => (!this.fDuree() || duree(c) === this.fDuree()) && (!this.fType() || c.types.includes(this.fType()))));

  prixMini(c: Circuit) {
    const v = this.voitures()[c.voiture];
    return v ? v.prix * jours(c) : 0;
  }

  choisir(c: Circuit) {
    this.courant.set(c);
    this.bVoiture.set(c.voiture);
    setTimeout(() => this.detail()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  readonly budget = computed(() => {
    const c = this.courant(), v = this.voitures()[this.bVoiture()];
    if (!c || !v) return null;
    const trav = Math.max(1, +this.bTrav() || 1), prixL = +this.bPrix() || 2.525;
    const nJ = jours(c), nKm = km(c);
    const loc = v.prix * nJ, carb = (nKm * v.conso / 100) * prixL, pea = c.peages;
    const opt = OPTIONS.find(o => o.id === 'retour')!;
    const fraisRetour = c.from !== c.to ? montantOption(opt, nJ) : 0;
    const total = loc + carb + pea + fraisRetour;
    const lignes = [
      { t: 'Location', m: loc, e: `${v.nom} ou similaire, dès ${v.prix} DT × ${nJ} jours (le tarif exact dépend du modèle choisi).` },
      { t: 'Carburant', m: carb, e: `${nombre(nKm)} km × ${v.conso} L/100 km × ${prixL} DT/litre.` },
      ...(fraisRetour ? [{ t: 'Retour dans une autre agence', m: fraisRetour, e: `Départ à ${c.from}, retour à ${c.to}.` }] : []),
      { t: 'Péages', m: pea, e: 'Estimation sur autoroute (A1). À ajuster selon votre trajet.' }
    ];
    const msg = `Bonjour, je souhaite un road-trip sur mesure inspiré du circuit « ${c.nom} » (${nJ} jours, ${trav} voyageur${trav > 1 ? 's' : ''}).`;
    return { lignes, total, parPersonne: trav > 1 ? total / trav : 0, wa: `https://wa.me/${WA}?text=${encodeURIComponent(msg)}` };
  });

  reserver() {
    const c = this.courant();
    if (!c) return;
    const trav = +this.bTrav() || 2;
    this.stockage.enregistrerRoadtrip({
      from: c.from, to: c.to, trav, bag: trav,           // 1 valise par voyageur par défaut
      pistes: c.id === 'grand-sud' || c.id === 'djerba-sud-est',
      circuit: c.id, nom: c.nom, jours: jours(c), km: km(c), voiture: this.bVoiture()
    });
    this.router.navigate(['/reservation']);
  }
}
