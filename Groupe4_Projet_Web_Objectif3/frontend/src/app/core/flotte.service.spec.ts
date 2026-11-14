import { TestBed } from '@angular/core/testing';
import { FlotteService } from './flotte.service';
import { Occupation, Vehicule } from './modeles';
import { day, periode } from './outils';

/** Un modèle avec ses voitures physiques ; le reste des champs n'intervient pas dans dispo(). */
function modele(voitures: Vehicule['voitures']): Vehicule {
  return {
    id: 1, nom: 'Kia Picanto', marque: 'Kia', modele: 'Picanto', annee: 2024, slug: 'kia-picanto', cat: 'citadine',
    places: 5, portes: 5, bag: 1, bagTxt: '1 valise', boite: 'Manuelle', carburant: 'Essence', prix: 78, depot: 850,
    base: 'Sousse', immat: '247 TUN 1877', statut: 'disponible', ag: ['Sousse'], tags: [], eq: [], desc: '',
    stock: voitures.length, libres: voitures.filter(v => v.statut === 'disponible').length, voitures
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 16);
/** Du jour j (à 10 h) au jour j + n. */
const sejour = (j: number, n: number) => {
  const a = day(j); a.setHours(10);
  const b = day(j + n); b.setHours(10);
  return periode(iso(a), iso(b));
};
const resa = (j: number, n: number): Occupation => ({ debut: day(j), fin: day(j + n) });

describe('FlotteService.dispo() — disponibilité réelle', () => {
  let flotte: FlotteService;

  beforeEach(() => {
    // Pas d'appel réseau pendant les tests : la requête Supabase reste en attente.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    TestBed.configureTestingModule({});
    flotte = TestBed.inject(FlotteService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('ne se prononce pas tant que les dates ne sont pas choisies', () => {
    const v = modele([{ id: 10, base: 'Sousse', statut: 'disponible' }]);
    expect(flotte.dispo(v, periode('', ''), 'Sousse').e).toBe('na');
  });

  it('est disponible quand la voiture n’a aucune réservation', () => {
    const v = modele([{ id: 10, base: 'Sousse', statut: 'disponible' }]);
    expect(flotte.dispo(v, sejour(10, 3), 'Sousse').e).toBe('ok');
  });

  it('est indisponible si la seule voiture est déjà réservée sur ces dates, et dit quand elle se libère', () => {
    const v = modele([{ id: 10, base: 'Sousse', statut: 'disponible' }]);
    flotte.occupations.set(new Map([[10, [resa(9, 4)]]])); // du jour 9 au jour 13
    const d = flotte.dispo(v, sejour(10, 3), 'Sousse');
    expect(d.e).toBe('no');
    if (d.e === 'no') expect(d.libre).toEqual(day(13));
  });

  it('reste disponible si une réservation finit avant le retrait', () => {
    const v = modele([{ id: 10, base: 'Sousse', statut: 'disponible' }]);
    flotte.occupations.set(new Map([[10, [resa(2, 3)]]]));
    expect(flotte.dispo(v, sejour(10, 3), 'Sousse').e).toBe('ok');
  });

  it('est disponible tant qu’une autre voiture du même modèle est libre', () => {
    const v = modele([
      { id: 10, base: 'Sousse', statut: 'disponible' },
      { id: 11, base: 'Sousse', statut: 'disponible' }
    ]);
    flotte.occupations.set(new Map([[10, [resa(9, 4)]]]));
    expect(flotte.dispo(v, sejour(10, 3), 'Sousse').e).toBe('ok');
  });

  it('ne compte que les voitures de l’agence demandée', () => {
    const v = modele([{ id: 10, base: 'Djerba', statut: 'disponible' }]);
    expect(flotte.dispo(v, sejour(10, 3), 'Sousse').e).toBe('no');
    expect(flotte.dispo(v, sejour(10, 3), 'Djerba').e).toBe('ok');
  });

  it('ignore les voitures en location ou en entretien', () => {
    const v = modele([
      { id: 10, base: 'Sousse', statut: 'loue' },
      { id: 11, base: 'Sousse', statut: 'maintenance' }
    ]);
    expect(flotte.dispo(v, sejour(10, 3), 'Sousse').e).toBe('no');
  });
});
