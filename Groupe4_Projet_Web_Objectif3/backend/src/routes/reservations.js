import { Router } from 'express';
import { conflit, nonTrouve, requeteInvalide } from '../erreurs.js';
import { calculerPrix } from '../tarifs.js';
import { schemaReservation } from '../validation.js';

/** Colonnes renvoyées pour une réservation (même forme côté client et administration). */
export const SELECT_RESERVATION = `
  select r.ref, r.statut, r.vehicule_id, r.debut, r.fin, r.total_tnd, r.lignes, r.options,
         r.client_prenom, r.client_nom, r.client_email, r.client_tel, r.vol, r.created_at,
         json_build_object('marque', v.marque, 'modele', v.modele, 'immatriculation', v.immatriculation) as vehicule,
         json_build_object('ville', ad.ville) as depart,
         json_build_object('ville', ar.ville) as retour
    from public.reservations r
    join public.vehicules v on v.id = r.vehicule_id
    join public.agences ad on ad.id = r.agence_depart_id
    join public.agences ar on ar.id = r.agence_retour_id`;

export const formaterReservation = r => ({ ...r, vehicule_id: Number(r.vehicule_id), total_tnd: Number(r.total_tnd) });

const nouvelleRef = () => 'WJH-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-'
  + Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');

const dateFR = d => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tunis' });

/**
 * Réservations du client connecté.
 *   POST /api/reservations              créer (voiture attribuée et prix calculés par le serveur)
 *   GET  /api/reservations/moi          mes réservations
 *   POST /api/reservations/:ref/annuler annuler avant le départ
 */
export function routesReservations({ db, auth, envoyerEmail, emailAgence }) {
  const r = Router();
  r.use(auth.exigerConnexion);

  r.post('/', async (req, res) => {
    const d = schemaReservation.parse(req.body);
    const retour = d.retour || d.depart;

    const resultat = await db.transaction(async t => {
      // Modèle demandé (marque + modèle + boîte), à partir d'une de ses voitures
      const [ref] = await t.query('select marque, modele, transmission from public.vehicules where id = $1', [d.vehicule]);
      if (!ref) throw nonTrouve('Véhicule introuvable.');

      const agences = await t.query('select id, ville from public.agences where ville = any($1)', [[d.depart, retour]]);
      const idDe = v => agences.find(a => a.ville === v)?.id;
      if (!idDe(d.depart) || !idDe(retour)) throw requeteInvalide('Agence inconnue.');

      // Prix du modèle = le moins cher de ses voitures (celui affiché dans le catalogue)
      const [{ prix }] = await t.query(
        `select min(prix_jour_tnd) as prix from public.vehicules
          where marque = $1 and modele = $2 and transmission = $3`, [ref.marque, ref.modele, ref.transmission]);

      // Première voiture libre du modèle à l'agence de départ ; verrouillée jusqu'à la fin de la transaction
      const [voiture] = await t.query(
        `select v.id, v.immatriculation from public.vehicules v
          where v.marque = $1 and v.modele = $2 and v.transmission = $3
            and v.agence_id = $4 and v.statut = 'disponible'
            and not exists (select 1 from public.reservations x
                             where x.vehicule_id = v.id and x.statut in ('en_attente', 'confirmee')
                               and tstzrange(x.debut, x.fin) && tstzrange($5::timestamptz, $6::timestamptz))
          order by v.prix_jour_tnd, v.id
          limit 1
          for update of v skip locked`,
        [ref.marque, ref.modele, ref.transmission, idDe(d.depart), d.debut, d.fin]);
      if (!voiture) throw conflit('Aucune voiture de ce modèle n’est libre à ces dates dans cette agence.');

      const prixCalcule = calculerPrix({
        prixJour: Number(prix), debut: d.debut, fin: d.fin, options: d.options, autreAgence: retour !== d.depart
      });

      // Référence unique (nouvel essai en cas de collision, très improbable)
      for (let essai = 1; ; essai++) {
        const refResa = nouvelleRef();
        try {
          await t.query('savepoint ref');
          await t.query(
            `insert into public.reservations (ref, user_id, vehicule_id, agence_depart_id, agence_retour_id, debut, fin,
                     options, lignes, total_tnd, conducteur_age, voyageurs, bagages,
                     client_prenom, client_nom, client_email, client_tel, vol)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
            [refResa, req.utilisateur.id, voiture.id, idDe(d.depart), idDe(retour), d.debut, d.fin,
              prixCalcule.options, JSON.stringify(prixCalcule.lignes), prixCalcule.total, d.age, d.voyageurs, d.bagages,
              d.client.prenom, d.client.nom, d.client.email, d.client.tel, d.client.vol]);
          return { ref: refResa, immatriculation: voiture.immatriculation, vehicule: `${ref.marque} ${ref.modele}`, ...prixCalcule };
        } catch (e) {
          if (e.code === '23505' && essai < 5) { await t.query('rollback to savepoint ref'); continue; }
          throw e;
        }
      }
    });

    const recap = `Référence : ${resultat.ref}\nVéhicule : ${resultat.vehicule} (${resultat.immatriculation})\n`
      + `Agences : ${d.depart} → ${retour}\nDates : ${dateFR(d.debut)} → ${dateFR(d.fin)} (${resultat.nj} jour${resultat.nj > 1 ? 's' : ''})\n`
      + resultat.lignes.map(l => `  ${l.t} : ${l.m} DT`).join('\n') + `\nTotal : ${resultat.total} DT`;
    await envoyerEmail({
      a: d.client.email, sujet: `WIJHA – demande de réservation ${resultat.ref}`,
      texte: `Bonjour ${d.client.prenom},\n\nNous avons bien reçu votre demande. L’agence la confirme sous peu.\n\n${recap}\n\nL’équipe WIJHA`
    });
    await envoyerEmail({ a: emailAgence, sujet: `Nouvelle réservation ${resultat.ref}`, texte: `${d.client.prenom} ${d.client.nom} (${d.client.email}, ${d.client.tel})\n\n${recap}` });

    res.status(201).json({ ref: resultat.ref, immatriculation: resultat.immatriculation, total: resultat.total, lignes: resultat.lignes, nj: resultat.nj });
  });

  r.get('/moi', async (req, res) => {
    const lignes = await db.query(`${SELECT_RESERVATION} where r.user_id = $1 order by r.created_at desc`, [req.utilisateur.id]);
    res.json(lignes.map(formaterReservation));
  });

  r.post('/:ref/annuler', async (req, res) => {
    const lignes = await db.query(
      `update public.reservations set statut = 'annulee'
        where ref = $1 and user_id = $2 and statut in ('en_attente', 'confirmee') and debut > now()
        returning ref`, [req.params.ref, req.utilisateur.id]);
    if (!lignes.length) throw conflit('Cette réservation ne peut plus être annulée en ligne (location commencée ou déjà annulée).');
    res.json({ ref: lignes[0].ref, statut: 'annulee' });
  });

  return r;
}
