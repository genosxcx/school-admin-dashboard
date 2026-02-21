import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentFormDialog } from './student-form-dialog';

describe('StudentFormDialog', () => {
  let component: StudentFormDialog;
  let fixture: ComponentFixture<StudentFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
