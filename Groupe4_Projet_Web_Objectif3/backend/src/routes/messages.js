import { Router } from 'express';
import { schemaContact, schemaTransfert } from '../validation.js';

/**
 * Formulaires publics (visiteur connecté ou non).
 *   POST /api/contact     message du formulaire de contact
 *   POST /api/transferts  demande de transfert aéroport
 */
export function routesMessages({ db, auth, envoyerEmail, emailAgence, limiteEnvois = (_q, _s, n) => n() }) {
  const r = Router();
  const avant = [limiteEnvois, auth.lireUtilisateur];

  r.post('/contact', ...avant, async (req, res) => {
    const m = schemaContact.parse(req.body);
    const [ligne] = await db.query(
      `insert into public.messages_contact (user_id, prenom, nom, email, tel, sujet, reference, message)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [req.utilisateur?.id ?? null, m.prenom, m.nom, m.email, m.tel, m.sujet, m.reference, m.message]);
    await envoyerEmail({
      a: emailAgence, sujet: `[Contact] ${m.sujet} – ${m.prenom} ${m.nom}`,
      texte: `${m.prenom} ${m.nom} <${m.email}>${m.tel ? ' · ' + m.tel : ''}${m.reference ? '\nRéservation : ' + m.reference : ''}\n\n${m.message}`
    });
    res.status(201).json({ id: Number(ligne.id) });
  });

  r.post('/transferts', ...avant, async (req, res) => {
    const d = schemaTransfert.parse(req.body);
    const [ligne] = await db.query(
      `insert into public.demandes_transfert (user_id, sens, aeroport, lieu, quand, vol, passagers, bagages, besoins, nom, email)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [req.utilisateur?.id ?? null, d.sens, d.aeroport, d.lieu, d.quand, d.vol, d.passagers, d.bagages, d.besoins, d.nom, d.email]);
    const trajet = d.sens === 'arrivee' ? `${d.aeroport} → ${d.lieu}` : `${d.lieu} → ${d.aeroport}`;
    await envoyerEmail({
      a: emailAgence, sujet: `[Transfert] ${trajet}`,
      texte: `${d.nom} <${d.email}>\n${trajet}\nLe ${new Date(d.quand).toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' })}`
        + `${d.vol ? ' · vol ' + d.vol : ''}\n${d.passagers} passager(s), ${d.bagages} bagage(s)${d.besoins ? '\n\n' + d.besoins : ''}`
    });
    res.status(201).json({ id: Number(ligne.id) });
  });

  return r;
}
