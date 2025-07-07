import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.page.html',
  styleUrls: ['./flashcards.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, CommonModule, FormsModule],
})
export class FlashcardsPage {
  @ViewChildren('cardRef', { read: ElementRef })
  cardRefs!: QueryList<ElementRef>;

  cards = [
    {
      front: 'assets/img/1-front.png',
      back: 'assets/img/1-back.png',
      flipped: false,
    },
    {
      front: 'assets/img/2-front.png',
      back: 'assets/img/2-back.png',
      flipped: false,
    },
    {
      front: 'assets/img/3-front.png',
      back: 'assets/img/3-back.png',
      flipped: false,
    },
  ];

  toggleFlip(index: number) {
    this.cards[index].flipped = !this.cards[index].flipped;
  }

  shuffle() {
    const cardEls = this.cardRefs.toArray();
    const topCardEl = cardEls[0]?.nativeElement;
    if (!topCardEl) return;

    topCardEl.classList.add('moving-out');

    setTimeout(() => {
      topCardEl.classList.remove('moving-out');

      // Move the top card to the end
      const removed = this.cards.shift();
      if (removed) {
        removed.flipped = false;
        this.cards.push(removed);
      }

      // Animate the new top card in
      const newTopEl = this.cardRefs.first?.nativeElement;
      if (newTopEl) {
        newTopEl.classList.add('moving-in');
        setTimeout(() => {
          newTopEl.classList.remove('moving-in');
        }, 400);
      }
    }, 400);
  }
}
