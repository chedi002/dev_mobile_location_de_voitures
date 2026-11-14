import { OPTIONS, categoriesConseillees, montantOption, periode, prixDT, slugifier, tarifOption } from './outils';

describe('periode() — durée de location', () => {
  it('compte une tranche de 24 h commencée comme un jour entier', () => {
    // lundi 10 h → mercredi 12 h : 50 h, donc 3 jours (exemple de la page Tarifs)
    const p = periode('2026-12-07T10:00', '2026-12-09T12:00');
    expect(p.ok).toBe(true);
    expect(p.nj).toBe(3);
  });

  it('compte exactement 24 h comme un seul jour', () => {
    expect(periode('2026-12-07T10:00', '2026-12-08T10:00').nj).toBe(1);
  });

  it('refuse un retour avant ou égal au retrait', () => {
    expect(periode('2026-12-08T10:00', '2026-12-07T10:00')).toMatchObject({ ok: false, nj: 0 });
    expect(periode('2026-12-08T10:00', '2026-12-08T10:00')).toMatchObject({ ok: false, nj: 0 });
  });

  it('n’est pas valide tant qu’une date manque', () => {
    expect(periode('', '2026-12-08T10:00')).toMatchObject({ ok: false, nj: 0, deb: null });
    expect(periode('2026-12-08T10:00', '')).toMatchObject({ ok: false, nj: 0, fin: null });
  });
});

describe('categoriesConseillees() — recommandation de l’étape 2', () => {
  it('conseille un SUV pour les pistes, quel que soit le nombre de voyageurs', () => {
    expect(categoriesConseillees(1, 0, true)).toEqual(['suv']);
  });

  it('adapte la catégorie au nombre de voyageurs', () => {
    expect(categoriesConseillees(1, 1, false)).toEqual(['citadine']);
    expect(categoriesConseillees(3, 2, false)).toEqual(['berline', 'compacte']);
    expect(categoriesConseillees(5, 2, false)).toEqual(['suv']);
    expect(categoriesConseillees(7, 4, false)).toEqual(['7places']);
    expect(categoriesConseillees(9, 6, false)).toEqual(['minibus']);
  });

  it('passe au SUV pour 4 voyageurs avec beaucoup de bagages', () => {
    expect(categoriesConseillees(4, 2, false)).toEqual(['berline', 'compacte']);
    expect(categoriesConseillees(4, 4, false)).toEqual(['suv']);
  });
});

describe('options et montants', () => {
  const gps = OPTIONS.find(o => o.id === 'gps')!;
  const retour = OPTIONS.find(o => o.id === 'retour')!;

  it('facture une option « par jour » autant de fois qu’il y a de jours', () => {
    expect(montantOption(gps, 3)).toBe(gps.prix * 3);
  });

  it('facture une option « fixe » une seule fois', () => {
    expect(montantOption(retour, 5)).toBe(retour.prix);
  });

  it('affiche le tarif avec l’unité', () => {
    expect(tarifOption(gps)).toBe(`${gps.prix} DT/jour`);
    expect(tarifOption(retour)).toBe(`${retour.prix} DT`);
  });

  it('formate les montants en dinars, arrondis', () => {
    expect(prixDT(78)).toBe('78 DT');
    expect(prixDT(1234.6).replace(/\s/g, ' ')).toBe('1 235 DT');
  });
});

describe('slugifier()', () => {
  it('produit le nom de fichier des photos', () => {
    expect(slugifier('Citroën C-Elysée')).toBe('citroen-c-elysee');
    expect(slugifier('Mercedes-Benz Classe C')).toBe('mercedes-benz-classe-c');
  });
});
