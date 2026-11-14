import { Component, ElementRef, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { Dispo, Vehicule } from '../../core/modeles';
import { AGES, badges, fmtD, loc, periode, photo, pluriel } from '../../core/outils';
import { PhotoDirective } from '../../shared/photo.directive';
import { Icone } from '../../shared/icone';

const PRIX_MAX = 500;

@Component({
  selector: 'app-voitures',
  imports: [FormsModule, RouterLink, PhotoDirective, Icone],
  templateUrl: './voitures.html'
})
export class Voitures {
  readonly flotte = inject(FlotteService);
  readonly ages = AGES;
  readonly prixMaxBorne = PRIX_MAX;
  readonly badges = badges;
  readonly photo = photo;
  readonly fmtD = fmtD;
  readonly pluriel = pluriel;

  /* Paramètres d'URL (depuis l'accueil, une agence, une tuile de catégorie) */
  readonly depart = input<string>();
  readonly debut = input<string>();
  readonly fin = input<string>();
  readonly age = input<string>();
  readonly cat = input<string>();

  /* Filtres */
  readonly fDepart = linkedSignal(() => this.depart() ?? '');
  readonly fDebut = linkedSignal(() => this.debut() ?? '');
  readonly fFin = linkedSignal(() => this.fin() ?? '');
  readonly fAge = linkedSignal(() => this.age() ?? '');
  readonly fCat = linkedSignal(() => (this.cat() && this.cat() !== 'automatique' ? this.cat()! : ''));
  readonly fBoite = linkedSignal(() => (this.cat() === 'automatique' ? 'Automatique' : ''));
  readonly fPlaces = signal('0');
  readonly fPrix = signal(PRIX_MAX);
  readonly fTri = signal('prix');
  readonly voyage = signal('');
  readonly mode = signal<'auto' | 'jour' | 'total'>('auto');

  readonly voyages = [
    ['mer', 'Week-end à la mer'], ['sud', 'Sud et pistes'], ['famille', 'En famille'], ['affaires', 'Affaires']
  ];

  readonly s = computed(() => periode(this.fDebut(), this.fFin()));
  readonly modeEffectif = computed(() => (this.mode() === 'auto' ? (this.s().ok ? 'total' : 'jour') : this.mode()));

  readonly liste = computed(() => {
    const s = this.s(), voy = this.voyage(), cat = this.fCat(), boite = this.fBoite();
    const places = +this.fPlaces(), prix = +this.fPrix(), dep = this.fDepart(), tri = this.fTri();
    const ordre = this.flotte.ordre();
    return this.flotte.vehicules()
      .filter(v => (!voy || v.tags.includes(voy)) && (!cat || v.cat === cat) && (!boite || v.boite === boite)
        && v.places >= places && (prix >= PRIX_MAX || v.prix <= prix) && (!dep || v.ag.includes(dep)))
      .sort((a, b) => tri === 'prixd' ? b.prix - a.prix
        : tri === 'cat' ? ordre.indexOf(a.cat) - ordre.indexOf(b.cat) || a.prix - b.prix : a.prix - b.prix)
      .map(v => ({ v, d: this.flotte.dispo(v, s, dep) }));
  });

  readonly infos = computed(() => {
    const s = this.s(), info: { cls: string; txt: string }[] = [];
    info.push({ cls: 'base', txt: s.ok ? 'Durée comptée par tranche de 24 h commencée (règle à confirmer dans vos conditions).'
      : 'Choisissez vos dates de retrait et de retour pour voir la disponibilité et le prix total.' });
    if (this.fAge() === '21–24 ans') info.push({ cls: '', txt: 'Conducteur de 21 à 24 ans : des frais ou conditions peuvent s’appliquer.' });
    if (this.fDepart()) info.push({ cls: 'base', txt: 'Seuls les véhicules disponibles à l’agence de ' + this.fDepart() + ' sont affichés.' });
    return info;
  });

  readonly pistes = computed(() => {
    const p = [['reset', 'Retirer tous les filtres'], ['prix', 'Élargir le budget']];
    if (this.fDepart()) p.push(['agence', 'Toutes les agences']);
    if (this.s().ok) p.push(['jour', 'Décaler mes dates d’un jour']);
    return p;
  });

  /** Paramètres transmis à la fiche et à la réservation. */
  params(v: Vehicule, resa = false) {
    const s = this.s();
    return {
      ...(resa ? { vehicule: v.id } : {}),
      depart: this.fDepart() || null,
      debut: s.ok ? this.fDebut() : null,
      fin: s.ok ? this.fFin() : null,
      age: this.fAge() || null
    };
  }

  basculerVoyage(k: string) {
    this.voyage.update(v => (v === k ? '' : k));
  }

  reinit() {
    this.voyage.set('');
    this.fCat.set(''); this.fBoite.set(''); this.fDepart.set('');
    this.fPlaces.set('0'); this.fPrix.set(PRIX_MAX);
  }

  piste(k: string) {
    if (k === 'reset') this.reinit();
    if (k === 'prix') this.fPrix.update(p => Math.min(PRIX_MAX, +p + 50));
    if (k === 'agence') this.fDepart.set('');
    if (k === 'jour') this.decaler(1);
  }

  private decaler(jours: number) {
    const s = this.s();
    if (!s.ok) return;
    this.fDebut.set(loc(new Date(s.deb!.getTime() + jours * 864e5)));
    this.fFin.set(loc(new Date(s.fin!.getTime() + jours * 864e5)));
  }

  /** Décale la période au premier jour libre, en gardant la durée et l'heure. */
  decalerAuLibre(d: Dispo) {
    if (d.e !== 'no') return;
    const s = this.s(), nd = new Date(d.libre);
    nd.setHours(s.deb!.getHours(), s.deb!.getMinutes());
    this.fDebut.set(loc(nd));
    this.fFin.set(loc(new Date(nd.getTime() + (s.fin!.getTime() - s.deb!.getTime()))));
  }

  /* ---------- Comparateur (3 véhicules au plus) ---------- */
  readonly comp = signal<Set<number>>(new Set());
  readonly aComparer = computed(() => this.flotte.vehicules().filter(v => this.comp().has(v.id)));
  private readonly dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  basculerComp(id: number, coche: boolean, ev: Event) {
    const c = new Set(this.comp());
    if (coche) {
      if (c.size >= 3) { (ev.target as HTMLInputElement).checked = false; return; }
      c.add(id);
    } else c.delete(id);
    this.comp.set(c);
  }
  viderComp() { this.comp.set(new Set()); }
  libre(d: Dispo) { return d.e === 'no' ? fmtD(d.libre) : ''; }
  ouvrirComparateur() { this.dlg()?.nativeElement.showModal(); }
  fermerComparateur() { this.dlg()?.nativeElement.close(); }
  texteDispo(v: Vehicule) {
    const d = this.flotte.dispo(v, this.s(), this.fDepart());
    return d.e === 'ok' ? 'Disponible' : d.e === 'no' ? 'Libre dès le ' + fmtD(d.libre) : 'Selon vos dates';
  }

  /* ---------- Filtres sur mobile ---------- */
  readonly filtresOuverts = signal(false);
}
