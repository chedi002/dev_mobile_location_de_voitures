import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

/** Page réservée aux utilisateurs connectés : sinon, renvoi vers /connexion puis retour ici. */
export const connecteGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(auth.pret).pipe(
    filter(Boolean),
    take(1),
    map(() => auth.connecte() || router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } }))
  );
};

/** Pages d'administration : compte connecté ET présent dans la table admins. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(computed(() => auth.pret() && auth.roleVerifie())).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      if (!auth.connecte()) return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
      return auth.estAdmin() || router.createUrlTree(['/acces-refuse']);
    })
  );
};
