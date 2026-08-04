import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';

@Component({
  selector: 'app-letterhead',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letterhead.component.html',
  styleUrl: './letterhead.component.css',
})
export class LetterheadComponent implements OnInit {
  currentUrl: string | null = null;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  loading = false;
  saving = false;
  private notyf = new Notyf();

  constructor(private master: MasterService) {}

  ngOnInit(): void {
    this.loading = true;
    this.master.getLetterhead().subscribe({
      next: (res: any) => {
        this.currentUrl = res?.data?.url || null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notyf.error('Only image files are allowed (PNG, JPG, etc.)');
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (!this.selectedFile) {
      this.notyf.error('Please select an image first.');
      return;
    }
    this.saving = true;
    this.master.uploadLetterhead(this.selectedFile).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status) {
          this.currentUrl = res.data?.url || this.previewUrl;
          this.previewUrl = null;
          this.selectedFile = null;
          this.notyf.success('Letterhead saved successfully.');
        } else {
          this.notyf.error(res?.message || 'Upload failed.');
        }
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Failed to upload. Please try again.');
      }
    });
  }

  remove(): void {
    this.previewUrl = null;
    this.selectedFile = null;
  }
}
