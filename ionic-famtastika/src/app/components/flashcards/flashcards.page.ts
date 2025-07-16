import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
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
import { forkJoin, Subject, switchMap, takeUntil } from 'rxjs';
import { HighlightDirective } from 'src/app/directives/highlight.directive';
import { LanguageService } from '../header/language.service';

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
    HighlightDirective,
  ],
})
export class FlashcardsPage implements OnInit, OnDestroy {
  @ViewChildren('cardRef', { read: ElementRef })
  cardRefs!: QueryList<ElementRef>;

  selectedLanguage: 'ru' | 'en' = 'en';
  instructions!: { title: string; description: string };

  cards: { front: string; back: string; flipped: boolean }[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpService,
    private languageService: LanguageService
  ) {}

  ngOnInit() {
    this.languageService
      .getLanguage()
      .pipe(
        switchMap((lang) =>
          forkJoin({
            cards: this.http.fetchCardsWithImages(lang),
            instructions: this.http.fetchInstructions(lang),
          })
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(({ cards, instructions }) => {
        this.cards = cards.map((card) => ({ ...card, flipped: false }));
        this.instructions = instructions;
      });
  }

  toggleFlip(index: number) {
    this.cards[index].flipped = !this.cards[index].flipped;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
