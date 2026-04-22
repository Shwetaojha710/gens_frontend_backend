import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BgvTrackerComponent } from './bgv-tracker.component';

describe('BgvTrackerComponent', () => {
  let component: BgvTrackerComponent;
  let fixture: ComponentFixture<BgvTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BgvTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BgvTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
