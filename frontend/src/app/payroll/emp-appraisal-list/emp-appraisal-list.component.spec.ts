import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpAppraisalListComponent } from './emp-appraisal-list.component';

describe('EmpAppraisalListComponent', () => {
  let component: EmpAppraisalListComponent;
  let fixture: ComponentFixture<EmpAppraisalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpAppraisalListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpAppraisalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
