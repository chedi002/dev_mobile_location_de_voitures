import { Component, ElementRef, HostListener, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { AGES, prixDT, photo } from '../../core/outils';
import { CarteAgences } from '../../shared/carte-agences';
import { PhotoDirective } from '../../shared/photo.directive';
import { Icone } from '../../shared/icone';

const CONSEIL: Record<string, string> = {
  suv: 'SUV', minibus: 'Minibus', '7places': 'Véhicule 7 places', citadine: 'Citadine'
};

@Component({
  selector: 'app-accueil',
  imports: [FormsModule, RouterLink, CarteAgences, PhotoDirective, Icone],
  templateUrl: './accueil.html'
})
export class Accueil {
  readonly flotte = inject(FlotteService);
  private readonly router = inject(Router);
  readonly ages = AGES;
  readonly prixDT = prixDT;
  readonly photo = photo;

  /* ---------- Recherche rapide ---------- */
  readonly depart = signal('');
  readonly debut = signal('');
  readonly fin = signal('');
  readonly age = signal('');
  readonly autreRetour = signal(false);
  readonly retour = signal('');
  readonly erreurRecherche = signal('');

  rechercher() {
    let m = '';
    if (!this.depart() || !this.debut() || !this.fin() || !this.age()) m = 'Remplissez tous les champs obligatoires.';
    else if (new Date(this.fin()) <= new Date(this.debut())) m = 'La date de retour doit être après le retrait.';
    else if (this.autreRetour() && !this.retour()) m = 'Choisissez l’agence de retour.';
    this.erreurRecherche.set(m);
    if (m) return;
    this.router.navigate(['/voitures'], {
      queryParams: { depart: this.depart(), debut: this.debut(), fin: this.fin(), age: this.age(), retour: this.autreRetour() ? this.retour() : null }
    });
  }

  /* ---------- Catégories ---------- */
  /** Une catégorie = une voiture de la flotte en photo et le prix de départ lu dans la base. */
  private readonly categories = [
    { cat: 'citadine', nom: 'Citadine', sous: 'Ville, 1 à 2 personnes', photo: 'kia-picanto' },
    { cat: 'compacte', nom: 'Compacte', sous: 'Ville et route', photo: 'peugeot-208' },
    { cat: 'berline', nom: 'Berline', sous: 'Confort et grand coffre', photo: 'skoda-octavia' },
    { cat: 'suv', nom: 'SUV', sous: 'Routes variées et pistes', photo: 'hyundai-tucson' },
    { cat: '7places', nom: '7 places', sous: 'Familles', photo: 'dacia-jogger' },
    { cat: 'minibus', nom: 'Minibus', sous: 'Groupes jusqu’à 9', photo: 'toyota-hiace' },
    { cat: 'premium', nom: 'Premium', sous: 'Affaires et prestige', photo: 'mercedes-benz-classe-c' },
    { cat: 'automatique', nom: 'Automatique', sous: 'Toutes catégories', photo: 'renault-clio-5' }
  ];
  readonly tuiles = computed(() => {
    const vs = this.flotte.vehicules();
    return this.categories.map(c => {
      const L = c.cat === 'automatique' ? vs.filter(v => v.boite === 'Automatique') : vs.filter(v => v.cat === c.cat);
      return { ...c, image: photo({ slug: c.photo }), prix: L.length ? Math.min(...L.map(v => v.prix)) : null };
    });
  });

  /* ---------- Véhicules populaires (trois modèles choisis) ---------- */
  private readonly choix = [
    { nom: 'Kia Picanto', boite: 'Manuelle', badge: ['b-eco', 'Économique'] },
    { nom: 'Renault Clio 5', boite: 'Automatique', badge: ['b-auto', 'Automatique'] },
    { nom: 'Dacia Duster', boite: 'Manuelle', badge: ['b-fam', 'Idéal Sud et pistes'] }
  ];
  readonly populaires = computed(() =>
    this.choix.map((c, i) => ({ ...c, cls: 'v' + (i + 1), v: this.flotte.vehicules().find(x => x.nom === c.nom && x.boite === c.boite) }))
      .filter(x => x.v));

  /* ---------- Planificateur ---------- */
  readonly rtDepart = signal('');
  readonly rtDestination = signal('');
  readonly rtTrav = signal(2);
  readonly rtBag = signal(2);
  readonly rtRoute = signal('ville');
  readonly conseil = signal('');
  private readonly champDest = viewChild<ElementRef<HTMLInputElement>>('champDest');
  private readonly bandeRoadtrip = viewChild<ElementRef<HTMLElement>>('bandeRoadtrip');

  conseiller() {
    const v = +this.rtTrav(), b = +this.rtBag();
    if (!(v >= 1)) { this.conseil.set('Indiquez au moins un voyageur.'); return; }
    const c = this.rtRoute() === 'pistes' ? 'SUV adapté aux pistes'
      : v >= 8 ? CONSEIL['minibus'] : v >= 6 ? CONSEIL['7places']
      : v >= 5 || (v === 4 && b >= 4) ? CONSEIL['suv'] : v >= 3 ? 'Berline ou compacte' : CONSEIL['citadine'];
    this.conseil.set(`Catégorie conseillée : ${c}. Recommandation indicative, selon la flotte disponible.`);
  }

  ajouterDestination(nom: string) {
    this.rtDestination.set(nom);
    this.bandeRoadtrip()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    this.champDest()?.nativeElement.focus({ preventScroll: true });
  }

  /* ---------- Carrousel des destinations ---------- */
  readonly destinations = [
    ['tunis', 'Tunis'], ['sidi-bou-said', 'Sidi Bou Saïd'], ['hammamet', 'Hammamet'], ['sousse', 'Sousse'],
    ['monastir', 'Monastir'], ['mahdia', 'Mahdia'], ['kairouan', 'Kairouan'], ['djerba', 'Djerba'],
    ['tozeur', 'Tozeur'], ['douz', 'Douz'], ['tabarka', 'Tabarka'], ['tataouine', 'Tataouine']
  ].map(([fichier, nom], i) => ({ fichier, nom, cls: 'd' + (i + 1) }));
  readonly indexDest = signal(0);
  readonly decalage = signal(0);
  private readonly visibles = signal(4);
  readonly maxDest = computed(() => Math.max(0, this.destinations.length - this.visibles()));
  private readonly liste = viewChild<ElementRef<HTMLUListElement>>('liste');

  constructor() {
    afterNextRender(() => this.majCarrousel());
  }

  @HostListener('window:resize')
  majCarrousel() {
    const w = window.innerWidth;
    this.visibles.set(w <= 550 ? 1 : w <= 900 ? 2 : 4);
    this.indexDest.update(i => Math.max(0, Math.min(i, this.maxDest())));
    const ul = this.liste()?.nativeElement;
    const carte = ul?.querySelector('li');
    if (!ul || !carte) return;
    const gap = parseFloat(getComputedStyle(ul).gap) || 0;
    this.decalage.set(this.indexDest() * (carte.getBoundingClientRect().width + gap));
  }
  deplacer(pas: number) {
    this.indexDest.update(i => i + pas);
    this.majCarrousel();
  }

  /* ---------- Agences ---------- */
  readonly agenceActive = signal<number | null>(null);
}
