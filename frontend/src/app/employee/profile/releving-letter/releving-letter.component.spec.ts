import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelevingLetterComponent } from './releving-letter.component';

describe('RelevingLetterComponent', () => {
  let component: RelevingLetterComponent;
  let fixture: ComponentFixture<RelevingLetterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelevingLetterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelevingLetterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
