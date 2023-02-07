import { TestBed } from '@angular/core/testing';
import { addUser } from 'src/clients/client';
import { ODataClient, User } from 'src/clients/generatedCode-fetch';
import { ODataClient as AngularStringClient } from 'src/clients/generatedCode-angular';
import { ODataClient as BlobClient } from 'src/clients/generatedCode-angular-blob';
import { ODataClient as ArrayBuferClient } from 'src/clients/generatedCode-angular-arraybuffer';
import { AppComponent } from './app.component';
import { ODataCollectionResult } from 'magic-odata-client';

describe('Fetch client', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      providers: [{
        provide: ODataClient,
        useFactory: () => new ODataClient({
          request: (x, y) => fetch(x, y),
          uriRoot: "http://localhost:5432/odata/test-entities"
        })
      }, {
        provide: AngularStringClient,
        useFactory: () => null
      }, {
        provide: BlobClient,
        useFactory: () => null
      }, {
        provide: ArrayBuferClient,
        useFactory: () => null
      }]
    }).compileComponents();
  });

  it('Should process successful requests', async () => {

    const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
    const user = await addUser();
    // keep type annotation here. It is part of the test
    const items: ODataCollectionResult<User[]> = await client.Users
      .withQuery((u, { filter: { eq } }) => eq(u.Id, user.Id))
      .get();

    expect(items.value.length).toBe(1);
    expect(items.value[0].Name).toBe(user.Name);
  });

  it('Should process failed requests', async () => {
    const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
    try {
      await client.Users
        .withQuery((_, { filter: { filterRaw } }) => filterRaw("sadkas"))
        .get();

      expect(true).toBe(false)
    } catch {
      // GREATE SUCCESS
    }
  });
});
