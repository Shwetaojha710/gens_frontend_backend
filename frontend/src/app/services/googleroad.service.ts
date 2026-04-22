import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class GoogleroadService {



  private API_KEY = 'AIzaSyBwtSJE7vWBwUdGb5Kt_FXBrJgWYUCUX-Y';
  private BASE_URL = 'https://roads.googleapis.com/v1/snapToRoads';

  constructor(private http: HttpClient) {}

  snapToRoad(coordinates: { latitude: number; longitude: number }[]) {
    const path = coordinates
      .map(p => `${p.latitude},${p.longitude}`)
      .join('|');

    const params = new HttpParams()
      .set('path', path)
      .set('interpolate', 'true')
      .set('key', this.API_KEY);

    return this.http.get<any>(this.BASE_URL, { params }).pipe(
      map(res =>
        res.snappedPoints.map((p:any) => ({
          latitude: p.location.latitude,
          longitude: p.location.longitude
        }))
      )
    );
  }
}
