import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FlotteService } from '../../core/flotte.service';
import { LignePrix } from '../../core/modeles';
import { ReservationsService } from '../../core/reservations.service';
import { StockageService } from '../../core/stockage.service';
import { Icone } from '../../shared/icone';
import {
  AGES, EMAIL, OPTIONS, categoriesConseillees, fmtD, fmtDH, loc, montantOption, normaliser, periode, pluriel, tarifOption
} from '../../core/outils';

type Etape = 1 | 2 | 3 | 4 | 5; // 5 = demande confirmée

@Component({
  selector: 'app-reservation',
  imports: [FormsModule, RouterLink, Icone],
  templateUrl: './reservation.html'
})
export class ReservationPage {
  readonly flotte = inject(FlotteService);
  private readonly stockage = inject(StockageService);
  private readonly auth = inject(AuthService);
  private readonly reservations = inject(ReservationsService);
  readonly ages = AGES;
  readonly tarifOption = tarifOption;
  readonly pluriel = pluriel;
  readonly fmtD = fmtD;
  readonly maintenant = loc(new Date());
  readonly etapes = ['Dates et agences', 'Véhicule', 'Options et coordonnées', 'Confirmation'];

  /* Paramètres d'URL, depuis le catalogue ou une fiche */
  readonly vehicule = input<string>();
  readonly depart = input<string>();
  readonly debut = input<string>();
  readonly fin = input<string>();
  readonly age = input<string>();
  readonly options = input<string>();

  /* Étape 1 */
  readonly rDepart = signal('');
  readonly rAutre = signal(false);
  readonly rRetour = signal('');
  readonly rDebut = signal('');
  readonly rFin = signal('');
  readonly rAge = signal('');
  readonly rRoute = signal('ville');
  readonly rTrav = signal(2);
  readonly rBag = signal(2);
  /* Étape 2 */
  readonly vid = signal(0);
  /* Étape 3 */
  readonly sel = signal<Set<string>>(new Set());
  readonly cPrenom = signal('');
  readonly cNom = signal('');
  readonly cEmail = signal('');
  readonly cTel = signal('');
  readonly cVol = signal('');
  /* Étape 4 */
  readonly cgu = signal(false);

  readonly etape = signal<Etape>(1);
  readonly erreur = signal('');
  readonly ref = signal('');
  readonly copie = signal('Copier');
  readonly immatriculation = signal('');
  /** Montant enregistré, calculé par le serveur. */
  readonly totalServeur = signal<number | null>(null);
  readonly envoi = signal(false);
  private readonly stepper = viewChild<ElementRef<HTMLElement>>('stepper');

  /* ---------- État dérivé ---------- */
  readonly retour = computed(() => (this.rAutre() ? this.rRetour() : this.rDepart()));
  readonly autreAgence = computed(() => !!this.retour() && this.retour() !== this.rDepart());
  readonly s = computed(() => periode(this.rDebut(), this.rFin()));
  readonly v = computed(() => this.flotte.parId(this.vid()));

  readonly prix = computed(() => {
    const s = this.s(), v = this.v(), L: LignePrix[] = [];
    if (s.ok && v) {
      L.push({ t: 'Location', m: v.prix * s.nj,
        e: `${pluriel(s.nj, 'jour')} × ${v.prix} DT. Toute tranche de 24 h commencée compte pour un jour (règle à confirmer).` });
      OPTIONS.forEach(o => {
        const actif = o.id === 'retour' ? this.autreAgence() : this.sel().has(o.id);
        if (!actif) return;
        L.push({ t: o.nom, m: montantOption(o, s.nj),
          e: o.type === 'jour' ? `${pluriel(s.nj, 'jour')} × ${o.prix} DT` : `Frais fixes de ${o.prix} DT` });
      });
    }
    return { L, total: L.reduce((t, l) => t + l.m, 0) };
  });

  readonly ticket = computed(() => {
    const s = this.s(), v = this.v();
    return [
      ['Agences', this.rDepart() ? this.rDepart() + (this.autreAgence() ? ' → ' + this.retour() : ' (retour identique)') : '—'],
      ['Dates', s.deb && s.fin ? fmtDH(s.deb) + ' → ' + fmtDH(s.fin) : '—'],
      ['Véhicule', v ? v.nom + ' ou similaire' : '—'],
      ['Voyageurs', `${this.rTrav()} · ${pluriel(+this.rBag(), 'valise')}`]
    ];
  });

