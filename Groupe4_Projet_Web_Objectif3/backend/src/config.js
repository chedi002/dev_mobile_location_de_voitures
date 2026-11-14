/**
 * Configuration lue dans les variables d'environnement (fichier .env, jamais versionné).
 * Voir .env.example pour la liste complète.
 */
export const config = {
  port: Number(process.env.PORT) || 3000,
  /** Chaîne de connexion PostgreSQL (Supabase > Project Settings > Database > Connection string). */
  databaseUrl: process.env.DATABASE_URL ?? '',
  /** URL du projet Supabase : sert à vérifier les jetons de connexion (clé publique, sans secret). */
  supabaseUrl: (process.env.SUPABASE_URL ?? 'https://acmgjilyytsstgxjcetb.supabase.co').replace(/\/$/, ''),
  /** Adresse du site Angular autorisée à appeler l'API (CORS). */
  origineSite: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',').map(s => s.trim()),
  /** E-mails : facultatif. Sans SMTP_HOST, les e-mails sont affichés dans le terminal. */
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    expediteur: process.env.MAIL_FROM ?? 'WIJHA <no-reply@wijha.tn>'
  },
  /** Adresse de l'agence qui reçoit les nouvelles demandes. */
  emailAgence: process.env.AGENCY_EMAIL ?? ''
};
