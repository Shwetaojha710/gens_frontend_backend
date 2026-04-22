import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalaryStructureComponent } from './salary-structure.component';

describe('SalaryStructureComponent', () => {
  let component: SalaryStructureComponent;
  let fixture: ComponentFixture<SalaryStructureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalaryStructureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalaryStructureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
