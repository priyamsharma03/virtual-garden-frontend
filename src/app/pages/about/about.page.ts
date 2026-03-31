import { Component } from '@angular/core';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-about-page',
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  animations: [fadeInUp]
})
export class AboutPageComponent {}
