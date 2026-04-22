import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewerDashbaordComponent } from './interviewer-dashbaord.component';

describe('InterviewerDashbaordComponent', () => {
  let component: InterviewerDashbaordComponent;
  let fixture: ComponentFixture<InterviewerDashbaordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewerDashbaordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewerDashbaordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
