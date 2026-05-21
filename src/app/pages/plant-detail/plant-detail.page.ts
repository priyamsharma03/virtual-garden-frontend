import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { PlantService } from '../../services/plant.service';
import { fadeInUp } from '../../shared/animations';
import { applyPlantImageFallback, resolvePlantImageUrl } from '../../shared/image-utils';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface MedicinalUseDetail {
  title: string;
  detail: string;
}

@Component({
  selector: 'app-plant-detail-page',
  imports: [RouterLink],
  templateUrl: './plant-detail.page.html',
  styleUrl: './plant-detail.page.scss',
  animations: [fadeInUp]
})
export class PlantDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly plantService = inject(PlantService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly suggestionsStart = signal(0);
  private readonly selectedImageIndex = signal(0);

  private readonly plantPhotoLibrary: Record<string, string[]> = {
    tulsi: [
      'https://images.unsplash.com/photo-1615485925873-212dc0c9746d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&w=1400&q=80'
    ],
    neem: [
      'https://images.unsplash.com/photo-1605123747553-96b7f5f8e4a2?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=1400&q=80'
    ],
    'aloe-vera': [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1616486897360-7d2f9a8f479d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80'
    ],
    ashwagandha: [
      'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1598206572429-95f6f5d67002?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1505575967455-40e256f73376?auto=format&fit=crop&w=1400&q=80'
    ],
    turmeric: [
      'https://images.unsplash.com/photo-1615485291234-9fbc63217b02?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1599921841143-819065a55cc6?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1400&q=80'
    ],
    ginger: [
      'https://images.unsplash.com/photo-1599909533898-ec6f18d56054?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1611250188496-e966043a0629?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1573414405822-4c7f4af3f3e3?auto=format&fit=crop&w=1400&q=80'
    ],
    brahmi: [
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=1400&q=80'
    ],
    amla: [
      'https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1400&q=80'
    ],
    lemongrass: [
      'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=1400&q=80'
    ],
    moringa: [
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80'
    ]
  };

  private readonly medicinalUseLibrary: Record<string, MedicinalUseDetail[]> = {
    tulsi: [
      { title: 'Immunity Tonic', detail: 'Often consumed as tea to support immunity during seasonal shifts.' },
      { title: 'Respiratory Relief', detail: 'Traditionally used in decoctions to ease cough and breathing discomfort.' },
      { title: 'Stress Balance', detail: 'Adaptogenic compounds are associated with stress resilience and calmness.' }
    ],
    neem: [
      { title: 'Skin Purifier', detail: 'Leaf and oil applications are used for mild skin concerns and scalp hygiene.' },
      { title: 'Oral Care', detail: 'Twigs and leaf extracts are used in traditional oral care routines.' },
      { title: 'Detox Traditions', detail: 'Included in cleansing routines in various Ayurvedic practices.' }
    ],
    'aloe-vera': [
      { title: 'Topical Soothing', detail: 'Gel is used for cooling support in irritated or sun-exposed skin.' },
      { title: 'Hydration Support', detail: 'Moisture-rich gel helps maintain skin softness and elasticity.' },
      { title: 'Digestive Comfort', detail: 'Traditional internal use is associated with gut soothing support.' }
    ],
    ashwagandha: [
      { title: 'Stress Adaptation', detail: 'Commonly used as an adaptogen for mental and physical stress response.' },
      { title: 'Energy and Recovery', detail: 'Used in formulations focused on stamina and post-fatigue recovery.' },
      { title: 'Sleep Quality', detail: 'Taken in evening routines to promote relaxation and sleep readiness.' }
    ]
  };

  private readonly activePlantId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: ''
  });

  private readonly plants = toSignal(this.plantService.getPlants(), {
    initialValue: []
  });

  protected readonly plant = computed(() =>
    this.plants().find((plant) => plant.id === this.activePlantId())
  );

  protected readonly suggestedPlants = computed(() =>
    this.plants().filter((plant) => plant.id !== this.activePlantId())
  );

  protected readonly suggestionWindow = computed(() => {
    const suggestions = this.suggestedPlants();
    const start = this.suggestionsStart();
    return suggestions.slice(start, start + 3);
  });

  protected readonly canSlidePrevious = computed(() => this.suggestionsStart() > 0);
  protected readonly canSlideNext = computed(
    () => this.suggestionsStart() + 3 < this.suggestedPlants().length
  );

  protected readonly galleryImages = computed(() => {
    const activePlant = this.plant();
    if (!activePlant) {
      return [];
    }

    return this.plantPhotoLibrary[activePlant.id] ?? [activePlant.imageUrl];
  });

  protected readonly selectedImage = computed(() => {
    const images = this.galleryImages();
    if (!images.length) {
      return '';
    }

    const index = Math.min(this.selectedImageIndex(), images.length - 1);
    return images[index];
  });

  protected readonly medicinalUseDetails = computed(() => {
    const activePlant = this.plant();
    if (!activePlant) {
      return [];
    }

    return (
      this.medicinalUseLibrary[activePlant.id] ??
      activePlant.medicinalUses.map((use) => ({
        title: use,
        detail: `${use} is one of the key traditional wellness uses associated with ${activePlant.commonName}.`
      }))
    );
  });

  protected readonly modelEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const activePlant = this.plant();
    const embedUrl = this.resolveSketchfabEmbedUrl(activePlant?.modelUrl ?? '');
    return embedUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl) : null;
  });

  protected readonly rawModelUrl = computed(() => this.plant()?.modelUrl ?? '');

  protected readonly resolvedEmbedString = computed(() => {
    return this.resolveSketchfabEmbedUrl(this.rawModelUrl()) ?? '';
  });

  protected readonly resolvePlantImageUrl = resolvePlantImageUrl;

  constructor() {
    effect(() => {
      this.activePlantId();
      this.suggestionsStart.set(0);
      this.selectedImageIndex.set(0);
    });
  }

  selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  protected handleImageError(event: Event) {
    applyPlantImageFallback(event);
  }

  private resolveSketchfabEmbedUrl(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value) {
      return null;
    }

    const srcMatch = value.match(/src=["']([^"']+)["']/i);
    const source = srcMatch?.[1] ?? value;

    if (/^https?:\/\//i.test(source)) {
      if (/\/embed(?:\?|$)/i.test(source)) {
        return source;
      }

      const embeddedIdMatch = source.match(/(?:models\/|3d-models\/[^/]+-)([a-f0-9]{32})(?:[/?#]|$)/i);
      if (embeddedIdMatch?.[1]) {
        return `https://sketchfab.com/models/${embeddedIdMatch[1]}/embed`;
      }

      return source;
    }

    return null;
  }

  previousSuggestions() {
    if (this.canSlidePrevious()) {
      this.suggestionsStart.update((value) => Math.max(0, value - 1));
    }
  }

  openEmbedInNewTab() {
    const url = this.resolvedEmbedString();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  nextSuggestions() {
    if (this.canSlideNext()) {
      this.suggestionsStart.update((value) => value + 1);
    }
  }
}
