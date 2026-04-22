import {
  Component, OnInit, OnDestroy, NgZone, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, Input
} from '@angular/core';
import * as L from 'leaflet';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { LocationService } from '../../services/location.service';
import { MasterService } from '../../services/master.service';
// import { LocationService } from '../services/location.service';
// import { MasterService }   from '../services/master.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEG2RAD = Math.PI / 180;
const EARTH_R  = 6371000;
const LIVE_INTERVAL_MS = 15_000;   // refresh every 15 s
const MAX_TRAIL_POINTS = 120;       // keep last 120 cleaned points in trail
const JUNK_ACCURACY_M  = 200;       // drop readings worse than this
const JUNK_JUMP_M      = 3000;      // drop if > 3 km jump in < 30 s

export interface LivePoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
  address?: string | null;
}

@Component({
  selector: 'app-live-tracking',
  templateUrl: './live-tracking.component.html',
  styleUrls: ['./live-tracking.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class LiveTrackingComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() user: any = null;   // Employee object passed from parent
  @Input() themeMode: 'dark' | 'light' = 'dark';

  // ── Map ───────────────────────────────────────────────────────────────────
  private map!: L.Map;
  private tileLayer!: L.TileLayer;
  private liveMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;
  private trailLine: L.Polyline | null = null;
  private pulseMarker: L.CircleMarker | null = null;
  private trailPoints: L.LatLngTuple[] = [];

  mapType: string = 'osm';
  private mapReady = false;

  // ── State ─────────────────────────────────────────────────────────────────
  isLive       = false;
  isLoading    = false;
  hasData      = false;
  errorMsg     = '';

  currentPoint: LivePoint | null = null;
  lastUpdated:  Date | null = null;

  // Statistics
  totalDistanceM    = 0;
  topSpeedKmh       = 0;
  avgSpeedKmh       = 0;
  currentSpeedKmh   = 0;
  currentAccuracyM  = 0;
  batteryLevel: number | null = null;

  // Address
  currentAddress    = '';
  addressLoading    = false;

  private interval: any = null;
  private prevPoint: LivePoint | null = null;
  private speedSamples: number[] = [];
  private readonly _addrCache = new Map<string, string>();

  // ── Pre-built formatters ──────────────────────────────────────────────────
  private readonly _timeFmt = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private locationService: LocationService,
    private master: MasterService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Init map as soon as the DOM is rendered so it's ready when user clicks Go Live
    setTimeout(() => this.initMap(), 50);
  }

  ngOnDestroy(): void {
    this.stopLive();
    if (this.map) this.map.remove();
  }

  // ─── Map Init ─────────────────────────────────────────────────────────────

  initMap(): void {
    if (this.mapReady || !document.getElementById('live-map')) return;

    this.map = L.map('live-map', {
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: false,
      zoomControl: false,
      maxZoom: 19, minZoom: 2
    }).setView([26.8687, 81.0066], 15);

    this.addTileLayer('osm');
    this.addZoomControl();

    this.ngZone.runOutsideAngular(() => {
      this.map.on('click', () => {});
    });

    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  addTileLayer(type: string): void {
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    const T: Record<string, [string, string]> = {
      osm:       ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                              '© OpenStreetMap'],
      satellite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',   '© Esri'],
      dark:      ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                   '© CARTO'],
      streets:   ['https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',                                           '© HOT']
    };
    const [url, attr] = T[type] || T['osm'];
    this.tileLayer = L.tileLayer(url, { attribution: attr, keepBuffer: 4 }).addTo(this.map);
    this.mapType = type;
  }

  addZoomControl(): void {
    const self = this;
    const ZC = L.Control.extend({
      onAdd() {
        const c = L.DomUtil.create('div', 'leaflet-bar leaflet-control lv-zoom');
        const zi = L.DomUtil.create('a', 'lv-zoom-in', c);  zi.href = '#'; zi.innerHTML = '<i class="fas fa-plus"></i>';
        const zo = L.DomUtil.create('a', 'lv-zoom-out', c); zo.href = '#'; zo.innerHTML = '<i class="fas fa-minus"></i>';
        L.DomEvent.disableClickPropagation(c);
        L.DomEvent.on(zi, 'click', (e) => { L.DomEvent.preventDefault(e); self.map?.zoomIn(); });
        L.DomEvent.on(zo, 'click', (e) => { L.DomEvent.preventDefault(e); self.map?.zoomOut(); });
        return c;
      }, onRemove() {}
    });
    new ZC({ position: 'bottomright' }).addTo(this.map);
  }

  changeMapType(type: string): void {
    this.addTileLayer(type);
  }

  // ─── Live Controls ────────────────────────────────────────────────────────

  startLive(): void {
    if (!this.user) return;
    if (!this.mapReady) {
      setTimeout(() => { this.initMap(); this.startLive(); }, 100);
      return;
    }
    this.isLive = true;
    this.errorMsg = '';
    this.cdr.markForCheck();
    this.fetchLatestLocation();
    this.interval = setInterval(() => this.fetchLatestLocation(), LIVE_INTERVAL_MS);
  }

  stopLive(): void {
    this.isLive = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.cdr.markForCheck();
  }

  toggleLive(): void {
    this.isLive ? this.stopLive() : this.startLive();
  }

  recenter(): void {
    if (this.currentPoint && this.map) {
      this.ngZone.runOutsideAngular(() => {
        this.map.setView([this.currentPoint!.lat, this.currentPoint!.lng], 17, { animate: true });
      });
    }
  }

  // ─── Fetch & Process ─────────────────────────────────────────────────────

  fetchLatestLocation(): void {
    if (!this.user) return;
    this.isLoading = true;
    this.cdr.markForCheck();

    const payload = { employeeId: this.user.id };

    this.locationService.getLatestLocations(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res?.data?.length) {
          this.errorMsg = 'No location data available for this employee.';
          this.cdr.markForCheck();
          return;
        }
        this.errorMsg = '';

        // Sort and clean
        const sorted = res.data.sort((a: any, b: any) => a.timestamp - b.timestamp);
        const cleaned = this.cleanPoints(sorted);
        if (!cleaned.length) {
          this.errorMsg = 'All GPS readings had poor accuracy. Waiting for better signal…';
          this.cdr.markForCheck();
          return;
        }

        const latest = cleaned[cleaned.length - 1];
        this.processNewPoint(latest, cleaned);
        this.lastUpdated = new Date();
        this.hasData = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Failed to fetch location. Retrying…';
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Clean incoming points (same 2-pass logic as parent component) ─────────

  private cleanPoints(sorted: any[]): LivePoint[] {
    const pass1: LivePoint[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const lat = p.coords?.latitude;
      const lng = p.coords?.longitude;
      if (!lat || !lng) continue;

      // Always keep pinned
      if (p.location_type === 'pinned') {
        pass1.push({ lat, lng, accuracy: p.coords.accuracy, speed: p.coords.speed, heading: p.coords.heading, timestamp: p.timestamp });
        continue;
      }

      // Accuracy gate
      if (p.coords.accuracy > JUNK_ACCURACY_M) continue;

      // Teleport gate — compare to last valid point
      if (pass1.length > 0) {
        const prev = pass1[pass1.length - 1];
        const d = this.dist(prev.lat, prev.lng, lat, lng);
        const dt = (p.timestamp - prev.timestamp) / 1000;
        if (d > JUNK_JUMP_M && dt < 30) continue;  // > 3 km in < 30 s = ghost
      }

      pass1.push({ lat, lng, accuracy: p.coords.accuracy, speed: p.coords.speed, heading: p.coords.heading, timestamp: p.timestamp });
    }

    return pass1;
  }

  // ─── Process new point → update map ──────────────────────────────────────

  private processNewPoint(pt: LivePoint, allPts: LivePoint[]): void {
    this.currentPoint       = pt;
    this.currentSpeedKmh    = Math.round((pt.speed || 0) * 3.6);
    this.currentAccuracyM   = Math.round(pt.accuracy);

    // Update stats
    if (this.prevPoint) {
      const d = this.dist(this.prevPoint.lat, this.prevPoint.lng, pt.lat, pt.lng);
      this.totalDistanceM += d;
    }
    if (pt.speed > 0) {
      const kmh = pt.speed * 3.6;
      this.speedSamples.push(kmh);
      if (kmh > this.topSpeedKmh) this.topSpeedKmh = kmh;
      this.avgSpeedKmh = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
    }
    this.prevPoint = pt;

    // Build trail from cleaned points (cap at MAX_TRAIL_POINTS)
    this.trailPoints = allPts
      .slice(-MAX_TRAIL_POINTS)
      .map(p => [p.lat, p.lng] as L.LatLngTuple);

    // Render map elements outside Angular zone
    this.ngZone.runOutsideAngular(() => this.renderLiveMarker(pt));

    // Fetch address (cached)
    this.fetchAddress(pt.lat, pt.lng);
  }

  // ─── Render live marker, trail, accuracy ring ────────────────────────────

  private renderLiveMarker(pt: LivePoint): void {
    const latlng: L.LatLngExpression = [pt.lat, pt.lng];

    // ── Trail polyline ──────────────────────────────────────────────────────
    if (this.trailLine) {
      this.trailLine.setLatLngs(this.trailPoints);
    } else {
      this.trailLine = L.polyline(this.trailPoints, {
        color: '#3b82f6', weight: 4, opacity: 0.75,
        smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round',
        dashArray: undefined
      }).addTo(this.map);
    }

    // ── Accuracy ring ───────────────────────────────────────────────────────
    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng(latlng).setRadius(pt.accuracy);
    } else {
      this.accuracyCircle = L.circle(latlng, {
        radius: pt.accuracy,
        color: '#3b82f6', fillColor: '#3b82f6',
        fillOpacity: 0.08, weight: 1, opacity: 0.4
      }).addTo(this.map);
    }

    // ── Animated live dot (pulsing circle marker) ───────────────────────────
    if (this.pulseMarker) {
      this.pulseMarker.setLatLng(latlng);
    } else {
      this.pulseMarker = L.circleMarker(latlng, {
        radius: 10, color: '#fff', weight: 3,
        fillColor: '#3b82f6', fillOpacity: 1
      }).addTo(this.map);
    }

    // ── Direction arrow marker ──────────────────────────────────────────────
    const rotation = pt.heading ?? 0;
    const arrowIcon = L.divIcon({
      className: '',
      html: `<div class="live-arrow" style="transform:rotate(${rotation}deg)">
               <div class="live-dot"></div>
               <div class="live-pulse"></div>
               <div class="live-heading-arrow" style="display:${pt.speed > 0.5 ? 'block' : 'none'}"></div>
             </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (this.liveMarker) {
      this.liveMarker.setLatLng(latlng).setIcon(arrowIcon);
    } else {
      this.liveMarker = L.marker(latlng, { icon: arrowIcon, zIndexOffset: 2000 }).addTo(this.map);
      this.liveMarker.bindPopup(() => this.buildLivePopup(pt));
    }

    // ── Pan map to follow the user ──────────────────────────────────────────
    this.map.panTo(latlng, { animate: true, duration: 0.8 });
  }

  private buildLivePopup(pt: LivePoint): HTMLElement {
    const d = document.createElement('div');
    d.style.cssText = 'min-width:190px;font-size:12px';
    d.innerHTML = `
      <div style="font-weight:700;color:#3b82f6;margin-bottom:4px">
        <i class="fas fa-location-arrow" style="color:#22c55e;margin-right:4px"></i>
        Live Location
      </div>
      <div style="color:#94a3b8;margin-bottom:6px">
        ${this.currentAddress || 'Fetching address…'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
        <div><span style="color:#64748b">Speed</span><br><b>${this.currentSpeedKmh} km/h</b></div>
        <div><span style="color:#64748b">Accuracy</span><br><b>${this.currentAccuracyM} m</b></div>
        <div><span style="color:#64748b">Lat</span><br><b>${pt.lat.toFixed(6)}</b></div>
        <div><span style="color:#64748b">Lng</span><br><b>${pt.lng.toFixed(6)}</b></div>
      </div>
      <div style="font-size:10px;color:#475569;margin-top:6px;border-top:1px solid #1e293b;padding-top:4px">
        🕐 ${new Date(pt.timestamp).toLocaleString()}
      </div>`;
    return d;
  }

  // ─── Address ─────────────────────────────────────────────────────────────

  private fetchAddress(lat: number, lng: number): void {
    const k = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if (this._addrCache.has(k)) {
      this.currentAddress = this._addrCache.get(k)!;
      this.cdr.markForCheck();
      return;
    }
    this.addressLoading = true;
    this.locationService.getAddressFromGlobalVTS(lat, lng)
      .then((res: any) => {
        const a = res?.address?.trim() || '';
        if (a) { this._addrCache.set(k, a); this.currentAddress = a; }
        this.addressLoading = false;
        this.cdr.markForCheck();
      })
      .catch(() => { this.addressLoading = false; this.cdr.markForCheck(); });
  }

  // ─── Geometry ─────────────────────────────────────────────────────────────

  dist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * DEG2RAD;
    const dLon = (lon2 - lon1) * DEG2RAD;
    const sl = Math.sin(dLat / 2), so = Math.sin(dLon / 2);
    const a = sl*sl + Math.cos(lat1*DEG2RAD) * Math.cos(lat2*DEG2RAD) * so*so;
    return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  formatTime(ts: number): string { return this._timeFmt.format(new Date(ts)); }

  formatDistance(m: number): string {
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
  }

  openInMaps(): void {
    if (this.currentPoint) {
      window.open(`https://www.google.com/maps?q=${this.currentPoint.lat},${this.currentPoint.lng}`, '_blank');
    }
  }
}
