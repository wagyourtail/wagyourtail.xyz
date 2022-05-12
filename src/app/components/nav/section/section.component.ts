import { Component, OnInit, Input } from '@angular/core';
import { NavSection } from "../navbar/NavItems";

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
  styleUrls: ['./section.component.css']
})
export class SectionComponent implements OnInit {
  @Input() section: NavSection | undefined;

  constructor() { }

  ngOnInit(): void {
  }

}
