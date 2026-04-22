import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratedSalaryComponent } from './generated-salary.component';

describe('GeneratedSalaryComponent', () => {
  let component: GeneratedSalaryComponent;
  let fixture: ComponentFixture<GeneratedSalaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratedSalaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratedSalaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
