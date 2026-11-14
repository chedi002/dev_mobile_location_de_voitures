import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from '../src/app.js';

/**
 * Tests des routes sans vraie base : `db` et `verifierJeton` sont simulés.
 * Jetons de test : « client » (utilisateur ordinaire) et « admin ».
 */
const UTILISATEURS = { client: { id: 'u-client', email: 'client@exemple.tn' }, admin: { id: 'u-admin', email: 'admin@exemple.tn' } };

function fausseBase() {
  const db = {
    query: vi.fn(async (sql, params) => {
      if (sql.includes('from public.admins')) return params[0] === 'u-admin' ? [{ '?column?': 1 }] : [];
      if (sql.includes('insert into public.messages_contact')) return [{ id: '7' }];
      if (sql.includes('insert into public.demandes_transfert')) return [{ id: '8' }];
      if (sql.includes('from public.reservations') && sql.includes('fin > now()')) {
        return [{ vehicule_id: '10', debut: '2026-12-01T10:00:00Z', fin: '2026-12-04T10:00:00Z' }];
      }
      if (sql.includes('update public.reservations')) return [];
      return [];
    }),
    transaction: vi.fn(async travail => travail({ query: db.query }))
  };
  return db;
}

const verifierJeton = async jeton => {
  if (!UTILISATEURS[jeton]) throw new Error('jeton invalide');
  return UTILISATEURS[jeton];
};

// Une seule heure de référence : deux appels à Date.now() diffèrent de quelques ms,
// ce qui ferait compter un jour de plus (toute tranche de 24 h commencée compte).
const MAINTENANT = Date.now();
const futur = jours => new Date(MAINTENANT + jours * 864e5).toISOString();
const messageValide = { prenom: 'Sami', nom: 'Ben Ali', email: 'sami@exemple.tn', sujet: 'Autre', message: 'Bonjour, je voudrais un devis pour un mois.' };

