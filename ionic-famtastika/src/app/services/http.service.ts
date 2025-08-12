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
  finalize,
  startWith,
  tap,
  scan,
  Observable,
} from 'rxjs';

export interface Card {
  id: string;
  front: string;
  back: string;
}

@Injectable({ providedIn: 'root' })
export class HttpService {
  fetchImage(imageUrl: any) {
    throw new Error('Method not implemented.');
  }
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

  fetchCardsWithImagesStream(lang: string): Observable<Card[]> {
    if (this.cardsCache.has(lang)) {
      return of(this.cardsCache.get(lang)!);
    }

    let latest: Card[] = [];

    return this.http
      .get<{ cards: Card[] }>(`${this.baseUrl}/${lang}/index.json`)
      .pipe(
        map((res) =>
          res.cards.map(
            (c, i) => ({ ...c, __idx: i } as Card & { __idx: number })
          )
        ),
        switchMap((cardsWithIdx) =>
          from(cardsWithIdx).pipe(
            mergeMap(
              (card) => {
                const front$ = this.http
                  .get(`${this.baseUrl}/${lang}/${card.front}`, {
                    responseType: 'arraybuffer',
                  })
                  .pipe(retry(1));

                const back$ = this.http
                  .get(`${this.baseUrl}/${lang}/${card.back}`, {
                    responseType: 'arraybuffer',
                  })
                  .pipe(retry(1));

                return forkJoin([front$, back$]).pipe(
                  map(
                    ([frontData, backData]) =>
                      ({
                        id: card.id,
                        front: this.arrayBufferToUrl(frontData, 'image/webp'),
                        back: this.arrayBufferToUrl(backData, 'image/webp'),
                        __idx: card.__idx,
                      } as Card & { __idx: number })
                  ),
                  catchError((err) => {
                    console.error(`❌ Failed to load card ${card.id}:`, err);
                    // Skip this one but keep stream flowing
                    return of(
                      null as unknown as (Card & { __idx: number }) | null
                    );
                  })
                );
              },
              2 // concurrency: tweak as needed
            ),
            // Build a sparse array in correct order as results arrive
            scan((acc, next) => {
              if (!next) return acc;
              const arr = acc.slice();
              arr[next.__idx] = {
                id: next.id,
                front: next.front,
                back: next.back,
              } as Card;
              return arr;
            }, [] as (Card | undefined)[]),
            // Collapse holes (failed/not-yet-finished) for a clean emitted list
            map((arr) => arr.filter(Boolean) as Card[]),
            startWith([] as Card[]),
            tap((arr) => {
              latest = arr;
            })
          )
        ),
        finalize(() => {
          // cache the last complete snapshot we saw
          this.cardsCache.set(lang, latest);
        }),
        catchError((err) => {
          console.error('❌ Failed to load index.json:', err);
          return of([] as Card[]);
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
