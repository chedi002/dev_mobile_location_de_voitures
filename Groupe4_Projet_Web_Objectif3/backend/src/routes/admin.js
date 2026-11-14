import { Router } from 'express';
import { nonTrouve, requeteInvalide } from '../erreurs.js';
import { schemaStatut, schemaTraite, schemaVoiture } from '../validation.js';
import { SELECT_RESERVATION, formaterReservation } from './reservations.js';

const LIBELLES = { en_attente: 'remise en attente', confirmee: 'confirmée', annulee: 'refusée', terminee: 'terminée' };

/**
 * Administration de l'agence (comptes de la table admins uniquement).
 *   GET   /api/admin/reservations           toutes les réservations
 *   PATCH /api/admin/reservations/:ref      changer le statut
 *   PATCH /api/admin/vehicules/:id          prix, dépôt, statut, agence d'une voiture
 *   GET   /api/admin/messages               messages de contact et demandes de transfert
 *   PATCH /api/admin/messages/:type/:id     marquer traité / à traiter
 */
export function routesAdmin({ db, auth, envoyerEmail }) {
  const r = Router();
  r.use(auth.exigerConnexion, auth.exigerAdmin);

  r.get('/reservations', async (_req, res) => {
    const lignes = await db.query(`${SELECT_RESERVATION} order by r.created_at desc`);
    res.json(lignes.map(formaterReservation));
  });

  r.patch('/reservations/:ref', async (req, res) => {
    const { statut } = schemaStatut.parse(req.body);
    const [ligne] = await db.query(
      `update public.reservations set statut = $2 where ref = $1
       returning ref, statut, client_prenom, client_email`, [req.params.ref, statut]);
    if (!ligne) throw nonTrouve('Réservation introuvable.');
    if (statut === 'confirmee' || statut === 'annulee') {
      await envoyerEmail({
        a: ligne.client_email, sujet: `WIJHA – réservation ${ligne.ref} ${LIBELLES[statut]}`,
        texte: `Bonjour ${ligne.client_prenom},\n\nVotre réservation ${ligne.ref} a été ${LIBELLES[statut]} par l’agence.\n\nL’équipe WIJHA`
      });
    }
    res.json({ ref: ligne.ref, statut: ligne.statut });
  });

  r.patch('/vehicules/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw requeteInvalide('Identifiant de véhicule invalide.');
    const v = schemaVoiture.parse(req.body);
    let agenceId = null;
    if (v.agence) {
      const [a] = await db.query('select id from public.agences where ville = $1', [v.agence]);
      if (!a) throw requeteInvalide('Agence inconnue.');
      agenceId = a.id;
    }
    const [ligne] = await db.query(
      `update public.vehicules set
          prix_jour_tnd      = coalesce($2, prix_jour_tnd),
          depot_garantie_tnd = coalesce($3, depot_garantie_tnd),
          statut             = coalesce($4, statut),
          agence_id          = coalesce($5, agence_id)
        where id = $1 returning id`,
      [id, v.prix != null ? Math.round(v.prix) : null, v.depot != null ? Math.round(v.depot) : null, v.statut ?? null, agenceId]);
    if (!ligne) throw nonTrouve('Véhicule introuvable.');
    res.json({ id });
  });

  r.get('/messages', async (_req, res) => {
    const [contacts, transferts] = await Promise.all([
      db.query('select * from public.messages_contact order by created_at desc'),
      db.query('select * from public.demandes_transfert order by created_at desc')
    ]);
    const num = l => ({ ...l, id: Number(l.id) });
    res.json({ contacts: contacts.map(num), transferts: transferts.map(num) });
  });

  r.patch('/messages/:type/:id', async (req, res) => {
    const tables = { contact: 'messages_contact', transfert: 'demandes_transfert' };
    const table = tables[req.params.type];
    if (!table) throw requeteInvalide('Type de message inconnu.');
    const { traite } = schemaTraite.parse(req.body);
    const [ligne] = await db.query(`update public.${table} set traite = $2 where id = $1 returning id`, [Number(req.params.id), traite]);
    if (!ligne) throw nonTrouve('Message introuvable.');
    res.json({ id: Number(ligne.id), traite });
  });

  return r;
}
