import { Injectable, computed, signal } from '@angular/core';
import { AuthError, Session, createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './outils';

/** Client Supabase unique de l'application (session conservée et renouvelée automatiquement). */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/** Données saisies à l'inscription, rangées dans les métadonnées du compte. */
export interface Profil {
  prenom: string;
  nom: string;
  tel: string;
}

/* « Rester connecté » décoché : la session est fermée à la prochaine ouverture du navigateur. */
const CLE_COURTE = 'wijha_session_courte';
const CLE_ACTIVE = 'wijha_session_active';

/** Messages de Supabase Auth traduits pour l'utilisateur. */
export function messageErreur(e: AuthError | Error | null): string {
  if (!e) return '';
  const m = e.message || '';
  if (/invalid login credentials/i.test(m)) return 'Adresse e-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return 'Confirmez d’abord votre adresse e-mail : cliquez sur le lien reçu par e-mail.';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  if (/password should|weak password|at least/i.test(m)) return 'Mot de passe trop faible : 8 caractères au minimum, en mélangeant lettres et chiffres.';
  if (/same password|different from the old/i.test(m)) return 'Choisissez un mot de passe différent de l’ancien.';
  if (/invalid email|unable to validate email/i.test(m)) return 'Adresse e-mail invalide.';
  if (/failed to fetch|network/i.test(m)) return 'Connexion au serveur impossible. Vérifiez votre connexion internet.';
  return 'Une erreur est survenue : ' + m;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  /** Vrai une fois la session initiale relue (évite d'afficher « Se connecter » une fraction de seconde). */
  readonly pret = signal(false);
  /** Le compte connecté est-il administrateur (table admins) ? */
  readonly estAdmin = signal(false);
  /** Vrai une fois le rôle vérifié pour la session courante. */
  readonly roleVerifie = signal(false);
  /** Vrai quand l'utilisateur arrive par le lien « mot de passe oublié ». */
  readonly recuperation = signal(false);

  readonly utilisateur = computed(() => this.session()?.user ?? null);
  readonly connecte = computed(() => !!this.utilisateur());
  readonly profil = computed<Profil | null>(() => {
    const u = this.utilisateur();
    if (!u) return null;
    const m = u.user_metadata ?? {};
    return { prenom: m['prenom'] ?? '', nom: m['nom'] ?? '', tel: m['tel'] ?? '' };
  });
  readonly email = computed(() => this.utilisateur()?.email ?? '');
  readonly nomAffiche = computed(() => this.profil()?.prenom || this.email().split('@')[0] || '');

  constructor() {
    supabase.auth.onAuthStateChange((evenement, session) => {
      if (evenement === 'PASSWORD_RECOVERY') this.recuperation.set(true);
      const avant = this.session()?.user.id;
      this.session.set(session);
      if (session?.user.id !== avant) this.verifierRole();
    });
    this.initialiser();
  }

  private async initialiser() {
    try {
      if (localStorage.getItem(CLE_COURTE) && !sessionStorage.getItem(CLE_ACTIVE)) {
        await supabase.auth.signOut({ scope: 'local' });
        localStorage.removeItem(CLE_COURTE);
      }
    } catch { /* stockage indisponible */ }
    const { data } = await supabase.auth.getSession();
    this.session.set(data.session);
    await this.verifierRole();
    this.pret.set(true);
  }

  /** Demande à l'API (GET /api/moi) si le compte est administrateur. Sans session ou sans API : non. */
  private async verifierRole() {
    this.roleVerifie.set(false);
    if (!this.session()) {
      this.estAdmin.set(false);
    } else {
      try {
        const { api } = await import('./api');
        const moi = await api<{ admin: boolean }>('/moi', { connecte: true });
        this.estAdmin.set(moi.admin === true);
      } catch {
        this.estAdmin.set(false);
      }
    }
    this.roleVerifie.set(true);
  }

  async connexion(email: string, motDePasse: string, resterConnecte: boolean) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (!error) {
      try {
        sessionStorage.setItem(CLE_ACTIVE, '1');
        resterConnecte ? localStorage.removeItem(CLE_COURTE) : localStorage.setItem(CLE_COURTE, '1');
      } catch { /* stockage indisponible */ }
    }
    return messageErreur(error);
  }

  /** Crée le compte. Supabase envoie un e-mail de confirmation : pas de session avant le clic. */
  async inscription(email: string, motDePasse: string, profil: Profil) {
    const { data, error } = await supabase.auth.signUp({
      email, password: motDePasse,
      options: { data: { ...profil }, emailRedirectTo: `${location.origin}/espace-client` }
    });
    // Adresse déjà inscrite : Supabase répond sans erreur mais avec une liste d'identités vide.
    if (!error && data.user && data.user.identities?.length === 0) {
      return { erreur: messageErreur(new Error('already registered')), confirmation: false };
    }
    return { erreur: messageErreur(error), confirmation: !error && !data.session };
  }

  async deconnexion() {
    await supabase.auth.signOut();
    try { localStorage.removeItem(CLE_COURTE); } catch { /* stockage indisponible */ }
  }

  async motDePasseOublie(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/nouveau-mot-de-passe`
    });
    return messageErreur(error);
  }

  async changerMotDePasse(motDePasse: string) {
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    if (!error) this.recuperation.set(false);
    return messageErreur(error);
  }

  async modifierProfil(profil: Profil) {
    const { error } = await supabase.auth.updateUser({ data: { ...profil } });
    return messageErreur(error);
  }
}
