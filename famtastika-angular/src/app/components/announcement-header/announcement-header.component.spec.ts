import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementHeaderComponent } from './announcement-header.component';

describe('AnnouncementHeaderComponent', () => {
  let component: AnnouncementHeaderComponent;
  let fixture: ComponentFixture<AnnouncementHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnouncementHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
