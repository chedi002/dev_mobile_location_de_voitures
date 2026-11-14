/** Une voiture physique (une immatriculation) — table `vehicules`. */
export interface Voiture {
  id: number;
  nom: string;
  marque: string;
  modele: string;
  annee: number;
  cat: string;
  places: number;
  portes: number;
  bag: number;
  boite: string;
  carburant: string;
  clim: boolean;
  prix: number;     // DT / jour
  depot: number;    // DT
  base: string;     // ville de l'agence d'attache
  immat: string;
  statut: string;
  eq: string[];
  tags: string[];
  desc: string;
}

/** Un modèle proposé au catalogue (marque + modèle + boîte), regroupant plusieurs voitures. */
export interface Vehicule {
  id: number;
  nom: string;
  marque: string;
  modele: string;
  annee: number;
  slug: string;
  cat: string;
  places: number;
  portes: number;
  bag: number;
  bagTxt: string;
  boite: string;
  carburant: string;
  prix: number;
  depot: number;
  base: string;
  immat: string;
  statut: string;
  ag: string[];               // agences où au moins une voiture est disponible
  tags: string[];
  eq: string[];
  desc: string;
  stock: number;
  libres: number;
  /** Voitures physiques du modèle (pour attribuer une voiture et calculer la disponibilité). */
  voitures: { id: number; base: string; statut: string }[];
}

export interface Agence {
  id: number;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  horaires: string;
  latitude: number;
  longitude: number;
}

export interface Option {
  id: string;
  nom: string;
  prix: number;
  type: 'jour' | 'fixe';
  info: string;
}

/** Une ligne du détail de prix : libellé, montant (DT), explication facultative. */
export interface LignePrix {
  t: string;
  m: number;
  e?: string;
}

/** Une réservation telle que lue dans Supabase (table reservations, avec jointures). */
export interface Reservation {
  ref: string;
  statut: StatutReservation;
  vehicule_id: number;
  debut: string;
  fin: string;
  total_tnd: number;
  lignes: LignePrix[];
  options: string[];
  client_prenom: string;
  client_nom: string;
  client_email: string;
  client_tel: string;
  vol: string | null;
  created_at: string;
  vehicule: { marque: string; modele: string; immatriculation: string } | null;
  depart: { ville: string } | null;
  retour: { ville: string } | null;
}
export type StatutReservation = 'en_attente' | 'confirmee' | 'annulee' | 'terminee';

/** Créneau déjà réservé sur une voiture. */
export interface Occupation { debut: Date; fin: Date; }

export interface RoadtripEnregistre {
  from: string;
  to: string;
  trav: number;
  bag: number;
  pistes: boolean;
  circuit?: string;
  nom?: string;
  jours?: number;
  km?: number;
  voiture?: string;
}

/** Disponibilité d'un modèle pour des dates : ok, indisponible (no) ou non évaluée (na). */
export type Dispo = { e: 'na' } | { e: 'ok' } | { e: 'no'; libre: Date };

export interface Periode {
  deb: Date | null;
  fin: Date | null;
  ok: boolean;
  nj: number;
}
