import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobRequirementComponent } from './job-requirement.component';

describe('JobRequirementComponent', () => {
  let component: JobRequirementComponent;
  let fixture: ComponentFixture<JobRequirementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobRequirementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobRequirementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
