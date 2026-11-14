import { Router } from 'express';
import { regrouperParModele, versVoiture } from '../tarifs.js';

/**
 * Données publiques : catalogue de la flotte et créneaux déjà réservés.
 *   GET /api/catalogue    catégories, agences, voitures et modèles regroupés
 *   GET /api/occupations  créneaux pris (sans dire par qui)
 */
export function routesCatalogue({ db }) {
  const r = Router();

  r.get('/catalogue', async (_req, res) => {
    const [categories, agences, vehicules] = await Promise.all([
      db.query('select id, code, nom from public.categories order by id'),
      db.query('select id, nom, ville, adresse, telephone, horaires, latitude, longitude from public.agences order by id'),
      db.query(`select id, marque, modele, annee, categorie_id, places, portes, bagages_valises, transmission,
                       carburant, climatisation, prix_jour_tnd, depot_garantie_tnd, agence_id, immatriculation,
                       statut, equipements, tags_voyage, description
                from public.vehicules order by id`)
    ]);
    const codeCat = Object.fromEntries(categories.map(c => [c.id, c.code]));
    const ville = Object.fromEntries(agences.map(a => [a.id, a.ville]));
    const ordre = categories.map(c => c.code);
    const flotte = vehicules.map(v => versVoiture(v, codeCat, ville));
    res.json({
      categories: categories.map(c => ({ code: c.code, nom: c.nom })),
      agences,
      flotte,
      // Les voitures « inactif » (archivées) restent visibles dans l'administration, pas au catalogue.
      modeles: regrouperParModele(flotte.filter(v => v.statut !== 'inactif'), agences.map(a => a.ville), ordre)
    });
  });

  r.get('/occupations', async (_req, res) => {
    const lignes = await db.query(
      `select vehicule_id, debut, fin from public.reservations
        where statut in ('en_attente', 'confirmee') and fin > now()`);
    res.json(lignes.map(l => ({ vehicule_id: Number(l.vehicule_id), debut: l.debut, fin: l.fin })));
  });

  return r;
}
