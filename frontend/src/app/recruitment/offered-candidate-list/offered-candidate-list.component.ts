import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { JobService } from '../../services/job.service';
import { StatusService } from '../../services/status.service';
import { CandidateApplicationRecord } from '../recruitment.models';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

@Component({
  selector: 'app-offered-candidate-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './offered-candidate-list.component.html',
  styleUrls: ['./offered-candidate-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfferedCandidateListComponent implements OnInit {
  offeredApplications: CandidateApplicationRecord[] = [];
  displayApps: CandidateApplicationRecord[] = [];

  isLoading = false;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  notyf = new Notyf();

  constructor(
    private jobService: JobService,
    private statusService: StatusService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.jobService.getCandidatePipeline({}).subscribe({
      next: (res) => {
        const status = this.statusService.handleResponseStatus(res.status, 'OK');
        if (status === true) {
          // Only keep offered stage
          this.offeredApplications = (res.data || []).filter(a => a.stage === 'offered');
          this.applyFilter();
        } else if (status === 'expired') {
          this.router.navigate(['/login']);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.applyFilter();
  }

  private applyFilter(): void {
    let data = [...this.offeredApplications];

    if (this.searchTerm) {
      data = data.filter(a =>
        `${a.name} ${a.email} ${a.phone} ${a.job_title} ${a.department || ''}`.toLowerCase()
          .includes(this.searchTerm)
      );
    }

    this.totalItems = data.length;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayApps = data.slice(start, start + this.itemsPerPage);
    this.cdr.markForCheck();
  }
}
