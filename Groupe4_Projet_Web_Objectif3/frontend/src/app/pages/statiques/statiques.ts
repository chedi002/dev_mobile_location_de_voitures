import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/* Pages de contenu, reprises telles quelles du prototype (archives/prototype-html). */

@Component({ selector: 'app-faq', imports: [RouterLink], templateUrl: './faq.html' })
export class Faq {}

@Component({ selector: 'app-services', imports: [RouterLink], templateUrl: './services.html' })
export class Services {}

@Component({ selector: 'app-promotions', imports: [RouterLink], templateUrl: './promotions.html' })
export class Promotions {}

@Component({ selector: 'app-conditions', imports: [RouterLink], templateUrl: './conditions.html' })
export class Conditions {}

@Component({ selector: 'app-confidentialite', imports: [RouterLink], templateUrl: './confidentialite.html' })
export class Confidentialite {}
