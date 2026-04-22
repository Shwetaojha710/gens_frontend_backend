import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalarySetupComponent } from './salary-setup.component';

describe('SalarySetupComponent', () => {
  let component: SalarySetupComponent;
  let fixture: ComponentFixture<SalarySetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalarySetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalarySetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
