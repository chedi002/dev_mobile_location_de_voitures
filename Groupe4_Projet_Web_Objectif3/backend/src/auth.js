import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ErreurHttp } from './erreurs.js';

/**
 * Vérification des jetons de connexion émis par Supabase Auth.
 * Le projet signe ses jetons en ES256 : la clé publique est lue sur
 * {SUPABASE_URL}/auth/v1/.well-known/jwks.json — aucun secret n'est nécessaire.
 */
export function creerVerificateur(supabaseUrl) {
  const cles = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return async function verifierJeton(jeton) {
    const { payload } = await jwtVerify(jeton, cles, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated'
    });
    return { id: payload.sub, email: payload.email ?? '' };
  };
}

const jetonDe = req => {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
};

/** Middlewares d'authentification, construits avec les dépendances de l'application. */
export function middlewaresAuth({ verifierJeton, db }) {
  /** Ajoute req.utilisateur si un jeton valide est présent, sans rien exiger. */
  async function lireUtilisateur(req, _res, next) {
    const jeton = jetonDe(req);
    if (jeton) {
      try { req.utilisateur = await verifierJeton(jeton); } catch { /* jeton expiré : visiteur anonyme */ }
    }
    next();
  }

  /** Exige un utilisateur connecté (401 sinon). */
  async function exigerConnexion(req, _res, next) {
    const jeton = jetonDe(req);
    if (!jeton) return next(new ErreurHttp(401, 'Connexion requise.'));
    try {
      req.utilisateur = await verifierJeton(jeton);
      next();
    } catch {
      next(new ErreurHttp(401, 'Session expirée : reconnectez-vous.'));
    }
  }

  /** Exige un administrateur (table admins). À placer après exigerConnexion. */
  async function exigerAdmin(req, _res, next) {
    try {
      const lignes = await db.query('select 1 from public.admins where user_id = $1', [req.utilisateur.id]);
      if (!lignes.length) return next(new ErreurHttp(403, 'Réservé aux administrateurs.'));
      next();
    } catch (e) {
      next(e);
    }
  }

  return { lireUtilisateur, exigerConnexion, exigerAdmin };
}
