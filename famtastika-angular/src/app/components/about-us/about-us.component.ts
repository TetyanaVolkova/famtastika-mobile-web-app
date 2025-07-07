import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CarouselComponent,
  CarouselControlComponent,
  CarouselInnerComponent,
  CarouselItemComponent,
  CarouselCaptionComponent,
  CarouselIndicatorsComponent,
} from '@coreui/angular';

@Component({
  selector: 'app-about-us',
  imports: [
    CarouselComponent,
    CarouselIndicatorsComponent,
    CarouselInnerComponent,
    CarouselItemComponent,
    CarouselCaptionComponent,
    CarouselControlComponent,
    RouterLink,
  ],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.scss',
})
export class AboutUsComponent implements OnInit {
  slides: any[] = new Array(3).fill({
    id: -1,
    src: '',
    title: '',
    subtitle: '',
  });

  ngOnInit(): void {
    this.slides[0] = {
      id: 0,
      src: 'images/carousel.png',
      title: 'First slide',
      subtitle: 'This is first slide.',
    };
    this.slides[1] = {
      id: 1,
      src: 'images/Rectangle 31.png',
      title: 'Second slide',
      subtitle: 'This is second slide.',
    };
    this.slides[2] = {
      id: 2,
      src: 'images/logo.png',
      title: 'Third slide',
      subtitle: 'This is third slide.',
    };
  }
}
