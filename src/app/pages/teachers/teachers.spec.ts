import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Teachers } from './teachers';

describe('Teachers', () => {
  let component: Teachers;
  let fixture: ComponentFixture<Teachers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teachers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Teachers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
 