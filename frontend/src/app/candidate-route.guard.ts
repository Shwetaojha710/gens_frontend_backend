import { Injectable } from '@angular/core';
import { CanMatch, Route, UrlSegment } from '@angular/router';

/**
 * Only allows the /:slug candidate route to activate when the URL
 * contains a `job_id` query parameter — the format used by all real
 * job application links (e.g. /software?job_id=xxx&token=yyy).
 *
 * Without this guard every unknown single-segment URL (e.g. /dashboard,
 * /branchwise) would be caught by the :slug wildcard before the ** 404 route.
 */
@Injectable({ providedIn: 'root' })
export class CandidateRouteGuard implements CanMatch {
  canMatch(_route: Route, _segments: UrlSegment[]): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.has('job_id');
  }
}
