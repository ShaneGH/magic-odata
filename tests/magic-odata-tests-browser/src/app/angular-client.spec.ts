import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, tap } from 'rxjs';
import { addUser } from 'src/clients/client';
import { ODataClient, User } from 'src/clients/generatedCode-angular';
import { ODataClient as FetchClient } from 'src/clients/generatedCode-fetch';
import { ODataClient as BlobClient } from 'src/clients/generatedCode-angular-blob';
import { ODataClient as ArrayBuferClient } from 'src/clients/generatedCode-angular-arraybuffer';
import { AppComponent } from './app.component';
import { ODataCollectionResult } from 'magic-odata-client';
// import { addUser } from "magic-odata-client-tests";

describe('Angular client with string output', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule],
      declarations: [
        AppComponent
      ],
      providers: [{
        provide: ODataClient,
        useFactory: (ngClient: HttpClient) => new ODataClient({
          request: (x, y) => {
            const headers: { [k: string]: string[] } = y?.headers?.reduce((s, x) => ({
              ...s,
              [x[0]]: [...s[x[0]] || [], x[1]]
            }), {} as { [k: string]: string[] });

            return ngClient.request(y.method, x.toString(), {
              headers: headers,
              observe: "response",
              responseType: "text"
            })
          },
          uriRoot: "http://localhost:5432/odata/test-entities"
        }),
        deps: [HttpClient]
      }, {
        provide: FetchClient,
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

    const client = TestBed.createComponent(AppComponent).componentInstance.angularStringClient;
    const user = await addUser();
    // keep type annotation here. It is part of the test
    const items: Observable<ODataCollectionResult<User[]>> = client.Users
      .withQuery((u, { $filter: { eq } }) => eq(u.Id, user.Id))
      .get();

    return await new Promise((res, rej) => {
      const timeout = setTimeout(() => {
        rej(new Error("timeout"))
      }, 1000);

      items.pipe(tap(x => {
        clearTimeout(timeout)
        expect(x.value.length).toBe(1);
        expect(x.value[0].Name).toBe(user.Name);
        res({});
      })).subscribe();
    })
  });

  it('Should process failed requests', async () => {
    const client = TestBed.createComponent(AppComponent).componentInstance.angularStringClient;
    const items = client.Users
      .withQuery((_, { $filter: { filterRaw } }) => filterRaw("sadkas"))
      .get();

    return await new Promise((res, rej) => {
      const timeout = setTimeout(() => {
        rej(new Error("timeout"))
      }, 1000);

      items.pipe(tap(x => {
        rej(new Error("success"))
      })).subscribe({
        error: err => {
          clearTimeout(timeout)
          res({});
        }
      });
    })
  });
});
