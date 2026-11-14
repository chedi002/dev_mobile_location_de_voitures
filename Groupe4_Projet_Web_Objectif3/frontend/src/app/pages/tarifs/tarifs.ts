import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FlotteService } from '../../core/flotte.service';
import { OPTIONS, prixDT } from '../../core/outils';

/** Tarifs construits à partir de la flotte réelle (Supabase) : rien n'est saisi en dur. */
@Component({
  selector: 'app-tarifs',
  imports: [RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Tarifs</h1>
      <p>Les prix de départ par catégorie, construits à partir de la flotte réelle. Le prix exact d’un véhicule s’affiche dès que vos dates sont choisies.</p>
    </div></section>

    <section class="wrap section" aria-labelledby="t-cat">
      <h2 id="t-cat">Prix par catégorie</h2>
      <p>Tarifs <strong>à partir de</strong>, par jour, selon la saison et la disponibilité. Le kilométrage est illimité sur toute la flotte.</p>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Catégorie</th><th>Modèles</th><th>Places</th><th class="num">Dès</th><th class="num">4 jours</th><th class="num">Dépôt</th><th>Exemples</th></tr></thead>
          <tbody>
            @for (l of lignes(); track l.code) {
              <tr>
                <td><strong>{{ l.nom }}</strong></td><td class="num">{{ l.n }}</td><td class="num">{{ l.places }}</td>
                <td class="num prix">{{ prixDT(l.mini) }}</td><td class="num">{{ prixDT(l.mini * 4) }}</td><td class="num">{{ prixDT(l.depot) }}</td>
                <td>{{ l.exemples }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="chargement">Chargement des tarifs…</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (bornes(); as b) {
        <p class="note">Tarifs établis sur les {{ b.n }} modèles de la flotte, de {{ prixDT(b.min) }} à {{ prixDT(b.max) }} par jour.
          La colonne « 4 jours » applique le tarif le plus bas de la catégorie, à titre d’exemple. Le dépôt de garantie est une pré-autorisation, restituée après le retour du véhicule.</p>
      }
    </section>

    <section class="wrap section" aria-labelledby="t-opt">
      <h2 id="t-opt">Options</h2>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Option</th><th class="num">Tarif</th><th>Détail</th></tr></thead>
          <tbody>
            @for (o of options; track o.id) {
              <tr><td><strong>{{ o.nom }}</strong></td><td class="num prix">{{ o.prix }} DT{{ o.type === 'jour' ? ' / jour' : '' }}</td><td>{{ o.info }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="wrap section" aria-labelledby="t-regles">
      <h2 id="t-regles">Ce qui fait varier le prix</h2>
      <div class="cards">
        <article class="card-x"><h3>La durée</h3><p>Comptée par tranche de 24 heures commencée. Un retrait lundi 10 h et un retour mercredi 12 h font trois jours.</p></article>
        <article class="card-x"><h3>La saison</h3><p>Les tarifs affichés correspondent à la basse saison. De juin à septembre, une majoration peut s’appliquer selon la disponibilité.</p></article>
        <article class="card-x"><h3>Le retour ailleurs</h3><p>Restituer le véhicule dans une autre agence ajoute un forfait fixe de 60 DT, affiché dès la première étape de la réservation.</p></article>
        <article class="card-x"><h3>Les options</h3><p>GPS, siège bébé et chauffeur se facturent par jour et s’ajoutent au détail du prix avant confirmation.</p></article>
      </div>
      <p class="note">Aucun frais n’apparaît après la confirmation : le récapitulatif de l’étape 4 est le prix final, hors dépôt de garantie qui est une pré-autorisation restituée.</p>
      <p><a class="btn btn-green" routerLink="/voitures">Voir le catalogue</a> <a class="btn btn-ghost" routerLink="/promotions">Offres en cours</a></p>
    </section>
  `
})
export class Tarifs {
  readonly flotte = inject(FlotteService);
  readonly options = OPTIONS;
  readonly prixDT = prixDT;

  readonly lignes = computed(() => this.flotte.ordre().map(code => {
    const L = this.flotte.vehicules().filter(v => v.cat === code);
    if (!L.length) return null;
    const places = [...new Set(L.map(v => v.places))].sort((a, b) => a - b);
    const ex = L.slice().sort((a, b) => a.prix - b.prix).slice(0, 3).map(v => v.nom);
    return {
      code, nom: this.flotte.nomCat(code), n: L.length,
      mini: Math.min(...L.map(v => v.prix)), depot: Math.min(...L.map(v => v.depot)),
      places: places.length > 1 ? places[0] + ' à ' + places[places.length - 1] : String(places[0]),
      exemples: ex.join(', ') + (L.length > 3 ? '…' : '')
    };
  }).filter(l => l !== null));

  readonly bornes = computed(() => {
    const p = this.flotte.vehicules().map(v => v.prix);
    return p.length ? { n: p.length, min: Math.min(...p), max: Math.max(...p) } : null;
  });
}
