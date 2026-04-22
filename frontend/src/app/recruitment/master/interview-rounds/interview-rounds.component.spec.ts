import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewRoundsComponent } from './interview-rounds.component';

describe('InterviewRoundsComponent', () => {
  let component: InterviewRoundsComponent;
  let fixture: ComponentFixture<InterviewRoundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewRoundsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewRoundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
