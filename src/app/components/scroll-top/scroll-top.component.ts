import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  templateUrl: './scroll-top.component.html',
  styleUrl: './scroll-top.component.scss'
})
export class ScrollTopComponent {
  protected readonly showButton = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.showButton.set(window.scrollY > 320);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
