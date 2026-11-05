import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { AssetService } from '../../services/asset.service';

/** HR: asset categories; the code prefixes generated asset IDs. */
@Component({
  selector: 'app-as-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './as-categories.component.html',
})
export class AsCategoriesComponent implements OnInit {
  private notyf = new Notyf();
  categories: any[] = [];
  form: any = null;
  saving = false;

  constructor(private api: AssetService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listCategories().subscribe((res: any) => (this.categories = res?.data || []));
  }

  open(c?: any): void {
    this.form = c ? { ...c } : { name: '', code: '', description: '', requiresAcknowledgement: true, status: 'active' };
  }

  save(): void {
    this.saving = true;
    this.api.saveCategory(this.form).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.form = null;
          this.load();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => (this.saving = false),
    });
  }
}