describe('API WIJHA', () => {
  let db, envoyerEmail, app;

  beforeEach(() => {
    db = fausseBase();
    envoyerEmail = vi.fn(async () => {});
    app = creerApp({ db, verifierJeton, envoyerEmail, emailAgence: 'agence@wijha.tn' });
  });

  it('répond sur /api/sante', async () => {
    const r = await request(app).get('/api/sante');
    expect(r.status).toBe(200);
    expect(r.body.statut).toBe('ok');
  });

  it('renvoie 404 sur une route inconnue', async () => {
    expect((await request(app).get('/api/nimporte')).status).toBe(404);
  });

  it('liste les créneaux occupés sans dire par qui', async () => {
    const r = await request(app).get('/api/occupations');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([{ vehicule_id: 10, debut: '2026-12-01T10:00:00Z', fin: '2026-12-04T10:00:00Z' }]);
  });

  describe('formulaire de contact', () => {
    it('enregistre un message valide et prévient l’agence', async () => {
      const r = await request(app).post('/api/contact').send(messageValide);
      expect(r.status).toBe(201);
      expect(r.body).toEqual({ id: 7 });
      expect(envoyerEmail).toHaveBeenCalledWith(expect.objectContaining({ a: 'agence@wijha.tn' }));
    });

    it('refuse un message trop court avec une explication', async () => {
      const r = await request(app).post('/api/contact').send({ ...messageValide, message: 'Trop court' });
      expect(r.status).toBe(400);
      expect(r.body.erreur).toMatch(/20 caractères/);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('refuse une adresse e-mail invalide', async () => {
      const r = await request(app).post('/api/contact').send({ ...messageValide, email: 'pas-un-email' });
      expect(r.status).toBe(400);
      expect(r.body.erreur).toBe('Adresse e-mail invalide.');
    });
  });

  it('refuse une demande de transfert dans le passé', async () => {
    const r = await request(app).post('/api/transferts').send({
      sens: 'arrivee', aeroport: 'Tunis-Carthage', lieu: 'Hôtel, Tunis', quand: '2020-01-01T10:00:00Z',
      passagers: 2, nom: 'Sami', email: 'sami@exemple.tn'
    });
    expect(r.status).toBe(400);
    expect(r.body.erreur).toMatch(/futur/);
  });

  describe('réservations', () => {
    const corps = {
      vehicule: 22, depart: 'Sousse', debut: futur(10), fin: futur(13), options: ['gps'], age: '25–64 ans',
      voyageurs: 2, bagages: 1, client: { prenom: 'Sami', nom: 'Ben Ali', email: 'sami@exemple.tn', tel: '+216 20 000 000' }
    };

    it('exigent une connexion', async () => {
      expect((await request(app).post('/api/reservations').send(corps)).status).toBe(401);
      expect((await request(app).get('/api/reservations/moi')).status).toBe(401);
    });

    it('refusent un jeton invalide', async () => {
      const r = await request(app).get('/api/reservations/moi').set('Authorization', 'Bearer faux');
      expect(r.status).toBe(401);
    });

    it('refusent un retour avant le retrait', async () => {
      const r = await request(app).post('/api/reservations').set('Authorization', 'Bearer client')
        .send({ ...corps, fin: futur(5) });
      expect(r.status).toBe(400);
      expect(r.body.erreur).toBe('La date de retour doit être après le retrait.');
    });

    it('renvoient 409 quand aucune voiture n’est libre', async () => {
      db.query.mockImplementation(async sql => {
        if (sql.includes('select marque, modele, transmission')) return [{ marque: 'Kia', modele: 'Picanto', transmission: 'Manuelle' }];
        if (sql.includes('from public.agences where ville = any')) return [{ id: 3, ville: 'Sousse' }];
        if (sql.includes('min(prix_jour_tnd)')) return [{ prix: 78 }];
        return []; // aucune voiture libre
      });
      const r = await request(app).post('/api/reservations').set('Authorization', 'Bearer client').send(corps);
      expect(r.status).toBe(409);
    });

    it('calculent le prix côté serveur et ignorent un total envoyé par le client', async () => {
      const inserts = [];
      db.query.mockImplementation(async (sql, params) => {
        if (sql.includes('select marque, modele, transmission')) return [{ marque: 'Kia', modele: 'Picanto', transmission: 'Manuelle' }];
        if (sql.includes('from public.agences where ville = any')) return [{ id: 3, ville: 'Sousse' }];
        if (sql.includes('min(prix_jour_tnd)')) return [{ prix: 78 }];
        if (sql.includes('for update of v skip locked')) return [{ id: '22', immatriculation: '247 TUN 1877' }];
        if (sql.includes('insert into public.reservations')) inserts.push(params);
        return [];
      });
      const r = await request(app).post('/api/reservations').set('Authorization', 'Bearer client')
        .send({ ...corps, total: 1 });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ immatriculation: '247 TUN 1877', nj: 3, total: 78 * 3 + 7 * 3 });
      expect(inserts[0][1]).toBe('u-client');        // réservation rattachée au compte du jeton
      expect(inserts[0][9]).toBe(78 * 3 + 7 * 3);    // total calculé par le serveur
      expect(envoyerEmail).toHaveBeenCalledWith(expect.objectContaining({ a: 'sami@exemple.tn' }));
    });

    it('refusent d’annuler une réservation qui n’est plus annulable', async () => {
      const r = await request(app).post('/api/reservations/WJH-000000-XXXX/annuler').set('Authorization', 'Bearer client');
      expect(r.status).toBe(409);
    });
  });

  describe('administration', () => {
    it('est fermée aux visiteurs et aux clients', async () => {
      expect((await request(app).get('/api/admin/reservations')).status).toBe(401);
      expect((await request(app).get('/api/admin/reservations').set('Authorization', 'Bearer client')).status).toBe(403);
    });

    it('est ouverte aux administrateurs', async () => {
      const r = await request(app).get('/api/admin/reservations').set('Authorization', 'Bearer admin');
      expect(r.status).toBe(200);
    });

    it('refuse un statut inconnu', async () => {
      const r = await request(app).patch('/api/admin/reservations/WJH-1').set('Authorization', 'Bearer admin').send({ statut: 'payee' });
      expect(r.status).toBe(400);
    });

    it('refuse un prix négatif', async () => {
      const r = await request(app).patch('/api/admin/vehicules/22').set('Authorization', 'Bearer admin').send({ prix: -5 });
      expect(r.status).toBe(400);
    });
  });

  it('indique si le compte connecté est administrateur', async () => {
    expect((await request(app).get('/api/moi').set('Authorization', 'Bearer admin')).body.admin).toBe(true);
    expect((await request(app).get('/api/moi').set('Authorization', 'Bearer client')).body.admin).toBe(false);
  });
});
