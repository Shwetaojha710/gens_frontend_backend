import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreffixComponent } from './preffix.component';

describe('PreffixComponent', () => {
  let component: PreffixComponent;
  let fixture: ComponentFixture<PreffixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreffixComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreffixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
