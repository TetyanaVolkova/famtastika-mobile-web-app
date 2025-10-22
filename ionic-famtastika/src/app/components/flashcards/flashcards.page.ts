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
  IonItem,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { LanguageService } from '../header/language.service';
import { Router } from '@angular/router';

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

interface Catalog {
  basePath: string;
  categories: Category[];
}

interface Category {
  id: string;
  label: string;
  themes?: Theme[];
  decks?: Deck[];
}

interface Theme {
  id: string;
  label: string;
  decks: Deck[];
}

interface Deck {
  id: string;
  label: string;
  languages: string[];
}

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.page.html',
  styleUrls: ['./flashcards.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonAccordion,
    IonAccordionGroup,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonSpinner,
  ],
})
export class FlashcardsPage implements OnInit, OnDestroy {
  @ViewChildren('cardRef', { read: ElementRef })
  cardRefs!: QueryList<ElementRef>;

  selectedLanguage: 'ru' | 'en' = 'ru';
  catalog: Catalog | null = null;
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  // ✅ Replace with your deployed API Gateway endpoint:
  private catalogUrl =
    'https://qucprd0kuf.execute-api.us-east-1.amazonaws.com/api/cards/catalog.json';

  constructor(
    private http: HttpClient,
    private languageService: LanguageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchCatalog();
  }

  fetchCatalog(): void {
    this.http
      .get<Catalog>(this.catalogUrl)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error('❌ Failed to load catalog:', err);
          this.error = 'Failed to load catalog';
          this.loading = false;
          return of(null);
        })
      )
      .subscribe((catalog) => {
        this.loading = false;
        this.catalog = catalog;
        console.log('📚 Catalog loaded:', catalog);
      });
  }

  openDeck(category: string, theme: string | null, deck: string, lang: string) {
    const path = theme
      ? `/flashcards/${category}/${theme}/${deck}/${lang}`
      : `/flashcards/${category}/${deck}/${lang}`;

    console.log('➡️ Navigating to deck:', path);
    this.router.navigateByUrl(path);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
