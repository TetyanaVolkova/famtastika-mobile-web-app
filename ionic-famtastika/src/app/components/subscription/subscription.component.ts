import { Component, OnInit } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonCol,
  IonGrid,
  IonItem,
  IonLabel,
  IonRow,
  IonSegmentButton,
  IonSegment,
  IonText,
  IonChip,
  IonList,
  IonIcon,
  IonSegmentView,
  IonSegmentContent,
} from '@ionic/angular/standalone';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss'],
  imports: [
    IonChip,
    IonText,
    IonSegmentButton,
    CommonModule,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonAvatar,
    IonItem,
    IonLabel,
    IonSegment,
    FormsModule,
    IonList,
    IonIcon,
    IonSegmentView,
    IonSegmentContent,
  ],
})
export class SubscriptionComponent implements OnInit {
  subscribedAt = '2025';

  constructor(public authService: AuthService) {
    addIcons({
      checkmarkCircleOutline,
    });
  }

  ngOnInit() {}

  signOut() {
    this.authService.signOut$().subscribe({
      next: () => {
        console.log('Signed out successfully');
      },
      error: (e) => console.error(e),
    });
  }

  subscribe(): void {
    // Logic to handle subscription
    console.log('Subscription logic goes here');
  }
}
