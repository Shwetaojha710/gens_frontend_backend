import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoundTypeComponent } from './round-type.component';

describe('RoundTypeComponent', () => {
  let component: RoundTypeComponent;
  let fixture: ComponentFixture<RoundTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoundTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoundTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
