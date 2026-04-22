import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewerComponent } from './interviewer.component';

describe('InterviewerComponent', () => {
  let component: InterviewerComponent;
  let fixture: ComponentFixture<InterviewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
