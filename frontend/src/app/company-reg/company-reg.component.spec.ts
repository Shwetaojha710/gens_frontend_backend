import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyRegComponent } from './company-reg.component';

describe('CompanyRegComponent', () => {
  let component: CompanyRegComponent;
  let fixture: ComponentFixture<CompanyRegComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyRegComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyRegComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
