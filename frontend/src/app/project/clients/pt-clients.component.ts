import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { ProjectService } from '../../services/project.service';

/** HR: client master for projects. */
@Component({
  selector: 'app-pt-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pt-clients.component.html',
})
export class PtClientsComponent implements OnInit {
  private notyf = new Notyf();
  clients: any[] = [];
  search = '';
  form: any = null;
  saving = false;

  constructor(private api: ProjectService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listClients().subscribe((res: any) => (this.clients = res?.data || []));
  }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.clients.filter((c) => [c.name, c.code, c.contactName, c.email].some((v) => String(v || '').toLowerCase().includes(q))) : this.clients;
  }

  open(c?: any): void {
    this.form = c ? { ...c } : { name: '', code: '', contactName: '', email: '', phone: '', gstin: '', address: '', status: 'active' };
  }

  save(): void {
    this.saving = true;
    this.api.saveClient(this.form).subscribe({
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
