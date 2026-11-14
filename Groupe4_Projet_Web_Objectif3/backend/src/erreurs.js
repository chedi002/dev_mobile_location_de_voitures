import { ZodError } from 'zod';

/** Erreur prévue, renvoyée telle quelle au client avec son code HTTP. */
export class ErreurHttp extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

export const nonTrouve = (m = 'Introuvable.') => new ErreurHttp(404, m);
export const interdit = (m = 'Action non autorisée.') => new ErreurHttp(403, m);
export const conflit = m => new ErreurHttp(409, m);
export const requeteInvalide = m => new ErreurHttp(400, m);

/** Dernier middleware : transforme toute erreur en réponse JSON { erreur: "…" }. */
export function gestionnaireErreurs(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ erreur: err.issues[0]?.message ?? 'Données invalides.' });
  }
  if (err instanceof ErreurHttp) {
    return res.status(err.statut).json({ erreur: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'Corps de requête illisible (JSON attendu).' });
  }
  // Contraintes de la base
  if (err?.code === '23P01') {
    return res.status(409).json({ erreur: 'Cette voiture vient d’être réservée sur une partie de ces dates.' });
  }
  if (err?.code === '23514') {
    return res.status(400).json({ erreur: 'Certaines informations ne respectent pas le format attendu.' });
  }
  console.error('[API] erreur inattendue :', err);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
}
