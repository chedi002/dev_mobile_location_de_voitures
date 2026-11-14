import { creerApp } from './app.js';
import { creerVerificateur } from './auth.js';
import { config } from './config.js';
import { creerBase } from './db.js';
import { creerEmail } from './email.js';

/** Point d'entrée : branche les vraies dépendances et démarre le serveur. */
let db;
try {
  db = creerBase(config.databaseUrl);
  await db.query('select 1');
} catch (e) {
  console.error(`\n[API] Connexion à la base impossible : ${e.message}\n`);
  process.exit(1);
}

const app = creerApp({
  db,
  verifierJeton: creerVerificateur(config.supabaseUrl),
  envoyerEmail: creerEmail(config.smtp),
  origineSite: config.origineSite,
  emailAgence: config.emailAgence
});

const serveur = app.listen(config.port, () => {
  console.log(`[API] WIJHA écoute sur http://localhost:${config.port}/api`);
  if (!config.smtp.host) console.log('[API] Pas de SMTP configuré : les e-mails sont affichés ici (e-mails simulés).');
});

const arreter = () => serveur.close(() => db.fermer().then(() => process.exit(0)));
process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);
