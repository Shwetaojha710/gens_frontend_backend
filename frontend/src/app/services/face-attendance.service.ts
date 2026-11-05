import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FaceAttendanceService {
  private readonly base = `${environment.apiUrl}ai-face/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  health(): Observable<any> {
    return this.post('health');
  }

  dashboard(): Observable<any> {
    return this.post('dashboard');
  }

  enrolledList(): Observable<any> {
    return this.post('enrolled-list');
  }

  getEmployeeFaces(employeeId: string): Observable<any> {
    return this.http.get(`${this.base}employee/${employeeId}`);
  }

  enroll(employeeId: string, files: File[], replace = true): Observable<any> {
    const fd = new FormData();
    fd.append('replace', String(replace));
    fd.append('sourceType', 'upload');
    for (const f of files) {
      fd.append('files', f, f.name);
    }
    return this.http.post(`${this.base}enroll/${employeeId}`, fd);
  }

  deactivate(employeeId: string): Observable<any> {
    return this.post(`employee/${employeeId}/deactivate`);
  }

  listCameras(): Observable<any> {
    return this.post('cameras/list');
  }

  createCamera(data: any): Observable<any> {
    return this.post('cameras', data);
  }

  updateCamera(id: string, data: any): Observable<any> {
    return this.post(`cameras/${id}/update`, data);
  }

  deleteCamera(id: string): Observable<any> {
    return this.post(`cameras/${id}/delete`);
  }

  testCamera(id: string): Observable<any> {
    return this.post(`cameras/${id}/test`);
  }

  /** Open persistent RTSP preview session (smooth stream). */
  previewStart(
    id: string,
    opts: { max_width?: number; jpeg_quality?: number; target_fps?: number } = {},
  ): Observable<any> {
    return this.post(`cameras/${id}/preview/start`, {
      max_width: 720,
      jpeg_quality: 60,
      target_fps: 8,
      ...opts,
    });
  }

  /** Latest JPEG from open preview session (fast poll). */
  previewCamera(id: string, opts: { max_width?: number; jpeg_quality?: number } = {}): Observable<any> {
    return this.post(`cameras/${id}/preview`, opts);
  }

  previewStop(id: string): Observable<any> {
    return this.post(`cameras/${id}/preview/stop`);
  }

  startCamera(id: string): Observable<any> {
    return this.post(`cameras/${id}/start`);
  }

  stopCamera(id: string): Observable<any> {
    return this.post(`cameras/${id}/stop`);
  }

  recognitionLogs(filters: any = {}): Observable<any> {
    return this.post('recognition-logs', filters);
  }

  unknownFaces(): Observable<any> {
    return this.post('unknown-faces');
  }

  getConfig(): Observable<any> {
    return this.post('config');
  }

  updateConfig(data: any): Observable<any> {
    return this.post('config/update', data);
  }
}
