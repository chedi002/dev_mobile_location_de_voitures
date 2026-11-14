import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { middlewaresAuth } from './auth.js';
import { ErreurHttp, gestionnaireErreurs } from './erreurs.js';
import { routesAdmin } from './routes/admin.js';
import { routesCatalogue } from './routes/catalogue.js';
import { routesMessages } from './routes/messages.js';
import { routesReservations } from './routes/reservations.js';

/**
 * Construit l'application Express. Les dépendances (base, vérification des jetons, e-mails)
 * sont passées en paramètre : les tests fournissent des versions simulées.
 */
export function creerApp({ db, verifierJeton, envoyerEmail = async () => {}, origineSite = ['http://localhost:4200'], emailAgence = '' }) {
  const app = express();
  const auth = middlewaresAuth({ verifierJeton, db });
  const deps = { db, auth, envoyerEmail, emailAgence };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: origineSite, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '50kb' }));

  // Limite les envois répétés (spam, réservations en rafale)
  const limiteEnvois = rateLimit({
    windowMs: 15 * 60e3, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { erreur: 'Trop de demandes. Réessayez dans quelques minutes.' }
  });

  app.get('/api/sante', (_req, res) => res.json({ statut: 'ok', service: 'wijha-api' }));

  app.use('/api', routesCatalogue(deps));

  // Compte : savoir si l'utilisateur connecté est administrateur
  app.get('/api/moi', auth.exigerConnexion, async (req, res) => {
    const lignes = await db.query('select 1 from public.admins where user_id = $1', [req.utilisateur.id]);
    res.json({ id: req.utilisateur.id, email: req.utilisateur.email, admin: lignes.length > 0 });
  });

  app.use('/api/reservations', (req, res, next) => (req.method === 'POST' ? limiteEnvois(req, res, next) : next()), routesReservations(deps));
  app.use('/api', routesMessages({ ...deps, limiteEnvois }));
  app.use('/api/admin', routesAdmin(deps));

  app.use('/api', (_req, _res, next) => next(new ErreurHttp(404, 'Route inconnue.')));
  app.use(gestionnaireErreurs);
  return app;
}
