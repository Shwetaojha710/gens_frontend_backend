import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LocationService {

  private baseUrl = environment.apiUrl || 'http://192.168.23.11:3001/api/';
  private API_KEY = 'AIzaSyBwtSJE7vWBwUdGb5Kt_FXBrJgWYUCUX-Y';
  // private BASE_URL = 'https://roads.googleapis.com/v1/snapToRoads';

  constructor(private http: HttpClient) { }

  getLatestLocations(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}track-location-history`, obj);
  }
  getLiveLatestLocations(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}track-live-location-history`, obj);
  }

  getActiveTrackingUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}active-location-emp`);
  }
  snapToRoads(points: { latitude: number; longitude: number }[])
    : Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}snap-to-roads`, { points });
    // return this.http.post<any[]>(
    //   '/api/snap-to-roads',   // 👈 backend endpoint
    //   { points }
    // );
  }
  //   getAddressFromCoords(lat: number, lng: number) {
  //   return this.http.get<any>(
  //     `https://maps.googleapis.com/maps/api/geocode/json`,
  //     {
  //       params: {
  //         format: 'json',
  //         lat,
  //         lon: lng
  //       }
  //     }
  //   );
  // }
  async getAddressFromCoords(lat: any, lng: any): Promise<any> {
    try {
      const GOOGLE_API_KEY = this.API_KEY; // 🔐 move key to env
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.results.length) return null;

      const result = data.results[0];
      const components = result.address_components;

      const getComponent = (type: any) =>
        components.find((c: any) => c.types.includes(type))?.long_name || "";

      return {
        address: result.formatted_address,     // 📍 Google full address
        street: `${getComponent("street_number")} ${getComponent("route")}`.trim(),
        area: getComponent("sublocality") || getComponent("neighborhood"),
        city: getComponent("locality") || getComponent("administrative_area_level_2"),
        state: getComponent("administrative_area_level_1"),
        pincode: getComponent("postal_code"),
        country: getComponent("country"),
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };

    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
  };


  // getAddressFromGlobalVTS(lat: number, lng: number): Observable<any> {
  //   return this.http.get<any>(
  //     `https://maps.googleapis.com/maps/api/geocode/json/${lat}/${lng}`
  //   );
  // }


  async getAddressFromGlobalVTS(lat: any, lng: any): Promise<any> {
    try {
      const GOOGLE_API_KEY = this.API_KEY; // 🔐 move key to env
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.results.length) return null;

      const result = data.results[0];
      const components = result.address_components;

      const getComponent = (type: any) =>
        components.find((c: any) => c.types.includes(type))?.long_name || "";

      return {
        address: result.formatted_address,     // 📍 Google full address
        street: `${getComponent("street_number")} ${getComponent("route")}`.trim(),
        area: getComponent("sublocality") || getComponent("neighborhood"),
        city: getComponent("locality") || getComponent("administrative_area_level_2"),
        state: getComponent("administrative_area_level_1"),
        pincode: getComponent("postal_code"),
        country: getComponent("country"),
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };

    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
  };
//   getVisitReport(payload:any){
//   return this.http.post(
//     this.baseUrl + "tracking/visit-report",
//     payload
//   )
// }

  getVisitReport(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}visit-report`, obj);
  }
  VisitPlaceDD(): Observable<any> {
    return this.http.get(`${this.baseUrl}getVisitPlaceDD`, {});
  }
}
