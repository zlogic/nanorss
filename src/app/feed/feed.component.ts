import { Component } from '@angular/core';
import { Response } from '@angular/http';

import { HTTPService } from '../service/http.service';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent {
  items = [];

  constructor(private httpService: HTTPService) {
    this.update();
  }

  update() {
    this.httpService.get("user/feed")
      .subscribe((res: Response) => {
        this.items = res.json();
      });
  }

  loadItem(item: any): void {
    let existingItem = item.html;
    if(existingItem !== undefined)
      return;
    item.html = "";
    this.httpService.get(item.fetchUrl)
      .subscribe((res: Response) => {
        item.html = res.text();
      });
  }
}
