import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewerNavbarComponent } from './interviewer-navbar.component';

describe('InterviewerNavbarComponent', () => {
  let component: InterviewerNavbarComponent;
  let fixture: ComponentFixture<InterviewerNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewerNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewerNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
