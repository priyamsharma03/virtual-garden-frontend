import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { SceneHandle, ThreeGardenService } from '../../services/three-garden.service';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-garden-3d-page',
  templateUrl: './garden-3d.page.html',
  styleUrl: './garden-3d.page.scss',
  animations: [fadeInUp]
})
export class Garden3dPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gardenCanvas', { static: false }) gardenCanvas?: ElementRef<HTMLCanvasElement>;

  private sceneHandle?: SceneHandle;

  constructor(private readonly threeGardenService: ThreeGardenService) {}

  ngAfterViewInit() {
    if (this.gardenCanvas) {
      this.sceneHandle = this.threeGardenService.initFullGarden(this.gardenCanvas.nativeElement);
    }
  }

  ngOnDestroy() {
    this.sceneHandle?.dispose();
  }
}
