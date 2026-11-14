import { TestBed } from '@angular/core/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notifs: NotificationsService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    notifs = TestBed.inject(NotificationsService);
  });

  afterEach(() => vi.useRealTimers());

  it('affiche une notification puis la retire seule', () => {
    notifs.succes('Profil enregistré.');
    expect(notifs.liste()).toEqual([expect.objectContaining({ type: 'succes', texte: 'Profil enregistré.' })]);
    vi.advanceTimersByTime(5000);
    expect(notifs.liste()).toEqual([]);
  });

  it('laisse une erreur affichée plus longtemps qu’un succès', () => {
    notifs.erreur('Envoi impossible.');
    vi.advanceTimersByTime(5000);
    expect(notifs.liste().length).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(notifs.liste()).toEqual([]);
  });

  it('n’empile jamais plus de trois notifications', () => {
    ['a', 'b', 'c', 'd'].forEach(t => notifs.info(t));
    expect(notifs.liste().map(n => n.texte)).toEqual(['b', 'c', 'd']);
  });

  it('se ferme à la demande', () => {
    notifs.info('x');
    notifs.fermer(notifs.liste()[0].id);
    expect(notifs.liste()).toEqual([]);
  });
});
