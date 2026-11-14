import { describe, expect, it } from 'vitest';
import { calculerPrix, nombreDeJours, regrouperParModele } from '../src/tarifs.js';

describe('nombreDeJours()', () => {
  it('compte une tranche de 24 h commencée comme un jour', () => {
    expect(nombreDeJours('2026-12-07T10:00:00Z', '2026-12-09T12:00:00Z')).toBe(3);
    expect(nombreDeJours('2026-12-07T10:00:00Z', '2026-12-08T10:00:00Z')).toBe(1);
  });
  it('renvoie 0 si le retour n’est pas après le retrait', () => {
    expect(nombreDeJours('2026-12-08T10:00:00Z', '2026-12-08T10:00:00Z')).toBe(0);
  });
});

describe('calculerPrix() — montant enregistré par le serveur', () => {
  const base = { prixJour: 78, debut: '2026-12-07T10:00:00Z', fin: '2026-12-10T10:00:00Z' }; // 3 jours

  it('facture la location au prix du modèle', () => {
    expect(calculerPrix(base)).toMatchObject({ nj: 3, total: 234, lignes: [{ t: 'Location', m: 234 }] });
  });

  it('ajoute les options par jour', () => {
    const p = calculerPrix({ ...base, options: ['gps', 'bebe'] });
    expect(p.total).toBe(234 + 7 * 3 + 10 * 3);
  });

  it('ajoute les frais de retour une seule fois si l’agence de retour diffère', () => {
    const p = calculerPrix({ ...base, autreAgence: true });
    expect(p.lignes.at(-1)).toEqual({ t: 'Retour dans une autre agence', m: 60 });
    expect(p.total).toBe(294);
  });

  it('ignore une option « retour » demandée sans changement d’agence (le client ne fixe pas le prix)', () => {
    expect(calculerPrix({ ...base, options: ['retour'] }).total).toBe(234);
  });

  it('ne compte pas deux fois une option envoyée en double', () => {
    expect(calculerPrix({ ...base, options: ['gps', 'gps'] }).total).toBe(234 + 21);
  });
});

describe('regrouperParModele()', () => {
  const voiture = (id, base, statut, prix, boite = 'Manuelle') => ({
    id, nom: 'Kia Picanto', marque: 'Kia', modele: 'Picanto', annee: 2024, cat: 'citadine', places: 5, portes: 5,
    bag: 1, boite, carburant: 'Essence', clim: true, prix, depot: 850, base, immat: `${id}`, statut, eq: ['USB'], tags: ['mer'], desc: ''
  });

  it('regroupe par marque, modèle et boîte, au prix le plus bas', () => {
    const modeles = regrouperParModele(
      [voiture(1, 'Sousse', 'disponible', 82), voiture(2, 'Tunis', 'loue', 78), voiture(3, 'Tunis', 'disponible', 99, 'Automatique')],
      ['Tunis', 'Sousse'], ['citadine']);
    expect(modeles).toHaveLength(2);
    const manuelle = modeles.find(m => m.boite === 'Manuelle');
    expect(manuelle).toMatchObject({ prix: 78, stock: 2, libres: 1, ag: ['Sousse'], slug: 'kia-picanto' });
    expect(manuelle.eq[0]).toBe('Climatisation');
  });
});
