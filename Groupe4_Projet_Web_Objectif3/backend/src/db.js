import pg from 'pg';

/* Les colonnes numeric (prix, coordonnées) arrivent en texte par défaut : on les convertit en nombres. */
pg.types.setTypeParser(1700, v => (v === null ? null : Number(v)));

/**
 * Accès à PostgreSQL (base hébergée par Supabase).
 * Le serveur se connecte avec le rôle propriétaire : c'est donc lui, et non la base,
 * qui vérifie les droits de chaque requête (voir auth.js et les routes).
 */
export function creerBase(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquant : copiez .env.example en .env et renseignez la chaîne de connexion PostgreSQL.');
  }
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Supabase impose TLS
    max: 10
  });

  return {
    /** Requête simple : renvoie les lignes. */
    async query(sql, params = []) {
      const r = await pool.query(sql, params);
      return r.rows;
    },
    /** Exécute plusieurs requêtes dans une même transaction (tout ou rien). */
    async transaction(travail) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const resultat = await travail({ query: async (sql, params = []) => (await client.query(sql, params)).rows });
        await client.query('commit');
        return resultat;
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
    },
    fermer: () => pool.end()
  };
}
