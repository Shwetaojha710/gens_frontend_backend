import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewerHeaderComponent } from './interviewer-header.component';

describe('InterviewerHeaderComponent', () => {
  let component: InterviewerHeaderComponent;
  let fixture: ComponentFixture<InterviewerHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewerHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewerHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
