import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentFormDialog } from './assignment-form-dialog';

describe('AssignmentFormDialog', () => {
  let component: AssignmentFormDialog;
  let fixture: ComponentFixture<AssignmentFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignmentFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
