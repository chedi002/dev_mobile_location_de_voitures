import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * <img appPhoto> : si la photo ne se charge pas, l'image est retirée et le
 * dégradé de couleur de la catégorie (fond du conteneur) reste visible.
 */
@Directive({ selector: 'img[appPhoto]' })
export class PhotoDirective {
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostListener('error')
  retirer() {
    this.el.nativeElement.remove();
  }
}
