import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-flashcard',
  templateUrl: './flashcard.page.html',
  styleUrls: ['./flashcard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class FlashcardPage implements OnInit {
  ngOnInit() {}
}
