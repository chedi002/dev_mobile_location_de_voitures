import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { Vehicule } from '../../core/modeles';
import { AGES, OPTIONS, badges, fmtD, loc, montantOption, periode, photo, pluriel, tarifOption } from '../../core/outils';
import { PhotoDirective } from '../../shared/photo.directive';
import { Icone } from '../../shared/icone';

const VUES = ['Extérieur avant', 'Extérieur arrière', 'Intérieur', 'Coffre'];

@Component({
  selector: 'app-voiture-detail',
  imports: [FormsModule, RouterLink, PhotoDirective, Icone],
  templateUrl: './voiture-detail.html'
})
export class VoitureDetail {
  readonly flotte = inject(FlotteService);
  private readonly titre = inject(Title);
  readonly ages = AGES;
  readonly options = OPTIONS;
  readonly vues = VUES;
  readonly badges = badges;
  readonly photo = photo;
  readonly fmtD = fmtD;
  readonly tarifOption = tarifOption;
  readonly maintenant = loc(new Date());

  /* Paramètres d'URL : /voitures/:id?depart=…&debut=…&fin=…&age=…&options=… */
  readonly id = input<string>();
  readonly depart = input<string>();
  readonly debut = input<string>();
  readonly fin = input<string>();
  readonly age = input<string>();
  readonly options_ = input<string>(undefined, { alias: 'options' });

  readonly v = computed(() => this.flotte.parId(Number(this.id())));
  readonly nomCat = computed(() => (this.v() ? this.flotte.nomCat(this.v()!.cat) : ''));

  /* Formulaire de réservation */
  readonly dAgence = linkedSignal(() => {
    const v = this.v(), d = this.depart();
    return v ? (d && v.ag.includes(d) ? d : v.ag[0] ?? '') : '';
  });
  readonly dDebut = linkedSignal(() => this.debut() ?? '');
  readonly dFin = linkedSignal(() => this.fin() ?? '');
  readonly dAge = linkedSignal(() => this.age() ?? '');
  readonly choisies = linkedSignal(() => new Set((this.options_() ?? '').split(',').filter(Boolean)));
  /** Vue affichée dans la galerie (1 à 4), remise à 1 quand on change de véhicule. */
  readonly vue = linkedSignal({ source: this.v, computation: () => 1 });

  readonly s = computed(() => periode(this.dDebut(), this.dFin()));
  readonly d = computed(() => (this.v() ? this.flotte.dispo(this.v()!, this.s(), this.dAgence()) : { e: 'na' as const }));

  /** Voitures de ce modèle à l'agence choisie, et leurs prochains créneaux déjà réservés. */
  readonly parc = computed(() => {
    const v = this.v(), occ = this.flotte.occupations();
    if (!v) return { total: 0, enService: 0, creneaux: [] as { debut: Date; fin: Date }[] };
    const ici = v.voitures.filter(c => c.base === this.dAgence());
    const enService = ici.filter(c => c.statut === 'disponible');
    const creneaux = enService.flatMap(c => occ.get(c.id) ?? [])
      .sort((a, b) => a.debut.getTime() - b.debut.getTime()).slice(0, 5);
    return { total: ici.length, enService: enService.length, creneaux };
  });

  readonly texteDispo = computed(() => {
    const d = this.d(), s = this.s();
    return d.e === 'ok' ? 'Disponible pour vos dates'
      : d.e === 'no' ? 'Indisponible · libre dès le ' + fmtD(d.libre)
      : s.deb && s.fin ? 'Le retour doit être après le retrait' : 'Choisissez vos dates';
  });

  readonly recap = computed(() => {
    const v = this.v(), s = this.s();
    if (!v || !s.ok) return null;
    const lignes: [string, number][] = [[`Location ${pluriel(s.nj, 'jour')} × ${v.prix} DT`, v.prix * s.nj]];
    OPTIONS.filter(o => this.choisies().has(o.id)).forEach(o =>
      lignes.push([o.nom + (o.type === 'jour' ? ` (${s.nj} j × ${o.prix} DT)` : ''), montantOption(o, s.nj)]));
    return { lignes, total: lignes.reduce((t, l) => t + l[1], 0) };
  });

  readonly paramsResa = computed(() => {
    const s = this.s(), ids = [...this.choisies()];
    return {
      vehicule: this.v()?.id, depart: this.dAgence() || null,
      debut: s.ok ? this.dDebut() : null, fin: s.ok ? this.dFin() : null,
      age: this.dAge() || null, options: ids.length ? ids.join(',') : null
    };
  });

  readonly paramsListe = computed(() => ({ depart: this.depart() ?? null, debut: this.debut() ?? null, fin: this.fin() ?? null, age: this.age() ?? null }));

  readonly similaires = computed(() => {
    const v = this.v();
    if (!v) return [];
    return this.flotte.vehicules().filter(x => x.id !== v.id)
      .sort((a, b) => (a.cat === v.cat ? 0 : 1) - (b.cat === v.cat ? 0 : 1) || Math.abs(a.prix - v.prix) - Math.abs(b.prix - v.prix))
      .slice(0, 3);
  });

  constructor() {
    effect(() => { const v = this.v(); if (v) this.titre.setTitle(`${v.nom} – WIJHA`); });
  }

  description(v: Vehicule) {
    return `${v.nom} (${this.nomCat().toLowerCase()}), ${v.places} places, boîte ${v.boite.toLowerCase()}, ${v.carburant.toLowerCase()}. `
      + `Capacité de bagages : ${v.bagTxt}. ${v.stock > 1 ? `${v.stock} exemplaires dans la flotte.` : ''}`;
  }

  basculerOption(id: string, coche: boolean) {
    const c = new Set(this.choisies());
    coche ? c.add(id) : c.delete(id);
    this.choisies.set(c);
  }

  decaler() {
    const d = this.d(), s = this.s();
    if (d.e !== 'no') return;
    const nd = new Date(d.libre);
    nd.setHours(s.deb!.getHours(), s.deb!.getMinutes());
    this.dDebut.set(loc(nd));
    this.dFin.set(loc(new Date(nd.getTime() + (s.fin!.getTime() - s.deb!.getTime()))));
  }
}
