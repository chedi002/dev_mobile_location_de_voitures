import { Component, DestroyRef, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, ChartConfiguration, DoughnutController,
  Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip
} from 'chart.js';

// On n'enregistre que les briques utilisées : le bundle reste léger (Chart.js est « tree-shakable »).
Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend,
  LinearScale, LineController, LineElement, PointElement, Tooltip
);
Chart.defaults.font.family = '"Figtree","Segoe UI",system-ui,sans-serif';
Chart.defaults.color = '#52667E';          // --muted
Chart.defaults.borderColor = '#D5E3EA';    // --line

/** Palette du site (voir les variables CSS de styles.css). */
export const COULEURS = {
  nuit: '#0A2342', mer: '#0E7C9B', vert: '#0F7F5A', ambre: '#E8A33D', rouge: '#B4534A', gris: '#9AAABB'
};

/** Enveloppe Angular autour d'un graphique Chart.js : on lui passe une configuration, il la dessine. */
@Component({
  selector: 'app-graphique',
  template: `<div class="graphique"><canvas #cv role="img" [attr.aria-label]="titre()"></canvas></div>`,
  styles: `.graphique { position: relative; height: 260px; }`
})
export class Graphique {
  readonly config = input.required<ChartConfiguration>();
  readonly titre = input('Graphique');

  private readonly cv = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const canvas = this.cv()?.nativeElement;
      const cfg = this.config();
      if (!canvas) return;
      this.chart?.destroy();
      this.chart = new Chart(canvas, {
        ...cfg,
        options: { responsive: true, maintainAspectRatio: false, ...cfg.options }
      });
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}