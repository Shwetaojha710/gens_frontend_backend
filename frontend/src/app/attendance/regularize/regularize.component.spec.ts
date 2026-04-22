import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegularizeComponent } from './regularize.component';

describe('RegularizeComponent', () => {
  let component: RegularizeComponent;
  let fixture: ComponentFixture<RegularizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegularizeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegularizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
