import { Injectable, isDevMode } from '@angular/core';
import { Observable } from "rxjs";
import { NavItem, NavSection } from '../components/nav/navbar/NavItems';
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class NbItemsService {
  private api_url = `http://${isDevMode() ? "localhost:3000" : window.location.host }/api`;

  constructor(private http: HttpClient) { }

  getNavItems(): Observable<NavSection[]> {
    return this.http.get<NavSection[]>(`${this.api_url}/pages.json`);
  }

  getBottomItems(): Observable<NavItem[]> {
    return this.http.get<NavItem[]>(`${this.api_url}/bottom.json`)
  }
}
