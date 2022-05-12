import { Component, OnInit } from '@angular/core';
import { NavItem, NavSection } from "./NavItems";
import { NbItemsService } from "../../../services/nb-items.service";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  NavItems: NavSection[] = [];
  BottomItems: NavItem[] = [];

  constructor(private nbItemService: NbItemsService) { }

  ngOnInit(): void {
    this.nbItemService.getNavItems().subscribe(items => { this.NavItems = items; });
    this.nbItemService.getBottomItems().subscribe(items => { this.BottomItems = items; });
  }

}
