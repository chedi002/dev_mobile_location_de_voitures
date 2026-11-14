import { Option, Periode, Vehicule } from './modeles';

/* ---------- Supabase ---------- */
export const SUPABASE_URL = 'https://acmgjilyytsstgxjcetb.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_HvyVd1VG_arGYt30cP4-Gg_2BTG0XHg'; // clé publique : sert uniquement à la connexion (Supabase Auth)
export const PHOTOS_URL = `${SUPABASE_URL}/storage/v1/object/public/vehicules/`;

/* ---------- Dates ---------- */
const T0 = new Date();
T0.setHours(0, 0, 0, 0);
/** Date à n jours d'aujourd'hui (minuit). */
export const day = (n: number) => new Date(T0.getTime() + n * 864e5);
export const fmtD = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const fmtDH = (d: Date) => fmtD(d) + ' ' + hm(d);
/** Valeur pour un <input type="datetime-local">. */
export const loc = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

/** Période saisie : toute tranche de 24 h commencée compte pour un jour. */
export function periode(debut: string, fin: string): Periode {
  const deb = debut ? new Date(debut) : null;
  const f = fin ? new Date(fin) : null;
  const ok = !!(deb && f && f > deb);
  return { deb, fin: f, ok, nj: ok ? Math.ceil((f!.getTime() - deb!.getTime()) / 864e5) : 0 };
}

/* ---------- Montants ---------- */
const nf = new Intl.NumberFormat('fr-FR');
export const prixDT = (n: number) => nf.format(Math.round(n)) + ' DT';
export const nombre = (n: number) => nf.format(n);
export const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/* ---------- Véhicules ---------- */
export const photo = (v: Pick<Vehicule, 'slug'>, n = 1) => `${PHOTOS_URL}${v.slug}-${n}.jpg`;


export interface Badge { cls: string; txt: string; }
export function badges(v: Vehicule): Badge[] {
  const b: Badge[] = [];
  if (v.prix <= 100) b.push({ cls: 'b-eco', txt: 'Économique' });
  if (v.cat === 'premium') b.push({ cls: 'b-lux', txt: 'Prestige' });
  if (v.boite === 'Automatique') b.push({ cls: 'b-auto', txt: 'Automatique' });
  if (v.tags.includes('sud') && v.eq.some(e => /4x4|Garde au sol/.test(e))) b.push({ cls: 'b-fam', txt: 'Idéal Sud et pistes' });
  if (v.places >= 7) b.push({ cls: 'b-fam', txt: 'Famille' });
  return b;
}

/** Catégories conseillées selon le nombre de voyageurs, de valises et le type de route. */
export function categoriesConseillees(trav: number, bag: number, pistes: boolean): string[] {
  if (pistes) return ['suv'];
  if (trav >= 8) return ['minibus'];
  if (trav >= 6) return ['7places'];
  if (trav >= 5 || (trav === 4 && bag >= 4)) return ['suv'];
  if (trav >= 3) return ['berline', 'compacte'];
  return ['citadine'];
}

export const AGES = ['21–24 ans', '25–64 ans', '65 ans et plus'];

/** Options (tarifs indicatifs, en DT) — prix par jour, sauf mention « fixe ». */
export const OPTIONS: Option[] = [
  { id: 'gps', nom: 'GPS', prix: 7, type: 'jour', info: 'Navigation avec cartes de la Tunisie.' },
  { id: 'bebe', nom: 'Siège bébé', prix: 10, type: 'jour', info: 'Selon disponibilité, à réserver à l’avance.' },
  { id: 'chauffeur', nom: 'Chauffeur', prix: 130, type: 'jour', info: 'Pour déplacements professionnels ou excursions.' },
  { id: 'retour', nom: 'Retour dans une autre agence', prix: 60, type: 'fixe', info: 'Frais fixes, confirmés à l’étape 3.' }
];
export const montantOption = (o: Option, nj: number) => (o.type === 'jour' ? o.prix * nj : o.prix);
export const tarifOption = (o: Option) => `${o.prix} DT${o.type === 'jour' ? '/jour' : ''}`;

export const EMAIL = /^\S+@\S+\.\S+$/;

export const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const slugifier = (s: string) => normaliser(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
