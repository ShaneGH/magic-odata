import { Component } from '@angular/core';
import { ODataClient as AngularBlobODataClient } from 'src/clients/generatedCode-angular-blob';
import { ODataClient as AngularStringODataClient } from 'src/clients/generatedCode-angular';
import { ODataClient as AngularArrayBufferODataClient } from 'src/clients/generatedCode-angular-arraybuffer';
import { ODataClient as FetchClient } from 'src/clients/generatedCode-fetch';

@Component({
  selector: 'app-root'
})
export class AppComponent {

  constructor(
    public angularArrayBufferClient: AngularArrayBufferODataClient,
    public angularBlobClient: AngularBlobODataClient,
    public angularStringClient: AngularStringODataClient,
    public fetchClient: FetchClient) {
  }
}
