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
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
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
export class FlashcardsPage implements OnInit, OnDestroy, AfterViewInit {
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
  // =========================

  constructor(
    private http: HttpService,
    private languageService: LanguageService,
    private ngZone: NgZone // <-- added
  ) {}

  ngOnInit() {
    this.lang$ = this.languageService.getLanguage().pipe(shareReplay(1));

    this.lang$
      .pipe(
        switchMap((lang) => this.http.fetchCardsWithImagesStream(lang)),
        // add flipped flag here for the UI
        map((cards) => {
          return cards.map((card) => ({ ...card, flipped: false }));
        }),
        shareReplay(1),
        takeUntil(this.destroy$)
      )
      .subscribe((cards) => {
        this.cards = cards;
      });

    this.instructions$ = this.lang$.pipe(
      switchMap((lang) => this.http.fetchInstructions(lang)),
      catchError(() => of(null)),
      shareReplay(1)
    );
  }

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
        startX = ev.currentX;
      },
      onMove: (_ev: any) => {
        // Keeping visuals driven by your existing CSS classes (.moving-out/.moving-in)
        // If you want the card to follow the finger, we can add transform here later.
      },
      onEnd: (ev: any) => {
        const dx = ev.currentX - startX;
        const swipedRight = dx > this.swipeThreshold || ev.velocityX > 0.35;

        if (swipedRight) {
          // Call your existing animation + reorder
          this.ngZone.run(() => this.shuffle());

          // Reattach to new top after DOM updates
          setTimeout(() => this.attachTopCardGesture(), 10);
        }
        // else: do nothing; your (click) still flips
      },
    });

    this.topGesture.enable(true);
  }
  // ================================================

  // flip by index (immutably)
  toggleFlip(i: number) {
    this.cards = this.cards.map((c, idx) =>
      idx === i ? { ...c, flipped: !c.flipped } : c
    );
  }

  shuffle() {
    const cardEls = this.cardRefs.toArray();
    const topCardEl = cardEls[0]?.nativeElement;
    if (!topCardEl) return;

    topCardEl.classList.add('moving-out');

    setTimeout(() => {
      topCardEl.classList.remove('moving-out');

      const removed = this.cards.shift();
      if (removed) {
        removed.flipped = false;
        this.cards.push(removed);
      }

      const newTopEl = this.cardRefs.first?.nativeElement;
      if (newTopEl) {
        newTopEl.classList.add('moving-in');
        setTimeout(() => {
          newTopEl.classList.remove('moving-in');
        }, 400);
      }
    }, 400);
  }

  trackById: TrackByFunction<CardWithFlip> = (_i, item) => item.id;

  ngOnDestroy(): void {
    this.topGesture?.destroy(); // <-- added cleanup
    this.destroy$.next();
    this.destroy$.complete();
  }
}
