import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, NgZone,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import * as L from 'leaflet';
import { LocationService }        from '../services/location.service';
import { StatusService }          from '../services/status.service';
import { Router }                 from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgSelectModule }         from '@ng-select/ng-select';
import { SearchPaginationComponent } from '../master/search-pagination/search-pagination.component';
import { CommonModule }           from '@angular/common';
import { MasterService }          from '../services/master.service';
import { LiveTrackingComponent } from './live-tracking/live-tracking.component';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LocationCoords {
  latitude: number; longitude: number; altitude: number;
  accuracy: number; altitudeAccuracy: number; heading: number; speed: number;
}

export interface LocationPoint {
  coords: LocationCoords;
  timestamp: number;
  mode: 'foreground' | 'background';
  Deviceid: string; deviceOs: string;
  location_type: 'normal' | 'pinned';
  address:      string | null;
  visit_place:  string | null;   // Name of the place the employee visited
  purpose:      string | null;   // Purpose of the visit (meeting, delivery, etc.)
  remark:       string | null;   // Any additional remarks / notes
}

// ─── Module-level constants (computed once at import time) ────────────────────
const DEG2RAD = Math.PI / 180;
const EARTH_R  = 6371000;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent, LiveTrackingComponent]
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Map ───────────────────────────────────────────────────────────────────
  map!: L.Map;
  markers:        L.Layer[] = [];   // start/end markers (always visible)
  normalMarkers:  L.Layer[] = [];   // normal track-point markers (toggled by filter)
  pinnedMarkers:  L.Layer[] = [];   // pinned visit markers (toggled by filter)
  stayLayers:     L.Layer[] = [];   // stay circles + markers
  polyline:       L.Polyline | null = null;   // full route polyline
  normalPolyline: L.Polyline | null = null;   // polyline drawn from normal-only points
  pinnedPolyline: L.Polyline | null = null;   // polyline drawn between pinned points only
  currentTileLayer!: L.TileLayer;
  trafficLayer: L.TileLayer | null = null;
  fullScreenControl: any = null;
  trafficControl:    any = null;
  zoomControl:       any = null;

  mapType:          string  = 'osm';
  isTrafficEnabled: boolean = false;
  isFullScreen:     boolean = false;
  private mapReady: boolean = false;

  // ── Tracking ──────────────────────────────────────────────────────────────
  isLiveTrackingEnabled:       boolean = false;
  liveTrackingInterval:        any     = null;
  liveTrackingIntervalSeconds: number  = 30;
  currentTrackingUser:         any     = null;
  viewLiveTracking:            boolean = true;   // true = employee list
  viewLivePage:                boolean = false;  // true = live tracking page
  isLoading:                   boolean = false;

  // ── Data ──────────────────────────────────────────────────────────────────
  locationData:       LocationPoint[] = [];   // raw (used for timeline + stats)
  filteredLocations:  LocationPoint[] = [];   // after type-filter (drives timeline)
  pinnedLocations:    LocationPoint[] = [];
  normalLocations:    LocationPoint[] = [];
  selectedLocation:   LocationPoint | null = null;
  pinned:             any[] = [];
  pinnedLocationList: any[] = [];
  pinnedCount:        number = 0;
  staySummary:        any[]  = [];
  totalStayMinutes:   number = 0;

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalDistanceMeters: number = 0;
  trackingDuration:    string = '--:--';
  avgSpeed:            number = 0;
  bestAccuracy:        number = 0;

  // ── Filters ───────────────────────────────────────────────────────────────
  filterType: 'all' | 'pinned' | 'normal' = 'all';
  obj:     any = {};
  minDate: any;

  // ── UI ────────────────────────────────────────────────────────────────────
  isPanelCollapsed: boolean = false;
  themeMode: 'dark' | 'light' = 'light';

  // ── Employee list ─────────────────────────────────────────────────────────
  ActiveUsers:  any[]   = [];
  originalList: any[]   = [];
  baseurl:      any;
  currentPage:  number  = 1;
  itemsPerPage: number  = 10;
  pageSize:     number  = 10;
  searchTerm:   string  = '';
  searchText:   any     = '';

  @ViewChild('timelineList') timelineList!: ElementRef;

  // ── Pre-built date formatters (constructing Intl.DateTimeFormat is expensive) ─
  private readonly _timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  private readonly _dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  private readonly _dtFmt   = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  // ── Address cache: never hit the same co-ordinate twice ───────────────────
  private readonly _addrCache = new Map<string, string>();

  constructor(
    private ngZone:          NgZone,
    private cdr:             ChangeDetectorRef,
    private locationService: LocationService,
    public  statusService:   StatusService,
    private router:          Router,
    private master:          MasterService
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit():      void { this.baseurl = this.master.getBaseUrl(); this.activeTrackingUsers(); }
  ngAfterViewInit(): void {}
  ngOnDestroy():   void {
    this.stopLiveTracking();
    this.destroyMapInstance();
  }

  // ─── Employee List ──────────────────────────────────────────────────────────

  activeTrackingUsers(): void {
    this.locationService.getActiveTrackingUsers().subscribe({
      next: (res: any) => {
        const status = this.statusService.handleResponseStatus(res.status, res.message || 'OK');
        if (status === true) {
          this.ActiveUsers = res.data.map((item: any, i: number) => ({
            ...item,
            si_no: i + 1,
            profileImage: item.profileImage
              ? `${this.baseurl}${item.profileImage}`
              : item.gender === 'Female' ? '../../assets/img/avatars/2.png' : '../../assets/img/avatars/1.png'
          }));
          this.originalList = [...this.ActiveUsers];
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  onSearch(term: string): void {
    if (!term) { this.searchText = ''; this.ActiveUsers = [...this.originalList]; }
    else {
      const q = term.toLowerCase();
      this.searchTerm = q; this.currentPage = 1;
      this.ActiveUsers = this.originalList.filter((x: any) =>
        `${x.firstName} ${x.lastName} ${x.email} ${x.mobile} ${x.empCode} ${x.designation}`.toLowerCase().includes(q)
      );
    }
    this.cdr.markForCheck();
  }

  onPageChange(p: number):   void { this.currentPage = p; this.cdr.markForCheck(); }
  onPageSizeChange(s: number): void { this.pageSize = s; this.currentPage = 1; this.cdr.markForCheck(); }

  maskAadhaarNumber(n: string): string {
    if (!n || n.length < 4) return n || '';
    const c = n.replace(/\s+/g, '');
    return c.length <= 4 ? 'XXXX XXXX ' + c : `${c.substring(0,4)} XXXX ${c.substring(c.length-4)}`;
  }

  // ─── View Switch ────────────────────────────────────────────────────────────

  viewTrackingOnMap(user: any): void {
    if (!user) return;
    this.obj = {};
    this.viewLiveTracking = false;
    this.viewLivePage = false;          // ensure live page is closed
    this.currentTrackingUser = user;
    this.isLiveTrackingEnabled = false;
    this.stopLiveTracking();
    this.destroyMapInstance();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.initMap();
      setTimeout(() => {
        this.map?.invalidateSize();
        this.loadAndPlotData(user);
      }, 120);
    }, 0);
  }

  goBack(): void {
    this.viewLiveTracking = true;
    this.viewLivePage = false;
    this.stopLiveTracking();
    this.clearMap();
    this.destroyMapInstance();
    this.locationData = this.filteredLocations = this.pinnedLocations = this.normalLocations = [];
    this.staySummary = []; this.selectedLocation = null;
    this.cdr.markForCheck();
  }

  /** Called from employee list row — opens full live tracking page for this user */
  goLive(user: any): void {
    if (!user) return;
    this.currentTrackingUser = user;
    this.viewLiveTracking = false;
    this.viewLivePage = true;
    this.cdr.markForCheck();
  }

  goBackFromLive(): void {
    this.viewLivePage = false;
    this.viewLiveTracking = true;
    this.currentTrackingUser = null;
    this.destroyMapInstance();
    this.cdr.markForCheck();
  }

  // ─── Map Init (ONCE) ────────────────────────────────────────────────────────

  initMap(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    this.destroyMapInstance();
    delete (mapElement as any)._leaflet_id;

    this.map = L.map('map', {
      minZoom: 2, maxZoom: 19,
      zoomControl: false,
      preferCanvas: true,        // ← renders markers on <canvas> → much faster
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: false
    }).setView([26.8687, 81.0066], 5);

    this.addTileLayer(this.mapType);
    this.buildMapControls();

    // Run ALL Leaflet events outside Angular zone — prevents CD on every pan/zoom
    this.ngZone.runOutsideAngular(() => {
      this.map.on('click', () => this.ngZone.run(() => { this.selectedLocation = null; this.cdr.markForCheck(); }));
    });

    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private destroyMapInstance(): void {
    if (this.trafficLayer && this.map) {
      this.map.removeLayer(this.trafficLayer);
    }

    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    this.trafficLayer = null;
    this.currentTileLayer = undefined as any;
    this.fullScreenControl = null;
    this.trafficControl = null;
    this.zoomControl = null;
    this.mapReady = false;
    this.map = undefined as any;

    const mapElement = document.getElementById('map');
    if (mapElement) {
      delete (mapElement as any)._leaflet_id;
      mapElement.innerHTML = '';
    }
  }

  // ─── Tile Layer ─────────────────────────────────────────────────────────────

  addTileLayer(type: string): void {
    if (this.currentTileLayer) this.map.removeLayer(this.currentTileLayer);
    const T: Record<string, [string, string]> = {
      osm:       ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                     '© OpenStreetMap'],
      satellite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',          '© Esri'],
      terrain:   ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                       '© OpenTopoMap'],
      dark:      ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                          '© CARTO'],
      streets:   ['https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',                                                  '© HOT']
    };
    const [url, attr] = T[type] || T['osm'];
    this.currentTileLayer = L.tileLayer(url, { attribution: attr, minZoom: 2, maxZoom: 19, keepBuffer: 4 }).addTo(this.map);
  }

  changeMapType(type: string): void { this.mapType = type; this.addTileLayer(type); }

  toggleTheme(): void {
    this.themeMode = this.themeMode === 'dark' ? 'light' : 'dark';
    if (this.mapReady && this.mapType === 'dark' && this.themeMode === 'light') {
      this.changeMapType('osm');
    }
    this.cdr.markForCheck();
  }

  // ─── Map Controls ───────────────────────────────────────────────────────────

  buildMapControls(): void {
    const self = this;
    const mkBtn = (cls: string, icon: string, pos: L.ControlPosition, cb: () => void) => {
      const C = L.Control.extend({
        onAdd() {
          const c = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          const a = L.DomUtil.create('a', cls, c); a.href = '#';
          const i = L.DomUtil.create('i', icon, a);
          L.DomEvent.disableClickPropagation(c);
          L.DomEvent.on(a, 'click', (e: Event) => {
            L.DomEvent.preventDefault(e as MouseEvent); L.DomEvent.stopPropagation(e as MouseEvent);
            cb();
            if (cls === 'leaflet-ctrl-fs') i.className = `fas ${self.isFullScreen ? 'fa-compress' : 'fa-expand'}`;
          });
          return c;
        }, onRemove() {}
      });
      return new C({ position: pos }).addTo(self.map);
    };

    this.fullScreenControl = mkBtn('leaflet-ctrl-fs',     'fas fa-expand',        'topright', () => this.toggleFullScreen());
    this.trafficControl    = mkBtn('leaflet-ctrl-traffic', 'fas fa-traffic-light', 'topright', () => this.toggleTraffic());

    const ZC = L.Control.extend({
      onAdd() {
        const c = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        c.style.cssText = 'display:flex;flex-direction:column';
        const zi = L.DomUtil.create('a', 'leaflet-ctrl-zoom-in',  c); zi.href = '#'; L.DomUtil.create('i', 'fas fa-plus',  zi);
        const zo = L.DomUtil.create('a', 'leaflet-ctrl-zoom-out', c); zo.href = '#'; L.DomUtil.create('i', 'fas fa-minus', zo);
        L.DomEvent.disableClickPropagation(zi); L.DomEvent.on(zi, 'click', (e: Event) => { L.DomEvent.preventDefault(e as MouseEvent); self.zoomIn(); });
        L.DomEvent.disableClickPropagation(zo); L.DomEvent.on(zo, 'click', (e: Event) => { L.DomEvent.preventDefault(e as MouseEvent); self.zoomOut(); });
        return c;
      }, onRemove() {}
    });
    this.zoomControl = new ZC({ position: 'topright' }).addTo(this.map);
  }

  toggleTraffic(): void {
    this.isTrafficEnabled = !this.isTrafficEnabled;
    if (!this.map) return;
    if (this.isTrafficEnabled) {
      this.trafficLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}',
        { maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], opacity: 0.65 }).addTo(this.map);
    } else if (this.trafficLayer) { this.map.removeLayer(this.trafficLayer); this.trafficLayer = null; }
  }

  toggleFullScreen(): void {
    this.isFullScreen = !this.isFullScreen;
    document.body.style.overflow = this.isFullScreen ? 'hidden' : '';
    this.cdr.markForCheck();
    setTimeout(() => this.map?.invalidateSize(), 250);
  }

  zoomIn():  void { this.map?.zoomIn(); }
  zoomOut(): void { this.map?.zoomOut(); }

  // ─── Clear Map ──────────────────────────────────────────────────────────────

  clearMap(): void {
    if (!this.map) return;
    const all = [...this.markers, ...this.normalMarkers, ...this.pinnedMarkers, ...this.stayLayers];
    for (const l of all) this.map.removeLayer(l);
    this.markers = []; this.normalMarkers = []; this.pinnedMarkers = []; this.stayLayers = [];
    if (this.polyline)        { this.map.removeLayer(this.polyline);        this.polyline        = null; }
    if (this.normalPolyline)  { this.map.removeLayer(this.normalPolyline);  this.normalPolyline  = null; }
    if (this.pinnedPolyline)  { this.map.removeLayer(this.pinnedPolyline);  this.pinnedPolyline  = null; }
  }

  // ─── MAIN LOAD ──────────────────────────────────────────────────────────────

  loadAndPlotData(user: any): void {
    if (!user) return;
    this.isLoading = true;
    this.clearMap();
    this.pinned = []; this.pinnedLocationList = [];
    this.staySummary = []; this.locationData = []; this.totalStayMinutes = 0;
    this.cdr.markForCheck();

    const payload: any = { employeeId: user.id };
    if (this.obj.startDate)  payload.start_date = this.obj.startDate;
    if (this.obj.endDate)    payload.end_date   = this.obj.endDate;
    if (this.obj.startTime)  payload.start_time = this.obj.startTime;
    if (this.obj.endTime)    payload.end_time   = this.obj.endTime;

    this.locationService.getLatestLocations(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res?.data?.length) { this.cdr.markForCheck(); return; }

        // ── Step 1: sort by timestamp (once, reused everywhere) ──────────────
        const raw: LocationPoint[] = res.data.sort((a: any, b: any) => a.timestamp - b.timestamp);

        // ── Step 2: DEDUPLICATE ──────────────────────────────────────────────
        // hardFiltered = quality-filtered (accuracy/teleport) but NOT cluster-collapsed.
        // Used for stay detection so 30-min stationary clusters are preserved.
        // pts = fully deduplicated for map rendering (cluster-collapsed + RDP).
        const hardFiltered = this.hardFilterPoints(raw);
        const pts = this.clusterAndSimplify(hardFiltered, { radiusMeters: 150, windowSeconds: 120 });

        // ── Step 3: single-pass stats (no extra allocations) ─────────────────
        this.computeStats(pts);

        // ── Step 4: store for timeline (use deduped data) ─────────────────────
        this.locationData = pts;
        this.deriveLocations();
        this.applyFilters();

        // ── Step 5: render map layers outside Angular zone ────────────────────
        this.ngZone.runOutsideAngular(() => {
          this.renderLayers(pts, raw);
          this.ngZone.run(() => this.cdr.markForCheck());
        });

        // ── Step 6: stay detection on pre-collapse data (not pts!) ────────────
        // Using hardFiltered preserves consecutive stationary readings needed
        // for stay duration calculation. pts has too few points after collapse.
        const stays = this.detectStays(hardFiltered);
        this.renderStaysWithLazyAddresses(stays);
      },
      error: () => { this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDUPLICATION — Two separate passes for map vs stay detection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PASS 1 only — accuracy filter + teleport/impossible-speed removal.
   * Returns all quality points INCLUDING stationary duplicates.
   * Used by detectStays() so consecutive readings at the same spot are kept
   * for duration calculation.
   */
  hardFilterPoints(sorted: LocationPoint[]): LocationPoint[] {
    if (!sorted.length) return [];
    const out: LocationPoint[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (p.location_type === 'pinned') { out.push(p); continue; }

      // Reject poor-accuracy points (>= 200 catches "exactly 200" Android fallback coords)
      if (p.coords.accuracy >= 200) continue;

      if (out.length > 0) {
        const prev = out[out.length - 1];
        const dPrev = this.dist(prev.coords.latitude, prev.coords.longitude, p.coords.latitude, p.coords.longitude);

        // Look ahead for the next quality point to detect isolated spikes
        let dNext = 0;
        for (let j = i + 1; j < sorted.length; j++) {
          const n = sorted[j];
          if (n.location_type === 'pinned' || n.coords.accuracy < 200) {
            dNext = this.dist(p.coords.latitude, p.coords.longitude, n.coords.latitude, n.coords.longitude);
            break;
          }
        }

        // Spike filter: point far from both previous and next → isolated ghost reading
        if (dPrev > 150 && dNext > 150) continue;

        // Speed filter: impossibly fast jump for a low-quality reading
        const timeSec = (p.timestamp - prev.timestamp) / 1000;
        if (timeSec > 0 && (dPrev / timeSec) > 55 && p.coords.accuracy > 100) continue;
      }

      out.push(p);
    }
    return out;
  }

  /**
   * PASS 2 + 3 — cluster collapse then RDP simplification.
   * Takes hardFiltered data. Produces minimal clean polyline for map rendering.
   * radiusMeters: 150 m collapses the ~110 m drift clusters in real data.
   */
  clusterAndSimplify(
    pass1: LocationPoint[],
    opts: { radiusMeters: number; windowSeconds: number } = { radiusMeters: 150, windowSeconds: 120 }
  ): LocationPoint[] {
    if (!pass1.length) return [];

    const kept: LocationPoint[] = [];

    for (const p of pass1) {
      if (kept.length === 0) { kept.push(p); continue; }
      if (p.location_type === 'pinned') { kept.push(p); continue; }

      const anchor = kept[kept.length - 1];
      const distM  = this.dist(anchor.coords.latitude, anchor.coords.longitude, p.coords.latitude, p.coords.longitude);

      if (distM < opts.radiusMeters) continue; // discard — still inside cluster

      kept.push(p);
    }

    // Always include the true last quality point as the End marker
    const lastRaw = pass1[pass1.length - 1];
    if (kept.length > 0 && kept[kept.length - 1].timestamp !== lastRaw.timestamp) {
      kept.push(lastRaw);
    }

    return this.rdpSimplify(kept, 0.00005);
  }

  /**
   * Ramer-Douglas-Peucker polyline simplification.
   * Pinned points are always kept (they mark explicit user visits).
   * tolerance in degrees (0.00005 ≈ 5–6 m on the ground).
   */
  private rdpSimplify(pts: LocationPoint[], tolerance: number): LocationPoint[] {
    if (pts.length <= 2) return pts;

    const sqTol = tolerance * tolerance;

    const perpDistSq = (p: LocationPoint, a: LocationPoint, b: LocationPoint): number => {
      const ax = a.coords.longitude, ay = a.coords.latitude;
      const bx = b.coords.longitude, by = b.coords.latitude;
      const px = p.coords.longitude, py = p.coords.latitude;
      const dx = bx - ax, dy = by - ay;
      if (dx === 0 && dy === 0) {
        const ex = px - ax, ey = py - ay;
        return ex * ex + ey * ey;
      }
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      const cx = ax + t * dx - px, cy = ay + t * dy - py;
      return cx * cx + cy * cy;
    };

    const simplify = (start: number, end: number, result: boolean[]): void => {
      let maxSq = 0, idx = start;
      for (let i = start + 1; i < end; i++) {
        if (pts[i].location_type === 'pinned') { result[i] = true; continue; }
        const d = perpDistSq(pts[i], pts[start], pts[end]);
        if (d > maxSq) { maxSq = d; idx = i; }
      }
      if (maxSq > sqTol) {
        result[idx] = true;
        simplify(start, idx, result);
        simplify(idx, end, result);
      }
    };

    const keep = new Array(pts.length).fill(false);
    keep[0] = true;
    keep[pts.length - 1] = true;
    simplify(0, pts.length - 1, keep);

    return pts.filter((_, i) => keep[i]);
  }

  // ─── Render Layers (outside NgZone) ─────────────────────────────────────────

  private renderLayers(pts: LocationPoint[], raw: LocationPoint[]): void {

    // ── 1. Build all three polylines ──────────────────────────────────────────

    // All-points polyline (used for "all" filter view)
    const allLls = pts.map(p => [p.coords.latitude, p.coords.longitude] as L.LatLngTuple);

    // Normal-only polyline (used for "normal" filter view)
    const normalPts = pts.filter(p => p.location_type !== 'pinned');
    const normalLls = normalPts.map(p => [p.coords.latitude, p.coords.longitude] as L.LatLngTuple);

    // Pinned-only polyline — connect pinned points in chronological order
    const pinnedRaw = raw.filter(p => p.location_type === 'pinned');
    const pinnedLls = pinnedRaw.map(p => [p.coords.latitude, p.coords.longitude] as L.LatLngTuple);

    const polylineStyle = {
      color: '#3b82f6', weight: 5, opacity: 0.9,
      smoothFactor: 2, lineCap: 'round' as L.LineCapShape, lineJoin: 'round' as L.LineJoinShape
    };

    if (allLls.length >= 2) {
      this.polyline = L.polyline(allLls, polylineStyle);
    }
    if (normalLls.length >= 2) {
      this.normalPolyline = L.polyline(normalLls, { ...polylineStyle, color: '#3b82f6' });
    }
    if (pinnedLls.length >= 2) {
      this.pinnedPolyline = L.polyline(pinnedLls, { ...polylineStyle, color: '#f59e0b', dashArray: '8 6' });
    }

    // ── 2. Start / End markers (always visible regardless of filter) ──────────

    const startPt = raw[0];
    const endPt   = raw[raw.length - 1];

    const sm = L.marker([startPt.coords.latitude, startPt.coords.longitude],
      { icon: this.divIcon('#22c55e', 'S', 30), zIndexOffset: 1000 });
    sm.bindPopup(() => this.lazyAddrPopup('START', startPt.coords.latitude, startPt.coords.longitude, startPt.timestamp));
    this.markers.push(sm);

    const em = L.marker([endPt.coords.latitude, endPt.coords.longitude],
      { icon: this.divIcon('#ef4444', 'E', 30), zIndexOffset: 1000 });
    em.bindPopup(() => this.lazyAddrPopup('END', endPt.coords.latitude, endPt.coords.longitude, endPt.timestamp));
    this.markers.push(em);

    // ── 3. Normal track-point markers (small dots along the route) ────────────

    for (const p of normalPts) {
      const nm = L.circleMarker([p.coords.latitude, p.coords.longitude], {
        radius: 4, color: '#3b82f6', fillColor: '#3b82f6',
        fillOpacity: 0.7, weight: 1.5
      });
      nm.bindPopup(() => this.lazyAddrPopup(
        '📍 Track Point',
        p.coords.latitude, p.coords.longitude, p.timestamp
      ));
      this.normalMarkers.push(nm);
    }

    // ── 4. Pinned visit markers ───────────────────────────────────────────────

    this.pinned             = raw.filter(p => p.location_type === 'pinned');
    this.pinnedCount        = this.pinned.length;
    this.pinnedLocationList = this.groupPinnedLocations(this.pinned);

    for (const pin of this.pinnedLocationList) {
      const m = L.marker([pin.latitude, pin.longitude],
        { icon: this.pinCountIcon(pin.count, pin.visits.some((v: any) => v.visit_place || v.remark || v.purpose)), zIndexOffset: 900 });
      m.bindPopup(() => this.lazyPinPopup(pin));
      m.on('click', () => this.ngZone.run(() => {
        this.selectedLocation = pin.visits[pin.visits.length - 1] ?? null;
        this.cdr.markForCheck();
      }));
      this.pinnedMarkers.push(m);
    }

    // ── 5. Apply the current filter to decide what to show on map ─────────────
    this.applyMapFilter();
  }

  // ─── Apply map filter — show/hide layers based on filterType ────────────────

  private applyMapFilter(): void {
    if (!this.map) return;

    const showAll    = this.filterType === 'all';
    const showNormal = this.filterType === 'all' || this.filterType === 'normal';
    const showPinned = this.filterType === 'all' || this.filterType === 'pinned';

    // ── Polylines ──────────────────────────────────────────────────────────────
    // all filter → show full polyline
    // normal filter → show normal-only polyline
    // pinned filter → show pinned-connecting polyline (dashed amber)

    if (this.polyline) {
      if (showAll) this.map.addLayer(this.polyline);
      else         this.map.removeLayer(this.polyline);
    }
    if (this.normalPolyline) {
      if (showNormal && !showAll) this.map.addLayer(this.normalPolyline);
      else                        this.map.removeLayer(this.normalPolyline);
    }
    if (this.pinnedPolyline) {
      if (showPinned && !showAll) this.map.addLayer(this.pinnedPolyline);
      else                        this.map.removeLayer(this.pinnedPolyline);
    }

    // ── Start / End markers always visible ────────────────────────────────────
    for (const m of this.markers) {
      if (!this.map.hasLayer(m)) this.map.addLayer(m);
    }

    // ── Normal track-point markers ────────────────────────────────────────────
    for (const m of this.normalMarkers) {
      if (showNormal) { if (!this.map.hasLayer(m)) this.map.addLayer(m); }
      else            { if (this.map.hasLayer(m))  this.map.removeLayer(m); }
    }

    // ── Pinned markers ────────────────────────────────────────────────────────
    for (const m of this.pinnedMarkers) {
      if (showPinned) { if (!this.map.hasLayer(m)) this.map.addLayer(m); }
      else            { if (this.map.hasLayer(m))  this.map.removeLayer(m); }
    }

    // ── Stay layers: show when normal or all (stays are from normal movement) ─
    for (const l of this.stayLayers) {
      if (showNormal) { if (!this.map.hasLayer(l)) this.map.addLayer(l); }
      else            { if (this.map.hasLayer(l))  this.map.removeLayer(l); }
    }

    // ── Fit map bounds to visible layers ──────────────────────────────────────
    try {
      const activePolyline = showAll ? this.polyline
        : showNormal ? this.normalPolyline
        : this.pinnedPolyline;

      if (activePolyline) {
        this.map.fitBounds(activePolyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
      } else if (showPinned && this.pinnedMarkers.length) {
        // Only pinned — fit to pinned marker positions
        const group = L.featureGroup(this.pinnedMarkers);
        this.map.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 16 });
      }
    } catch (_) { /* bounds can fail if empty */ }
  }

  // ─── Lazy Popup Builders ────────────────────────────────────────────────────
  // Content built only on click — never on load

  private lazyAddrPopup(label: string, lat: number, lng: number, ts: number): HTMLElement {
    const d = document.createElement('div');
    d.style.minWidth = '160px';
    d.innerHTML = `<b style="color:#3b82f6">${label}</b><br>
      <small class="atxt" style="color:#94a3b8">Loading address…</small><br>
      <b>Lat:</b> ${lat.toFixed(6)}<br><b>Lng:</b> ${lng.toFixed(6)}<br>
      <b>Time:</b> ${new Date(ts).toLocaleString()}`;
    this.getAddressFromAPI(lat, lng).then(a => {
      const el = d.querySelector('.atxt'); if (el) el.textContent = a || '—';
    });
    return d;
  }

  private lazyPinPopup(pin: any): HTMLElement {
    const d = document.createElement('div');
    d.style.cssText = 'min-width:240px;max-width:290px;font-size:12px;line-height:1.6';

    const rows = pin.visits.slice(0, 5).map((v: any, i: number) => {
      const time    = new Date(v.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12: true });
      const place   = v.visit_place ? `<div style="color:#f59e0b;font-weight:600;margin-top:2px">🏢 ${v.visit_place}</div>` : '';
      const purpose = v.purpose     ? `<div><span style="color:#64748b">Purpose:</span> <span style="color:#cbd5e1">${v.purpose}</span></div>` : '';
      const remark  = v.remark      ? `<div><span style="color:#64748b">Remark:</span> <span style="color:#cbd5e1">${v.remark}</span></div>` : '';
      const empty   = (!v.visit_place && !v.purpose && !v.remark)
        ? `<div style="color:#475569;font-style:italic;font-size:11px">No details recorded</div>` : '';
      return `<div style="margin:5px 0;padding:6px 8px;background:#0f172a;border-radius:6px;border-left:3px solid #f59e0b">
          <div style="color:#94a3b8;font-size:11px"><b style="color:#f8fafc">#${i+1}</b>&nbsp; 🕐 ${time}</div>
          ${place}${purpose}${remark}${empty}
        </div>`;
    }).join('');

    d.innerHTML = `
      <div style="padding:2px 0 6px">
        <b style="color:#f59e0b;font-size:13px">📌 Pinned Location</b>
      </div>
      <small class="atxt" style="color:#94a3b8;display:block;margin-bottom:6px">${pin.address || 'Loading address…'}</small>
      <span style="background:#1e3a5f;color:#60a5fa;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600">
        ${pin.count} visit${pin.count !== 1 ? 's' : ''}
      </span>
      <div style="margin-top:8px;border-top:1px solid #334155;padding-top:4px;max-height:230px;overflow-y:auto">
        ${rows}
        ${pin.count > 5 ? `<div style="text-align:center;color:#475569;font-size:11px;padding:4px 0">+${pin.count-5} more visits</div>` : ''}
      </div>`;

    if (!pin.address) {
      this.getAddressFromAPI(pin.latitude, pin.longitude).then(a => {
        const el = d.querySelector('.atxt');
        if (el && a) { el.textContent = a; pin.address = a; }
      });
    }
    return d;
  }

  // ─── Stay Zones ─────────────────────────────────────────────────────────────

  private renderStaysWithLazyAddresses(stays: any[]): void {
    this.staySummary = []; this.totalStayMinutes = 0;

    this.ngZone.runOutsideAngular(() => {
      for (const stay of stays) {
        const mins = Math.max(1, Math.floor(stay.duration / 60000));
        this.totalStayMinutes += mins;
        const col = mins >= 60 ? '#7c3aed' : mins >= 30 ? '#8b5cf6' : mins >= 10 ? '#a78bfa' : '#c4b5fd';
        const circle = L.circleMarker([stay.latitude, stay.longitude], {
          radius: Math.min(22, 10 + mins / 5), color: col, fillColor: col, fillOpacity: 0.25, weight: 2
        });
        circle.bindTooltip(`Stay: ${this.formatMinutesToHHMM(mins)}`, { direction: 'top' });
        const m = L.marker([stay.latitude, stay.longitude],
          { icon: this.divIcon(col, 'ST', 26), zIndexOffset: 800 });
        m.bindPopup(() => this.lazyStayPopup(stay, mins));
        // Store in stayLayers — applyMapFilter will decide whether to add to map
        this.stayLayers.push(circle, m);
      }

      // Now apply the current filter so stay visibility respects the active chip
      this.applyMapFilter();
    });

    this.staySummary = stays.map(stay => ({
      minutes: Math.max(1, Math.floor(stay.duration / 60000)),
      durationText: this.formatMinutesToHHMM(Math.max(1, Math.floor(stay.duration / 60000))),
      address: null as string | null,
      from: stay.from, to: stay.to, lat: stay.latitude, lng: stay.longitude
    }));
    this.cdr.markForCheck();

    // All address fetches in parallel — one CD update at the end
    Promise.allSettled(
      this.staySummary.map((s, i) =>
        this.getAddressFromAPI(s.lat, s.lng).then(a => { this.staySummary[i].address = a; })
      )
    ).then(() => this.ngZone.run(() => this.cdr.markForCheck()));
  }

  private lazyStayPopup(stay: any, mins: number): HTMLElement {
    const d = document.createElement('div');
    d.innerHTML = `<b>Stay Zone</b><br>
      <b>Duration:</b> ${this.formatMinutesToHHMM(mins)}<br>
      <b>From:</b> ${new Date(stay.from).toLocaleTimeString()}<br>
      <b>To:</b> ${new Date(stay.to).toLocaleTimeString()}<br>
      <small class="atxt" style="color:#94a3b8">Loading address…</small>`;
    this.getAddressFromAPI(stay.latitude, stay.longitude).then(a => {
      const el = d.querySelector('.atxt');
      if (el && a) el.outerHTML = `<span><b>Address:</b> ${a}</span>`;
    });
    return d;
  }

  // ─── Stats (single pass) ────────────────────────────────────────────────────

  private computeStats(sorted: LocationPoint[]): void {
    if (sorted.length < 2) return;
    let dist = 0, speedSum = 0, speedCnt = 0, bestAcc = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      dist += this.dist(sorted[i-1].coords.latitude, sorted[i-1].coords.longitude,
                        sorted[i].coords.latitude,   sorted[i].coords.longitude);
    }
    for (const p of sorted) {
      if (p.coords.speed > 0) { speedSum += p.coords.speed; speedCnt++; }
      const a = p.coords.accuracy;
      if (a > 0 && a < 300 && a < bestAcc) bestAcc = a;
    }
    this.totalDistanceMeters = dist;
    this.avgSpeed     = speedCnt > 0 ? (speedSum / speedCnt) * 3.6 : 0;
    this.bestAccuracy = bestAcc === Infinity ? 0 : bestAcc;
    const ms = sorted[sorted.length-1].timestamp - sorted[0].timestamp;
    const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
    this.trackingDuration = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ─── Derive & Filter ────────────────────────────────────────────────────────

  deriveLocations(): void {
    this.pinnedLocations = []; this.normalLocations = [];
    for (const l of this.locationData)
      (l.location_type === 'pinned' ? this.pinnedLocations : this.normalLocations).push(l);
  }

  applyFilters(): void {
    this.filteredLocations = this.filterType === 'all'
      ? this.locationData
      : this.locationData.filter(l => l.location_type === this.filterType);
    this.cdr.markForCheck();
  }

  setFilterType(type: 'all' | 'pinned' | 'normal'): void {
    this.filterType = type;
    this.applyFilters();            // update timeline sidebar
    this.ngZone.runOutsideAngular(() => {
      this.applyMapFilter();        // update map layers — outside zone so no CD overhead
    });
  }

  resetTrackingFilters(): void {
    this.filterType = 'all'; this.obj = {};
    if (this.currentTrackingUser) this.loadAndPlotData(this.currentTrackingUser);
  }

  // ─── Stay Detection ─────────────────────────────────────────────────────────

  detectStays(pts: LocationPoint[]): any[] {
    // D: radius within which consecutive readings count as "same place"
    // Must match the cluster radius (150 m) so alternating drift clusters
    // are treated as one stay rather than separate movements.
    // T: minimum duration to report as a stay (2 minutes).
    const D = 200, T = 2 * 60_000;
    const out: any[] = [];
    let start: LocationPoint | null = null;
    for (let i = 1; i < pts.length; i++) {
      const d = this.dist(pts[i-1].coords.latitude, pts[i-1].coords.longitude, pts[i].coords.latitude, pts[i].coords.longitude);
      if (d <= D) { if (!start) start = pts[i-1]; }
      else {
        if (start) {
          const dur = pts[i-1].timestamp - start.timestamp;
          if (dur >= T) out.push({ latitude: start.coords.latitude, longitude: start.coords.longitude, duration: dur, from: start.timestamp, to: pts[i-1].timestamp });
          start = null;
        }
      }
    }
    if (start && pts.length) {
      const last = pts[pts.length-1], dur = last.timestamp - start.timestamp;
      if (dur >= T) out.push({ latitude: start.coords.latitude, longitude: start.coords.longitude, duration: dur, from: start.timestamp, to: last.timestamp });
    }
    return out;
  }

  // ─── Group Pinned ───────────────────────────────────────────────────────────

  groupPinnedLocations(pinned: any[]): any[] {
    const g: Record<string, any> = {};
    for (const p of pinned) {
      const lat = p.lat ?? p.coords?.latitude;
      const lng = p.lng ?? p.coords?.longitude;
      if (!lat || !lng) continue;
      const k = lat.toFixed(4) + '_' + lng.toFixed(4);
      if (!g[k]) g[k] = { latitude: lat, longitude: lng, address: p.address, count: 0, visits: [] };
      g[k].count++;
      // Store each visit with its full detail fields
      g[k].visits.push({
        timestamp:   p.timestamp,
        visit_place: p.visit_place ?? null,
        purpose:     p.purpose     ?? null,
        remark:      p.remark      ?? null,
        address:     p.address     ?? null,
        coords:      p.coords
      });
    }
    return Object.values(g);
  }

  // ─── Geometry ───────────────────────────────────────────────────────────────

  dist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * DEG2RAD;
    const dLon = (lon2 - lon1) * DEG2RAD;
    const sl = Math.sin(dLat / 2), so = Math.sin(dLon / 2);
    const a = sl*sl + Math.cos(lat1*DEG2RAD) * Math.cos(lat2*DEG2RAD) * so*so;
    return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.dist(lat1, lon1, lat2, lon2);
  }

  calculateTotalDistance(pts: LocationPoint[]): number {
    let t = 0;
    for (let i = 1; i < pts.length; i++)
      t += this.dist(pts[i-1].coords.latitude, pts[i-1].coords.longitude, pts[i].coords.latitude, pts[i].coords.longitude);
    return t;
  }

  // ─── Address API + Cache ─────────────────────────────────────────────────────

  async getAddressFromAPI(lat: number, lng: number): Promise<string | null> {
    const k = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if (this._addrCache.has(k)) return this._addrCache.get(k)!;
    try {
      const res: any = await this.locationService.getAddressFromGlobalVTS(lat, lng);
      const a = res?.address?.trim() || null;
      if (a) this._addrCache.set(k, a);
      return a;
    } catch { return null; }
  }

  async viewAddress(pin: any, index: number): Promise<void> {
    const lat = pin.latitude ?? pin.coords?.latitude;
    const lng = pin.longitude ?? pin.coords?.longitude;
    const a = await this.getAddressFromAPI(lat, lng);
    this.pinnedLocationList[index].address = pin.address = a;
    this.cdr.markForCheck();
  }

  // ─── Icons ──────────────────────────────────────────────────────────────────

  divIcon(color: string, label: string, size = 28): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;line-height:1">${label}</span></div>`,
      iconSize: [size, size], iconAnchor: [size/2, size+3]
    });
  }

  pinCountIcon(count: number, hasRemark = false): L.DivIcon {
    const remarkDot = hasRemark
      ? `<span style="position:absolute;bottom:-3px;right:-3px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`
      : '';
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;display:inline-block"><div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f59e0b;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700">P</span></div>${count>1?`<span style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;padding:1px 4px;border-radius:8px;border:1.5px solid #fff">${count}</span>`:''}${remarkDot}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 31]
    });
  }

  // ─── Selection ──────────────────────────────────────────────────────────────

  selectLocation(loc: LocationPoint): void {
    this.selectedLocation = loc;
    if (this.map) {
      this.ngZone.runOutsideAngular(() =>
        this.map.setView([loc.coords.latitude, loc.coords.longitude], 17, { animate: true })
      );
    }
    this.cdr.markForCheck();
  }

  clearSelection(): void { this.selectedLocation = null; this.cdr.markForCheck(); }

  scrollTimelineToItem(index: number): void {
    if (!this.timelineList) return;
    const items = this.timelineList.nativeElement.querySelectorAll('.tl-item');
    if (items[index]) items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ─── Live Tracking ──────────────────────────────────────────────────────────

  toggleLiveTracking(): void {
    if (!this.currentTrackingUser) return;
    this.isLiveTrackingEnabled ? this.stopLiveTracking() : this.startLiveTracking();
  }

  startLiveTracking(): void {
    this.isLiveTrackingEnabled = true;
    this.loadAndPlotData(this.currentTrackingUser);
    this.liveTrackingInterval = setInterval(() => {
      if (this.isLiveTrackingEnabled && this.currentTrackingUser) this.loadAndPlotData(this.currentTrackingUser);
    }, this.liveTrackingIntervalSeconds * 1000);
    this.cdr.markForCheck();
  }

  stopLiveTracking(): void {
    this.isLiveTrackingEnabled = false;
    if (this.liveTrackingInterval) { clearInterval(this.liveTrackingInterval); this.liveTrackingInterval = null; }
    this.cdr.markForCheck();
  }

  // ─── Date helpers ───────────────────────────────────────────────────────────

  setMinToDate(): void {
    if (this.obj['startDate']) {
      const d = new Date(this.obj['startDate']);
      if (!isNaN(d.getTime())) this.minDate = d.toISOString().split('T')[0];
    }
    this.obj['endDate'] = null;
  }

  getToDateMin(): string { return this.obj['startDate'] || this.minDate; }

  DateWiseTracking(): void {
    if (this.currentTrackingUser) {
      Object.assign(this.currentTrackingUser, {
        start_date: this.obj['startDate'], end_date: this.obj['endDate'],
        start_time: this.obj['startTime'], end_time: this.obj['endTime']
      });
      this.loadAndPlotData(this.currentTrackingUser);
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  zoomToPin(pin: any): void {
    const lat = pin.latitude ?? pin.coords?.latitude;
    const lng = pin.longitude ?? pin.coords?.longitude;
    this.ngZone.runOutsideAngular(() => this.map?.setView([lat, lng], 17, { animate: true }));
  }

  formatMinutesToHHMM(m: number): string {
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  }

  formatTime(ts: number):     string { return this._timeFmt.format(new Date(ts)); }
  formatDate(ts: number):     string { return this._dateFmt.format(new Date(ts)); }
  formatDateTime(ts: number): string { return this._dtFmt.format(new Date(ts));   }

  openInMaps(loc: LocationPoint): void {
    window.open(`https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`, '_blank');
  }

  async copyCoords(loc: LocationPoint): Promise<void> {
    if (navigator.clipboard) await navigator.clipboard.writeText(`${loc.coords.latitude}, ${loc.coords.longitude}`);
  }

  trackByTimestamp(_: number, item: LocationPoint): number { return item.timestamp; }
  trackByIndex(index: number): number { return index; }

  togglePanel(): void { this.isPanelCollapsed = !this.isPanelCollapsed; this.cdr.markForCheck(); }
}
