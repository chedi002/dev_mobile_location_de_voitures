/**
 * Règles de prix de WIJHA, appliquées par le serveur.
 * Le site affiche une estimation ; le montant enregistré est toujours celui calculé ici.
 */

/** Options (DT) : prix par jour, sauf « fixe ». Identiques à celles affichées par le site. */
export const OPTIONS = {
  gps: { nom: 'GPS', prix: 7, type: 'jour' },
  bebe: { nom: 'Siège bébé', prix: 10, type: 'jour' },
  chauffeur: { nom: 'Chauffeur', prix: 130, type: 'jour' },
  retour: { nom: 'Retour dans une autre agence', prix: 60, type: 'fixe' }
};

const JOUR_MS = 864e5;

/** Nombre de jours facturés : toute tranche de 24 h commencée compte pour un jour. */
export function nombreDeJours(debut, fin) {
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  return ms > 0 ? Math.ceil(ms / JOUR_MS) : 0;
}

/**
 * Détail et total d'une location.
 * @param prixJour   prix par jour du modèle (DT)
 * @param options    identifiants choisis parmi gps, bebe, chauffeur
 * @param autreAgence vrai si le retour se fait dans une autre agence (frais fixes ajoutés)
 */
export function calculerPrix({ prixJour, debut, fin, options = [], autreAgence = false }) {
  const nj = nombreDeJours(debut, fin);
  const lignes = [{ t: 'Location', m: prixJour * nj }];
  const choisies = [...new Set(options)].filter(id => id !== 'retour' && OPTIONS[id]);
  if (autreAgence) choisies.push('retour');
  for (const id of choisies) {
    const o = OPTIONS[id];
    lignes.push({ t: o.nom, m: o.type === 'jour' ? o.prix * nj : o.prix });
  }
  return { nj, lignes, total: lignes.reduce((s, l) => s + l.m, 0), options: choisies };
}

/* ---------- Catalogue : regroupement des voitures par modèle ---------- */

const slugifier = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Ligne de la table vehicules → voiture telle que la consomme le site. */
export function versVoiture(r, codeCat, ville) {
  return {
    id: Number(r.id), nom: `${r.marque} ${r.modele}`, marque: r.marque, modele: r.modele, annee: r.annee,
    cat: codeCat[r.categorie_id], places: r.places, portes: r.portes, bag: r.bagages_valises,
    boite: r.transmission, carburant: r.carburant, clim: r.climatisation,
    prix: Number(r.prix_jour_tnd), depot: Number(r.depot_garantie_tnd), base: ville[r.agence_id],
    immat: r.immatriculation, statut: r.statut, eq: r.equipements ?? [], tags: r.tags_voyage ?? [],
    desc: r.description ?? ''
  };
}

/**
 * Un modèle (marque + modèle + boîte) par carte du catalogue. Prix = le moins cher du modèle ;
 * « ag » = agences où au moins une voiture est disponible.
 */
export function regrouperParModele(flotte, villes, ordreCategories) {
  const groupes = new Map();
  for (const f of flotte) {
    const k = `${f.marque}|${f.modele}|${f.boite}`;
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(f);
  }
  const uniq = a => [...new Set(a)];
  return [...groupes.values()].map(L => {
    const libres = L.filter(f => f.statut === 'disponible');
    const parAgence = {};
    L.forEach(f => (parAgence[f.base] = (parAgence[f.base] || 0) + 1));
    const base = Object.entries(parAgence).sort((a, b) => b[1] - a[1])[0][0];
    const ref = libres[0] || L[0];
    const bag = Math.max(...L.map(f => f.bag));
    const eq = uniq(L.flatMap(f => f.eq));
    if (L.some(f => f.clim)) eq.unshift('Climatisation');
    return {
      id: Math.min(...L.map(f => f.id)), nom: ref.nom, marque: ref.marque, modele: ref.modele,
      annee: Math.max(...L.map(f => f.annee)), slug: slugifier(ref.nom), cat: ref.cat,
      places: Math.max(...L.map(f => f.places)), portes: ref.portes, bag,
      bagTxt: bag + ' valise' + (bag > 1 ? 's' : ''), boite: ref.boite,
      carburant: uniq(L.map(f => f.carburant)).join(' ou '),
      prix: Math.min(...L.map(f => f.prix)), depot: Math.min(...L.map(f => f.depot)),
      base, immat: ref.immat, statut: libres.length ? 'disponible' : ref.statut,
      ag: villes.filter(a => (libres.length ? libres : L).some(f => f.base === a)),
      tags: uniq(L.flatMap(f => f.tags)), eq, desc: ref.desc,
      stock: L.length, libres: libres.length,
      voitures: L.map(f => ({ id: f.id, base: f.base, statut: f.statut }))
    };
  }).sort((a, b) => ordreCategories.indexOf(a.cat) - ordreCategories.indexOf(b.cat) || a.prix - b.prix);
}
