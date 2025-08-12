import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  TrackByFunction,
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
export class FlashcardsPage implements OnInit, OnDestroy {
  @ViewChildren('cardRef', { read: ElementRef })
  cardRefs!: QueryList<ElementRef>;

  selectedLanguage: 'ru' | 'en' = 'en';

  lang$!: Observable<string>;
  instructions$!: Observable<Instructions | null>;
  cards: CardWithFlip[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpService,
    private languageService: LanguageService
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

  // flip by index (immutably)
  toggleFlip(i: number) {
    this.cards = this.cards.map((c, idx) =>
      idx === i ? { ...c, flipped: !c.flipped } : c
    );
  }

  shuffle() {
    console.log(
      'Card flip state before shuffle:',
      this.cards.map((c) => c.flipped)
    );

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
    console.log(
      'Card flip state before shuffle:',
      this.cards.map((c) => c.flipped)
    );
  }

  trackById: TrackByFunction<CardWithFlip> = (_i, item) => item.id;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
