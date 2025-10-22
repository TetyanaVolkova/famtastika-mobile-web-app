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
  Observable,
  startWith,
  tap,
  scan,
  finalize,
} from 'rxjs';

export interface Card {
  id: string;
  front: string;
  back: string;
}
export interface Catalog {
  basePath: string;
  categories: Array<{
    id: string;
    label: string;
    themes: Array<{ id: string; label: string; decks: DeckSummary[] }>;
    decks: DeckSummary[]; // used when no themes
  }>;
}
export interface DeckSummary {
  id: string;
  label: string;
  languages: string[];
}

export type DeckKey = {
  category: string;
  deck: string;
  lang: string;
  theme?: string; // optional
};

@Injectable({ providedIn: 'root' })
export class HttpService {
  // API that lists structure live (Lambda/Gateway)
  private apiBaseUrl =
    'https://qucprd0kuf.execute-api.us-east-1.amazonaws.com/api/cards';
  // Files are served under the SAME base (proxy to S3). If you use CloudFront instead,
  // set this to your CDN root that maps to /cards (e.g., 'https://cdn.example.com/cards').
  private filesBase = this.apiBaseUrl;

  private cardsCache = new Map<
    string,
    { id: string; front: string; back: string }[]
  >();
  private instructionsCache = new Map<
    string,
    { title: string; description: string }
  >();

  constructor(private http: HttpClient) {}

  // ---------- Catalog (auto-discovery root) ----------
  getCatalog(): Observable<Catalog> {
    // Your Lambda should expose GET /catalog returning { basePath:'cards', categories: [...] }
    return this.http.get<Catalog>(`${this.apiBaseUrl}/catalog.json`).pipe(
      catchError((err) => {
        console.error('❌ Failed to load catalog:', err);
        return of({ basePath: 'cards', categories: [] });
      })
    );
  }

  // ---------- Deck fetching ----------
  fetchCardsWithImages(
    key: DeckKey
  ): Observable<{ id: string; front: string; back: string }[]> {
    const cacheKey = this.cacheKey(key);
    if (this.cardsCache.has(cacheKey))
      return of(this.cardsCache.get(cacheKey)!);

    const indexUrl = this.indexUrl(key);

    return this.http.get<{ cards: Card[] }>(indexUrl).pipe(
      map((res) => res?.cards ?? []),
      switchMap((cards) =>
        from(cards).pipe(
          mergeMap((card) => {
            const front$ = this.http
              .get(this.fileUrl(key, card.front), {
                responseType: 'arraybuffer',
              })
              .pipe(retry(1));
            const back$ = this.http
              .get(this.fileUrl(key, card.back), {
                responseType: 'arraybuffer',
              })
              .pipe(retry(1));

            return forkJoin([front$, back$]).pipe(
              map(([frontData, backData]) => ({
                id: card.id,
                front: this.arrayBufferToUrl(frontData, 'image/webp'),
                back: this.arrayBufferToUrl(backData, 'image/webp'),
              })),
              catchError((err) => {
                console.error(`❌ Failed to load card ${card.id}:`, err);
                return of(null);
              })
            );
          }, 3),
          toArray(),
          map((results) => {
            const valid = results.filter(
              (x): x is { id: string; front: string; back: string } => !!x
            );
            this.cardsCache.set(cacheKey, valid);
            return valid;
          })
        )
      ),
      catchError((err) => {
        console.error('❌ Failed to load index.json:', err);
        return of([]);
      })
    );
  }

  fetchInstructions(
    key: DeckKey
  ): Observable<{ title: string; description: string }> {
    const cacheKey = this.cacheKey(key);
    if (this.instructionsCache.has(cacheKey))
      return of(this.instructionsCache.get(cacheKey)!);

    const url = this.instructionsJsonUrl(key);
    return this.http.get<{ title: string; description: string }>(url).pipe(
      map((data) => {
        this.instructionsCache.set(cacheKey, data);
        return data;
      }),
      catchError((err) => {
        if (err?.status === 404) {
          const empty = { title: '', description: '' };
          this.instructionsCache.set(cacheKey, empty);
          return of(empty);
        }
        console.error('❌ Failed to load instructions:', err);
        return of({ title: '', description: '' });
      })
    );
  }

  // ---------- Helpers ----------
  private cacheKey({ category, theme, deck, lang }: DeckKey): string {
    return [category, theme ?? '', deck, lang].join('::').toLowerCase();
  }

  private deckBasePath({ category, theme, deck, lang }: DeckKey): string {
    // with theme    -> category/theme/deck/lang
    // without theme -> category/deck/lang
    const enc = (s: string) => encodeURIComponent(s);
    return theme
      ? `${enc(category)}/${enc(theme)}/${enc(deck)}/${enc(lang)}`
      : `${enc(category)}/${enc(deck)}/${enc(lang)}`;
  }

  private indexUrl(k: DeckKey): string {
    return `${this.filesBase}/${this.deckBasePath(k)}/index.json`;
  }

  private instructionsJsonUrl(k: DeckKey): string {
    return `${this.filesBase}/${this.deckBasePath(k)}/instructions.json`;
  }

  private fileUrl(k: DeckKey, fileName: string): string {
    return `${this.filesBase}/${this.deckBasePath(k)}/${encodeURIComponent(
      fileName
    )}`;
  }

  private arrayBufferToUrl(buffer: ArrayBuffer, type = 'image/webp'): string {
    const blob = new Blob([buffer], { type });
    return URL.createObjectURL(blob);
  }

  fetchCardsWithImagesStream(lang: string): Observable<Card[]> {
    if (this.cardsCache.has(lang)) {
      return of(this.cardsCache.get(lang)!);
    }

    let latest: Card[] = [];

    return this.http
      .get<{ cards: Card[] }>(`${this.apiBaseUrl}/${lang}/index.json`)
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
                  .get(`${this.apiBaseUrl}/${lang}/${card.front}`, {
                    responseType: 'arraybuffer',
                  })
                  .pipe(retry(1));

                const back$ = this.http
                  .get(`${this.apiBaseUrl}/${lang}/${card.back}`, {
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
}
