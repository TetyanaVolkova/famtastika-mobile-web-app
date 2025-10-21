import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  TrackByFunction,
  AfterViewInit, // <-- added
  NgZone, // <-- added
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { HttpService } from 'src/app/services/http.service';
import {
  catchError,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap, // <<< add tap
} from 'rxjs';
import { LanguageService } from '../header/language.service';
import { createGesture, Gesture } from '@ionic/core';
import { FlashcardPage } from '../flashcard/flashcard.page'; // <-- added

export interface CardWithFlip {
  id: string;
  front: string;
  back: string;
  flipped: boolean;
}

export interface Instructions {
  title: string;
  description: string;
}

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.page.html',
  styleUrls: ['./flashcards.page.scss'],
  standalone: true,
  imports: [
    IonCardTitle,
    IonCol,
    IonRow,
    IonGrid,
    IonCardContent,
    IonCard,
    IonContent,
    IonButton,
    CommonModule,
    FormsModule,
  ],
})
export class FlashcardsPage implements OnDestroy, AfterViewInit {
  // <-- added AfterViewInit
  @ViewChildren('cardRef', { read: ElementRef })
  cardRefs!: QueryList<ElementRef>;

  selectedLanguage: 'ru' | 'en' = 'en';

  lang$!: Observable<string>;
  instructions$!: Observable<Instructions | null>;
  cards: CardWithFlip[] = [];

  private destroy$ = new Subject<void>();

  // === Native swipe bits ===
  private topGesture?: Gesture; // <-- added
  private readonly swipeThreshold = 100; // <-- added (px to count as swipe)
  private readonly OUT_MS = 400;
  private isAnimating = false;
  // =========================

  constructor(
    private http: HttpService,
    private languageService: LanguageService,
    private ngZone: NgZone // <-- added
  ) {}

  // === Attach native finger slide to the TOP card ===
  ngAfterViewInit() {
    this.attachTopCardGesture();

    this.cardRefs.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.attachTopCardGesture());
  }

  private attachTopCardGesture() {
    // cleanup previous
    this.topGesture?.destroy();

    const topEl = this.cardRefs.first?.nativeElement as HTMLElement | undefined;
    if (!topEl) return;

    // Encourage browsers to treat horizontal as custom; vertical scroll still allowed
    topEl.style.touchAction = 'pan-y';

    let startX = 0;

    this.topGesture = createGesture({
      el: topEl,
      gestureName: 'card-swipe',
      threshold: 0, // begin immediately
      gesturePriority: 100, // win against content scroll when horizontal
      disableScroll: true, // prevent IonContent from hijacking during gesture
      onStart: (ev: any) => {
        startX = ev.currentX ?? ev.startX ?? 0;
      },
      onMove: (_ev: any) => {
        // Keeping visuals driven by existing CSS classes (.moving-out/.moving-in)
      },
      onEnd: (ev: any) => {
        if (this.isAnimating || this.cards.length < 2) return;

        const endX = ev.currentX ?? ev.endX ?? startX;
        const dx = endX - startX;
        const vx = ev.velocityX ?? 0;

        const swipedRight = dx > this.swipeThreshold || vx > 0.35;
        const swipedLeft = dx < -this.swipeThreshold || vx < -0.35;

        this.ngZone.run(() => {
          if (swipedRight) {
            // existing animation: fly RIGHT, then rotate first -> back
            this.shuffle();
          } else if (swipedLeft) {
            // left flow: fly LEFT, then rotate first -> back (same "next" effect)
            this.shuffleLeft();
          }
        });

        // Reattach to new top after DOM updates
        setTimeout(() => this.attachTopCardGesture(), 10);
      },
    });

    this.topGesture.enable(true);
  }
  // ================================================

  // flip by index (immutably)
  toggleFlip() {
    if (!this.cards.length) return;
    this.cards = [
      { ...this.cards[0], flipped: !this.cards[0].flipped },
      ...this.cards.slice(1),
    ];
  }

  /** RIGHT swipe (or button Next): unchanged */
  shuffle() {
    if (this.cards.length < 2 || this.isAnimating) return;

    const topEl = this.cardRefs.first?.nativeElement as HTMLElement | undefined;
    if (!topEl) return;

    this.isAnimating = true;
    topEl.classList.add('moving-out');

    setTimeout(() => {
      topEl.classList.remove('moving-out');

      const removed = this.cards.shift();
      if (removed) {
        removed.flipped = false;
        this.cards.push(removed);
      }

      const newTopEl = this.cardRefs.first?.nativeElement as
        | HTMLElement
        | undefined;
      if (newTopEl) {
        // ensure no leftover from the other direction
        newTopEl.classList.remove('moving-in-left');
        newTopEl.classList.add('moving-in');
        setTimeout(() => {
          newTopEl.classList.remove('moving-in');
          this.isAnimating = false;
        }, this.OUT_MS);
      } else {
        this.isAnimating = false;
      }
    }, this.OUT_MS);
  }

  /** LEFT swipe: fly out left, rotate, then come in from the LEFT */
  shuffleLeft() {
    if (this.cards.length < 2 || this.isAnimating) return;

    const topEl = this.cardRefs.first?.nativeElement as HTMLElement | undefined;
    if (!topEl) return;

    this.isAnimating = true;
    topEl.classList.add('moving-out-left');

    setTimeout(() => {
      topEl.classList.remove('moving-out-left');

      const removed = this.cards.shift();
      if (removed) {
        removed.flipped = false;
        this.cards.push(removed);
      }

      const newTopEl = this.cardRefs.first?.nativeElement as
        | HTMLElement
        | undefined;
      if (newTopEl) {
        // ensure no leftover from the other direction
        newTopEl.classList.remove('moving-in');
        newTopEl.classList.add('moving-in-left');
        setTimeout(() => {
          newTopEl.classList.remove('moving-in-left');
          this.isAnimating = false;
        }, this.OUT_MS);
      } else {
        this.isAnimating = false;
      }
    }, this.OUT_MS);
  }

  trackById: TrackByFunction<CardWithFlip> = (_i, item) => item.id;

  ngOnDestroy(): void {
    this.topGesture?.destroy(); // <-- added cleanup
    this.destroy$.next();
    this.destroy$.complete();
  }
}
