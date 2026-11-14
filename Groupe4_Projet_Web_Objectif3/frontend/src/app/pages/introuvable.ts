import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-introuvable',
  imports: [RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Page introuvable</h1>
      <p>Cette adresse n’existe pas ou n’est plus disponible.</p>
    </div></section>
    <section class="wrap section">
      <p><a class="btn btn-green" routerLink="/">Retour à l’accueil</a> <a class="btn btn-ghost" routerLink="/voitures">Voir les voitures</a></p>
    </section>
  `
})
export class Introuvable {}

@Component({
  selector: 'app-acces-refuse',
  imports: [RouterLink],
  template: `
    <section class="page-head"><div class="wrap">
      <h1>Accès réservé</h1>
      <p>Cette partie du site est réservée aux administrateurs de l’agence.</p>
    </div></section>
    <section class="wrap section">
      <p>Si vous devriez y avoir accès, demandez à un administrateur d’ajouter votre compte.</p>
      <p style="margin-top:1rem"><a class="btn btn-green" routerLink="/">Retour à l’accueil</a> <a class="btn btn-ghost" routerLink="/espace-client">Mon espace</a></p>
    </section>
  `
})
export class AccesRefuse {}
