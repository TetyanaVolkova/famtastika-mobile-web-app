import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  forkJoin,
  map,
  of,
  switchMap,
  catchError,
  toArray,
  retry,
  mergeMap,
  from,
} from 'rxjs';

export interface Card {
  id: string;
  front: string;
  back: string;
}

@Injectable({ providedIn: 'root' })
export class HttpService {
  private baseUrl =
    // 'https://evoecyur01.execute-api.us-east-1.amazonaws.com/api/cards';
    'https://qucprd0kuf.execute-api.us-east-1.amazonaws.com/api/cards';

  private cardsCache = new Map<
    string,
    { id: string; front: string; back: string }[]
  >();
  private instructionsCache = new Map<
    string,
    { title: string; description: string }
  >();

  constructor(private http: HttpClient) {}

  fetchCardsWithImages(lang: string) {
    if (this.cardsCache.has(lang)) {
      return of(this.cardsCache.get(lang)!);
    }

    return this.http
      .get<{ cards: Card[] }>(`${this.baseUrl}/${lang}/index.json`)
      .pipe(
        map((res) => res.cards),
        switchMap((cards) =>
          from(cards).pipe(
            mergeMap(
              (card) => {
                const front$ = this.http
                  .get(`${this.baseUrl}/${lang}/${card.front}`, {
                    responseType: 'arraybuffer',
                  })
                  .pipe(retry(1)); // optional retry

                const back$ = this.http
                  .get(`${this.baseUrl}/${lang}/${card.back}`, {
                    responseType: 'arraybuffer',
                  })
                  .pipe(retry(1)); // optional retry

                return forkJoin([front$, back$]).pipe(
                  map(([frontData, backData]) => ({
                    id: card.id,
                    front: this.arrayBufferToUrl(frontData, 'image/webp'),
                    back: this.arrayBufferToUrl(backData, 'image/webp'),
                  })),
                  catchError((err) => {
                    console.error(`❌ Failed to load card ${card.id}:`, err);
                    return of(null); // skip failed card
                  })
                );
              },
              2 // ⬅️ adjust this number for concurrency (2-3 is safe)
            ),
            toArray(), // collect results into an array
            map((cards) => {
              const validCards = cards.filter((c) => c !== null);
              this.cardsCache.set(lang, validCards as Card[]);
              return validCards;
            })
          )
        ),
        catchError((err) => {
          console.error('❌ Failed to load index.json:', err);
          return of([]);
        })
      );
  }

  fetchInstructions(lang: string) {
    if (this.instructionsCache.has(lang)) {
      return of(this.instructionsCache.get(lang)!);
    }

    return this.http
      .get<{ title: string; description: string }>(
        `${this.baseUrl}/${lang}/instructions.json`
      )
      .pipe(
        map((data) => {
          this.instructionsCache.set(lang, data);
          return data;
        }),
        catchError((err) => {
          console.error('❌ Failed to load instructions:', err);
          return of({ title: '', description: '' }); // Optional: empty fallback
        })
      );
  }

  private arrayBufferToUrl(
    buffer: ArrayBuffer,
    type: string = 'image/webp'
  ): string {
    const blob = new Blob([buffer], { type });
    return URL.createObjectURL(blob);
  }
}
