import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import * as bootstrap from 'bootstrap';
import { MasterService } from '../../services/master.service';

@Component({
  selector: 'app-handbook',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './handbook.component.html',
  styleUrl: './handbook.component.css',
})
export class HandbookComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  currentUrl: string | null = null;
  selectedFile: File | null = null;
  loading = false;
  saving = false;
  private notyf = new Notyf();

  constructor(private master: MasterService) {}

  ngOnInit(): void {
    this.loading = true;
    this.master.getHandbook().subscribe({
      next: (res: any) => {
        this.currentUrl = res?.data?.url || null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openUploadModal(): void {
    const el = document.getElementById('uploadHandbookModal');
    if (el) bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeUploadModal(): void {
    const el = document.getElementById('uploadHandbookModal');
    if (el) bootstrap.Modal.getInstance(el)?.hide();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.notyf.error('Only PDF files are allowed.');
      return;
    }
    this.selectedFile = file;
  }

  clearFile(): void {
    this.selectedFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  save(): void {
    if (!this.selectedFile) {
      this.notyf.error('Please select a PDF file first.');
      return;
    }
    this.saving = true;
    this.master.uploadHandbook(this.selectedFile).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status) {
          this.currentUrl = res.data?.url || this.currentUrl;
          this.clearFile();
          this.notyf.success('Handbook uploaded successfully.');
          this.closeUploadModal();
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
}
