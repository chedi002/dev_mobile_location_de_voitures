/* Circuits proposés : modifiez librement. Un élément de « etapes » = un jour. */

export interface Etape { titre: string; km: number; duree: string; texte: string; }
export interface Circuit {
  id: string; nom: string; photo: string; villes: string; types: string[]; saison: string; voiture: string;
  peages: number; from: string; to: string; resume: string; etapes: Etape[]; conseils: string[];
}

/** Consommation moyenne par catégorie, en L/100 km (à ajuster). */
export const CONSO: Record<string, number> = {
  citadine: 5.5, compacte: 6.5, berline: 6.5, suv: 8, '7places': 8.5, minibus: 10, premium: 7.5
};

export const CIRCUITS: Circuit[] = [
  {
    id: 'cap-bon', photo: 'kelibia', nom: 'Cap Bon', villes: 'Tunis · Nabeul · Kélibia · Korbous',
    types: ['couple', 'famille'], saison: 'Avril à octobre', voiture: 'citadine',
    peages: 2, from: 'Tunis', to: 'Tunis',
    resume: 'Une escapade courte entre plages, poterie et fruits de mer, idéale pour un week-end prolongé.',
    etapes: [
      { titre: 'Tunis → Nabeul', km: 65, duree: '1 h', texte: 'Route par Hammamet. Marché et poteries de Nabeul.' },
      { titre: 'Nabeul → Kélibia', km: 60, duree: '1 h 15', texte: 'Fort de Kélibia et sa plage, l’une des plus claires du pays.' },
      { titre: 'Kélibia → Korbous → Tunis', km: 150, duree: '3 h', texte: 'El Haouaria, puis sources chaudes de Korbous avant le retour.' }
    ],
    conseils: ['Fruits de mer à Kélibia : réservez le midi en été.', 'Routes côtières étroites vers Korbous : roulez prudemment.']
  },
  {
    id: 'cote-est', photo: 'sousse', nom: 'Côte est', villes: 'Tunis · Hammamet · Sousse · Monastir · Mahdia',
    types: ['famille', 'culture'], saison: 'Mai à octobre', voiture: 'citadine',
    peages: 4, from: 'Tunis', to: 'Tunis',
    resume: 'Plages, médinas et amphithéâtre romain sur la côte la plus touristique, par autoroute.',
    etapes: [
      { titre: 'Tunis → Hammamet', km: 65, duree: '1 h', texte: 'Médina et fort de Hammamet, baignade en fin de journée.' },
      { titre: 'Hammamet → Sousse', km: 65, duree: '1 h', texte: 'Médina classée à l’UNESCO et ribat.' },
      { titre: 'Sousse → Monastir → Mahdia', km: 80, duree: '1 h 30', texte: 'Mausolée de Bourguiba à Monastir, puis port et cap de Mahdia.' },
      { titre: 'Mahdia → El Jem → Tunis', km: 250, duree: '3 h 30', texte: 'Amphithéâtre d’El Jem, puis retour par l’autoroute A1.' }
    ],
    conseils: ['L’autoroute A1 est la plus rapide : gardez de la monnaie pour les péages.', 'Visitez El Jem tôt le matin pour éviter la chaleur.']
  },
  {
    id: 'nord', photo: 'tabarka', nom: 'Nord et forêts', villes: 'Tunis · Bizerte · Tabarka · Aïn Draham · Dougga',
    types: ['nature', 'culture'], saison: 'Mars à juin, septembre à novembre', voiture: 'compacte',
    peages: 3, from: 'Tunis', to: 'Tunis',
    resume: 'Du port de Bizerte aux forêts de chênes-lièges, avec deux grands sites romains.',
    etapes: [
      { titre: 'Tunis → Bizerte', km: 65, duree: '1 h', texte: 'Vieux port, kasbah, puis Cap Blanc au coucher du soleil.' },
      { titre: 'Bizerte → Tabarka', km: 130, duree: '2 h 15', texte: 'Route côtière par Sejnane. Île et fort génois de Tabarka.' },
      { titre: 'Tabarka → Aïn Draham → Bulla Regia', km: 100, duree: '2 h 30', texte: 'Forêts de montagne, puis les maisons romaines enterrées de Bulla Regia.' },
      { titre: 'Bulla Regia → Dougga → Tunis', km: 200, duree: '3 h 30', texte: 'Théâtre et capitole de Dougga, puis retour sur Tunis.' }
    ],
    conseils: ['Prévoyez une veste : il fait frais et humide à Aïn Draham.', 'Faites le plein à Bizerte ou Tabarka avant les routes de montagne.']
  },
  {
    id: 'djerba-sud-est', photo: 'tataouine', nom: 'Djerba et Sud-Est', villes: 'Djerba · Médenine · Tataouine · Chenini · Matmata',
    types: ['culture', 'famille', 'aventure'], saison: 'Octobre à avril', voiture: 'suv',
    peages: 0, from: 'Djerba', to: 'Djerba',
    resume: 'Ksour berbères, villages de montagne et maisons troglodytes, au départ de l’île de Djerba.',
    etapes: [
      { titre: 'Djerba, Houmt Souk et Guellala', km: 40, duree: '1 h', texte: 'Souk, synagogue de la Ghriba et poteries de Guellala.' },
      { titre: 'Djerba → Médenine → Tataouine', km: 150, duree: '2 h 30', texte: 'Ghorfas de Médenine, puis Ksar Hadada, décor de cinéma.' },
      { titre: 'Chenini et Douiret', km: 60, duree: '1 h 30', texte: 'Villages berbères perchés, balade à pied entre les maisons de pierre.' },
      { titre: 'Tataouine → Matmata → Djerba', km: 190, duree: '3 h 30', texte: 'Habitations troglodytes de Matmata, retour par Gabès et la chaussée.' },
      { titre: 'Journée libre à Djerba', km: 30, duree: '—', texte: 'Plage, balade à cheval ou quad, restitution de la voiture.' }
    ],
    conseils: ['Évitez les pistes sans 4x4 : le SUV suffit pour les routes goudronnées.', 'Eau et carburant avant Tataouine : les stations sont plus rares.']
  },
  {
    id: 'grand-sud', photo: 'douz', nom: 'Grand Sud et désert', villes: 'Tunis · Kairouan · Tozeur · Douz · Tataouine · Djerba',
    types: ['aventure', 'nature', 'culture'], saison: 'Octobre à avril', voiture: 'suv',
    peages: 4, from: 'Tunis', to: 'Djerba',
    resume: 'Le grand classique : villes saintes, oasis, lac de sel et portes du Sahara, jusqu’à Djerba.',
    etapes: [
      { titre: 'Tunis → Kairouan', km: 160, duree: '2 h 15', texte: 'Grande mosquée et médina, quatrième ville sainte de l’islam.' },
      { titre: 'Kairouan → Tozeur', km: 300, duree: '4 h 30', texte: 'Route par Gafsa. Oasis et vieux quartier de briques de Tozeur.' },
      { titre: 'Tozeur : Chebika, Tamerza, Mides', km: 150, duree: '3 h', texte: 'Oasis de montagne, cascades et canyons, paysages de film.' },
      { titre: 'Tozeur → Douz', km: 100, duree: '1 h 45', texte: 'Traversée du Chott el-Jérid, puis porte du désert à Douz.' },
      { titre: 'Douz → Matmata → Tataouine', km: 235, duree: '4 h', texte: 'Maisons troglodytes, puis ksour de la région de Tataouine.' },
      { titre: 'Tataouine → Djerba', km: 150, duree: '2 h 30', texte: 'Arrivée à Djerba, restitution à l’agence de l’île.' }
    ],
    conseils: ['Retour en agence différente (Djerba) : le supplément est ajouté au budget et à la réservation.', 'Kilomètres élevés : le kilométrage illimité est un vrai avantage ici.', 'Chaleur et vent de sable possibles : voyagez de préférence d’octobre à avril.']
  }
];