  /* Étape 2 : recommandation et liste triée (catégories conseillées d'abord) */
  readonly reco = computed(() => {
    const trav = +this.rTrav(), bag = +this.rBag(), pistes = this.rRoute() === 'pistes';
    return {
      cats: categoriesConseillees(trav, bag, pistes),
      pourquoi: `${pluriel(trav, 'voyageur')}, ${pluriel(bag, 'valise')}${pistes ? ', pistes ou Sud' : ''}`
    };
  });
  readonly choix = computed(() => {
    const cats = this.reco().cats, s = this.s();
    return this.flotte.vehicules().filter(v => v.ag.includes(this.rDepart()))
      .sort((x, y) => (cats.includes(x.cat) ? 0 : 1) - (cats.includes(y.cat) ? 0 : 1) || x.prix - y.prix)
      .map(v => ({ v, d: this.flotte.dispo(v, s, this.rDepart()), reco: cats.includes(v.cat) }));
  });

  readonly optionsEtape3 = computed(() => OPTIONS.filter(o => o.id !== 'retour' || this.autreAgence()));

  /* ---------- Road-trip enregistré ---------- */
  readonly rt = this.stockage.roadtrip;
  readonly rtTexte = signal('');

  constructor() {
    // Préremplissage depuis l'URL, puis choix de l'étape de départ une fois la flotte chargée.
    let initialise = false;
    effect(() => {
      if (!this.flotte.pret() || initialise) return;
      initialise = true;
      untracked(() => this.initialiser());
    });
    const rt = this.rt();
    if (rt && (rt.from || rt.to)) {
      this.rtTexte.set(`Itinéraire enregistré : ${rt.from || '?'} → ${rt.to || '?'} · ${pluriel(rt.trav, 'voyageur')}, ${pluriel(rt.bag, 'valise')}.`);
    }
  }

  private initialiser() {
    if (this.depart()) this.rDepart.set(this.depart()!);
    if (this.debut()) this.rDebut.set(this.debut()!);
    if (this.fin()) this.rFin.set(this.fin()!);
    if (this.age()) this.rAge.set(this.age()!);
    if (this.options()) this.sel.set(new Set(this.options()!.split(',').filter(Boolean)));
    // Client connecté : coordonnées préremplies depuis son compte.
    const p = this.auth.profil();
    if (p) {
      this.cPrenom.set(p.prenom); this.cNom.set(p.nom); this.cTel.set(p.tel); this.cEmail.set(this.auth.email());
    }
    const id = Number(this.vehicule()) || 0;
    this.vid.set(id);
    // Directement à l'étape 3 si la fiche a déjà tout fourni et que le véhicule est disponible.
    const v = this.flotte.parId(id);
    const complet = v && !this.valider1() && this.flotte.dispo(v, this.s(), this.rDepart()).e === 'ok';
    this.etape.set(complet ? 3 : 1);
  }

  utiliserRoadtrip() {
    const rt = this.rt();
    if (!rt) return;
    const agenceDans = (t: string) => this.flotte.agences().find(a => normaliser(t || '').includes(normaliser(a)));
    this.rTrav.set(rt.trav); this.rBag.set(rt.bag); this.rRoute.set(rt.pistes ? 'pistes' : 'ville');
    const dep = agenceDans(rt.from), arr = agenceDans(rt.to), m: string[] = [];
    if (dep) this.rDepart.set(dep); else m.push(`Pas d’agence à ${rt.from || 'votre départ'} : choisissez une agence.`);
    if (arr && arr !== dep) {
      this.rAutre.set(true); this.rRetour.set(arr);
      m.push(`Retour proposé à ${arr} : les frais de retour dans une autre agence sont ajoutés.`);
    } else if (!arr && rt.to) m.push(`Pas d’agence à ${rt.to} : retour à l’agence de départ.`);
    this.rtTexte.set('Road-trip appliqué. ' + m.join(' '));
  }

  basculerOption(id: string, coche: boolean) {
    const s = new Set(this.sel());
    coche ? s.add(id) : s.delete(id);
    this.sel.set(s);
  }

