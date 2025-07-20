// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { forkJoin, map, of, switchMap, catchError } from 'rxjs';

// export interface Card {
//   id: string;
//   front: string;
//   back: string;
// }

// @Injectable({ providedIn: 'root' })
// export class HttpService {
//   private baseUrl =
//     'https://evoecyur01.execute-api.us-east-1.amazonaws.com/api/cards';

//   constructor(private http: HttpClient) {}

//   fetchCardsWithImages(lang: string) {
//     return this.http
//       .get<{ cards: Card[] }>(`${this.baseUrl}/${lang}/index.json`)
//       .pipe(
//         map((res) => res.cards),
//         switchMap((cards) => {
//           const requests = cards.map((card) => {
//             const front$ = this.http.get(
//               `${this.baseUrl}/${lang}/${card.front}`,
//               {
//                 responseType: 'arraybuffer',
//               }
//             );
//             const back$ = this.http.get(
//               `${this.baseUrl}/${lang}/${card.back}`,
//               {
//                 responseType: 'arraybuffer',
//               }
//             );

//             return forkJoin([front$, back$]).pipe(
//               map(([frontData, backData]) => ({
//                 id: card.id,
//                 front: this.arrayBufferToUrl(frontData, 'image/webp'),
//                 back: this.arrayBufferToUrl(backData, 'image/webp'),
//               })),
//               catchError((err) => {
//                 console.error(`❌ Failed to load card ${card.id}:`, err);
//                 return of(null);
//               })
//             );
//           });

//           return forkJoin(requests).pipe(
//             map((results) => results.filter((card) => card !== null))
//           );
//         }),
//         catchError((err) => {
//           console.error('❌ Failed to load index.json:', err);
//           return of([]);
//         })
//       );
//   }

//   fetchInstructions(lang: string) {
//     return this.http
//       .get<{ title: string; description: string }>(
//         `${this.baseUrl}/${lang}/instructions.json`
//       )
//       .pipe(
//         catchError((err) => {
//           console.error('❌ Failed to load instructions:', err);
//           return of({ title: '', description: '' }); // Optional: empty fallback
//         })
//       );
//   }

//   private arrayBufferToUrl(
//     buffer: ArrayBuffer,
//     type: string = 'image/webp'
//   ): string {
//     const blob = new Blob([buffer], { type });
//     return URL.createObjectURL(blob);
//   }
// }

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  forkJoin,
  from,
  map,
  mergeMap,
  of,
  retry,
  switchMap,
  take,
  toArray,
} from 'rxjs';

export interface Card {
  id: string;
  front: string;
  back: string;
}

@Injectable({ providedIn: 'root' })
export class HttpService {
  private baseUrl =
    'https://evoecyur01.execute-api.us-east-1.amazonaws.com/api/cards';

  constructor(private http: HttpClient) {}

  fetchCardsWithImages(lang: string) {
    return this.http
      .get<{ cards: Card[] }>(`${this.baseUrl}/${lang}/index.json`)
      .pipe(
        map((res) => res.cards),
        switchMap((cards) =>
          from(cards).pipe(
            mergeMap(
              (card) => {
                const front$ = this.http.get(
                  `${this.baseUrl}/${lang}/${card.front}`,
                  { responseType: 'arraybuffer' }
                );
                const back$ = this.http.get(
                  `${this.baseUrl}/${lang}/${card.back}`,
                  { responseType: 'arraybuffer' }
                );

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
              5 // 🔥 Limit to 5 concurrent image loads
            ),
            toArray(),
            map((cards) => cards.filter((c) => c !== null))
          )
        ),
        catchError((err) => {
          console.error('❌ Failed to load index.json:', err);
          return of([]);
        })
      );
  }

  fetchInstructions(lang: string) {
    return this.http
      .get<{ title: string; description: string }>(
        `${this.baseUrl}/${lang}/instructions.json`
      )
      .pipe(
        retry({ count: 3, delay: 1000 }),
        catchError((err) => {
          console.error('❌ Failed to load instructions:', err);
          return of({ title: '', description: '' });
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
