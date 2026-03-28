import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentRegister } from './parent-register';

describe('ParentRegister', () => {
  let component: ParentRegister;
  let fixture: ComponentFixture<ParentRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
