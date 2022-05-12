import { Component, Input, OnInit } from '@angular/core';
import { NavItem } from "../navbar/NavItems";

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent implements OnInit {
  @Input() item: NavItem | undefined;
  @Input() section: string | undefined;
  @Input() target: string | undefined;

  constructor() { }

  ngOnInit(): void {
  }

  onClick() {
    console.log('Button clicked');
  }
}
