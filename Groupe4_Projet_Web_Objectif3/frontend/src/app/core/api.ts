import { supabase } from './auth.service';

/** Adresse de l'API Express (dossier backend du dépôt). */
export const API_URL = 'http://localhost:3000/api';

/** Erreur renvoyée par l'API, avec son code HTTP et un message prêt à afficher. */
export class ErreurApi extends Error {
  constructor(readonly statut: number, message: string) {
    super(message);
  }
}

interface OptionsAppel {
  methode?: 'GET' | 'POST' | 'PATCH';
  corps?: unknown;
  /** Joindre le jeton de connexion Supabase (Authorization: Bearer …). */
  connecte?: boolean;
}

/**
 * Appelle l'API WIJHA et renvoie la réponse JSON.
 * Lève une ErreurApi avec le message de l'API ({ erreur: "…" }) en cas d'échec.
 */
export async function api<T>(chemin: string, { methode = 'GET', corps, connecte = false }: OptionsAppel = {}): Promise<T> {
  const entetes: Record<string, string> = {};
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  if (connecte) {
    const { data } = await supabase.auth.getSession();
    if (data.session) entetes['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  let reponse: Response;
  try {
    reponse = await fetch(API_URL + chemin, { method: methode, headers: entetes, body: corps === undefined ? undefined : JSON.stringify(corps) });
  } catch {
    throw new ErreurApi(0, 'Le serveur WIJHA ne répond pas. Lancez l’API avec « npm start » dans le dossier backend.');
  }
  const json = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ErreurApi(reponse.status, json.erreur || `Erreur ${reponse.status}`);
  return json as T;
}

/** Message d'une erreur quelconque, prêt à afficher. */
export const messageDe = (e: unknown) => (e instanceof Error ? e.message : String(e));
