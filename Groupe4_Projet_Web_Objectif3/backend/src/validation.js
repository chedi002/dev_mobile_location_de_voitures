import { z } from 'zod';

/** Schémas de validation des données reçues. Chaque message d'erreur est affiché tel quel au client. */

const texte = (nom, min, max) =>
  z.string({ error: `${nom} manquant.` }).trim()
    .min(min, `${nom} : ${min} caractère${min > 1 ? 's' : ''} au minimum.`)
    .max(max, `${nom} : ${max} caractères au maximum.`);

const email = z.string({ error: 'Adresse e-mail manquante.' }).trim().max(200)
  .regex(/^\S+@\S+\.\S+$/, 'Adresse e-mail invalide.');

const telephone = z.string().trim().max(30)
  .refine(t => t.replace(/\D/g, '').length >= 8, 'Le téléphone doit comporter au moins 8 chiffres.');

const dateIso = nom => z.string({ error: `${nom} manquante.` })
  .refine(d => !Number.isNaN(Date.parse(d)), `${nom} invalide.`);

const facultatif = max => z.string().trim().max(max).optional().nullable()
  .transform(v => (v ? v : null));

export const schemaReservation = z.object({
  vehicule: z.number({ error: 'Véhicule manquant.' }).int().positive(),
  depart: texte('Agence de départ', 2, 60),
  retour: texte('Agence de retour', 2, 60).optional(),
  debut: dateIso('Date de retrait'),
  fin: dateIso('Date de retour'),
  options: z.array(z.enum(['gps', 'bebe', 'chauffeur', 'retour'])).max(4).default([]),
  age: z.enum(['21–24 ans', '25–64 ans', '65 ans et plus'], { error: 'Âge du conducteur invalide.' }),
  voyageurs: z.number().int().min(1, 'Au moins un voyageur.').max(20),
  bagages: z.number().int().min(0).max(30).default(0),
  client: z.object({
    prenom: texte('Prénom', 1, 80),
    nom: texte('Nom', 1, 80),
    email,
    tel: telephone,
    vol: facultatif(20)
  })
}).superRefine((r, ctx) => {
  const debut = Date.parse(r.debut), fin = Date.parse(r.fin);
  if (fin <= debut) ctx.addIssue({ code: 'custom', message: 'La date de retour doit être après le retrait.', path: ['fin'] });
  if (debut < Date.now() - 5 * 60e3) ctx.addIssue({ code: 'custom', message: 'Le retrait doit être dans le futur.', path: ['debut'] });
  if (fin - debut > 90 * 864e5) ctx.addIssue({ code: 'custom', message: 'Une location ne peut pas dépasser 90 jours en ligne.', path: ['fin'] });
});

export const schemaContact = z.object({
  prenom: texte('Prénom', 1, 80),
  nom: texte('Nom', 1, 80),
  email,
  tel: z.union([telephone, z.literal('')]).optional().nullable().transform(v => (v ? v : null)),
  sujet: texte('Sujet', 1, 80),
  reference: z.string().trim().max(30).optional().nullable()
    .refine(v => !v || /^WJH-\d{6}-[A-Z0-9]{4}$/i.test(v), 'La référence doit ressembler à WJH-261116-A1B2.')
    .transform(v => (v ? v.toUpperCase() : null)),
  message: texte('Message', 20, 4000)
});

export const schemaTransfert = z.object({
  sens: z.enum(['arrivee', 'depart'], { error: 'Sens du trajet invalide.' }),
  aeroport: texte('Aéroport', 1, 80),
  lieu: texte('Adresse ou hôtel', 1, 200),
  quand: dateIso('Date du transfert').refine(d => Date.parse(d) > Date.now(), 'La date du transfert doit être dans le futur.'),
  vol: facultatif(20),
  passagers: z.number().int().min(1, 'Au moins un passager.').max(16),
  bagages: z.number().int().min(0).max(20).default(0),
  besoins: facultatif(1000),
  nom: texte('Nom', 1, 120),
  email
});

export const schemaStatut = z.object({
  statut: z.enum(['en_attente', 'confirmee', 'annulee', 'terminee'], { error: 'Statut inconnu.' })
});

export const schemaVoiture = z.object({
  prix: z.number().positive('Le prix doit être positif.').max(10000).optional(),
  depot: z.number().min(0, 'Le dépôt ne peut pas être négatif.').max(100000).optional(),
  statut: z.enum(['disponible', 'reserve', 'loue', 'en_transfert', 'maintenance', 'inactif'], { error: 'Statut inconnu.' }).optional(),
  agence: z.string().trim().min(2).max(60).optional()
}).refine(v => Object.values(v).some(x => x !== undefined), 'Aucune modification demandée.');

export const schemaTraite = z.object({ traite: z.boolean({ error: 'Valeur « traite » attendue (vrai ou faux).' }) });
