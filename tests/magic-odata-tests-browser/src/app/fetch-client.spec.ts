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
      .withQuery((u, { $filter: { eq } }) => eq(u.Id, user.Id))
      .get();

    expect(items.value.length).toBe(1);
    expect(items.value[0].Name).toBe(user.Name);
  });

  it('Should process failed requests', async () => {
    const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
    try {
      await client.Users
        .withQuery((_, { $filter: { filterRaw } }) => filterRaw("sadkas"))
        .get();

      expect("INVALID").toBe("NOT INVALID")
    } catch (e: any) {
      expect(e.toString().indexOf("INVALID")).toBe(-1);
    }
  });

  describe("$value", () => {

    it("Should retrieve enum as $value", async () => {
      const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
      const user = await addUser();
      const userProfileType: string = await client.Users
        .withKey(x => x.key(user.Id!))
        .subPath(x => x.UserProfileType)
        .subPath(x => x.$value)
        .get();

      expect(userProfileType).toBe(user.UserProfileType);
    });

    it("Should retrieve primitive as $value", async () => {
      const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
      const user = await addUser();
      const likes: string = await client.Users
        .withKey(x => x.key(user.Id!))
        .subPath(x => x.Score)
        .subPath(x => x.$value)
        .get();

      expect(typeof likes).toBe("string");
      expect(likes).toBe(user.Score.toString());
    });
  })

  describe("$count", () => {

    it("Should retrieve entity set $count", async () => {
      const client = TestBed.createComponent(AppComponent).componentInstance.fetchClient;
      await addUser();
      const count: number = await client.Users
        .subPath(x => x.$count)
        .get();

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(1);
    });
  })
});