  /* ---------- Validations ---------- */
  private valider1() {
    const s = this.s();
    if (!this.rDepart()) return 'Choisissez l’agence de départ.';
    if (this.rAutre() && !this.rRetour()) return 'Choisissez l’agence de retour.';
    if (!s.deb || !s.fin) return 'Choisissez les dates et heures de retrait et de retour.';
    if (s.fin <= s.deb) return 'La date de retour doit être après le retrait.';
    if (s.deb < new Date()) return 'Le retrait doit être dans le futur.';
    if (!this.rAge()) return 'Indiquez l’âge du conducteur.';
    return '';
  }
  private valider2() {
    const v = this.v();
    return !v || this.flotte.dispo(v, this.s(), this.rDepart()).e !== 'ok' ? 'Choisissez un véhicule disponible.' : '';
  }
  private valider3() {
    if (!this.cPrenom().trim() || !this.cNom().trim()) return 'Indiquez votre prénom et votre nom.';
    if (!EMAIL.test(this.cEmail().trim())) return 'Saisissez une adresse e-mail valide, par exemple nom@exemple.com.';
    if (this.cTel().replace(/\D/g, '').length < 8) return 'Saisissez un numéro de téléphone d’au moins 8 chiffres.';
    return '';
  }
  private valider4() {
    if (!this.cgu()) return 'Acceptez les conditions de location pour confirmer.';
    const v = this.v();
    if (!v || this.flotte.dispo(v, this.s(), this.rDepart()).e !== 'ok') return 'Ce véhicule n’est plus disponible pour ces dates. Revenez à l’étape 2.';
    return '';
  }

  /* ---------- Navigation ---------- */
  suivant() {
    const n = this.etape();
    const m = n === 1 ? this.valider1() : n === 2 ? this.valider2() : this.valider3();
    this.erreur.set(m);
    if (!m) this.aller((n + 1) as Etape);
  }
  aller(n: Etape) {
    this.erreur.set('');
    this.etape.set(n);
    const el = this.stepper()?.nativeElement;
    if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
  }
  revenirA(n: number) {
    if (n < this.etape() && this.etape() < 5) this.aller(n as Etape);
  }

  async confirmer() {
    const m = this.valider4();
    this.erreur.set(m);
    if (m || this.envoi()) return;
    const s = this.s(), v = this.v()!;
    this.envoi.set(true);
    const r = await this.reservations.creer({
      vehicule: v.id, depart: this.rDepart(), retour: this.retour(),
      debut: s.deb!, fin: s.fin!, options: [...this.sel()],
      age: this.rAge(), voyageurs: +this.rTrav(), bagages: +this.rBag(),
      client: {
        prenom: this.cPrenom().trim(), nom: this.cNom().trim(), email: this.cEmail().trim(),
        tel: this.cTel().trim(), vol: this.cVol().trim()
      }
    });
    this.envoi.set(false);
    if (r.erreur || !r.resultat) { this.erreur.set(r.erreur); return; }
    this.ref.set(r.resultat.ref);
    this.immatriculation.set(r.resultat.immatriculation);
    this.totalServeur.set(r.resultat.total);
    this.aller(5);
  }

  copier() {
    (navigator.clipboard ? navigator.clipboard.writeText(this.ref()) : Promise.reject())
      .then(() => this.copie.set('Copié')).catch(() => this.copie.set('Copie impossible'));
  }
  imprimer() { window.print(); }

  calendrier() {
    const s = this.s(), v = this.v()!, p = (n: number) => String(n).padStart(2, '0');
    const t = (d: Date) => d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WIJHA//Reservation//FR', 'BEGIN:VEVENT', 'UID:' + this.ref() + '@wijha',
      'DTSTAMP:' + t(new Date()), 'DTSTART:' + t(s.deb!), 'DTEND:' + t(s.fin!), 'SUMMARY:Location WIJHA – ' + v.nom,
      'LOCATION:Agence WIJHA ' + this.rDepart(), 'DESCRIPTION:Référence ' + this.ref(), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
    a.download = this.ref() + '.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* Récapitulatif de l'étape 4 */
  readonly recapitulatif = computed(() => {
    const s = this.s(), v = this.v();
    if (!v || !s.ok) return [];
    return [
      ['Agences', `${this.rDepart()} → ${this.retour()}`],
      ['Dates', `${fmtDH(s.deb!)} → ${fmtDH(s.fin!)} (${pluriel(s.nj, 'jour')})`],
      ['Véhicule', `${v.nom} (${this.flotte.nomCat(v.cat)}) ou similaire, ${v.boite.toLowerCase()}`],
      ['Conducteur', `${this.rAge()} · ${pluriel(+this.rTrav(), 'voyageur')}, ${pluriel(+this.rBag(), 'valise')}`],
      ['Coordonnées', `${this.cPrenom()} ${this.cNom()} · ${this.cEmail()} · ${this.cTel()}${this.cVol() ? ' · Vol ' + this.cVol() : ''}`],
      ['Conditions', `Dépôt de garantie : ${v.depot} DT. Annulation et modification : voir les conditions.`]
    ];
  });
}
