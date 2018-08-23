import { Component } from '@angular/core';
import { Response } from '@angular/http';
import { map, mergeMap, catchError } from 'rxjs/operators';

import { HTTPService } from '../service/http.service';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent {

  username: string;
  password: string;
  opml: string;
  pagemonitor: string;
  loading: boolean = true;

  constructor(private httpService: HTTPService) {
    this.update();
  }

  private update() {
    this.httpService.get("user/configuration")
      .subscribe((res: Response) => {
        let configuration = res.json();
        this.username = configuration.username;
        this.password = undefined;
        this.opml = configuration.opml;
        this.pagemonitor = configuration.pagemonitor;
        this.loading = false;
      });
  }

  save() {
    this.loading = true;
    var postData = {username: this.username, password: this.password, opml: this.opml, pagemonitor: this.pagemonitor};
    if(postData.password === null || postData.password === undefined || postData.password === '')
      delete postData.password;
    this.httpService.post("user/configuration", postData)
      .subscribe((res: Response) => {
        this.update();
      });
  }
}
