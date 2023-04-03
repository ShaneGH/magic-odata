
import { QueryComplexObject, QueryEnum, queryUtils } from "magic-odata-client";
import { My } from "../generatedCode.js";
import { addUser } from "../utils/client.js";
import { oDataClient, uriClient } from "../utils/odataClient.js";

function loggingFetcher(input: RequestInfo | URL, init?: RequestInit) {
    console.log(input, init)
    return fetch(input, init)
}

describe("Query", function () {

    describe("Query after $value", () => {

        it("Should be able to query after $value", async () => {
            const userProfileType: string = await uriClient.Users
                .withKey(x => x.key("123"))
                .subPath(x => x.UserProfileType)
                .subPath(x => x.$value)
                // part of the test here is the type info
                .withQuery((p: QueryEnum<My.Odata.Entities.UserProfileType>, { $filter: { eq } }) => eq(p, My.Odata.Entities.UserProfileType.Advanced))
                .get();

            expect(userProfileType).toBe("xxx/Users('123')/UserProfileType/$value?$filter=%24it%20eq%20My.Odata.Entities.UserProfileType'Advanced'");
        });
    });

    describe("Query after $count", () => {

        it("Should be able to query after $count", async () => {
            const user = await addUser();
            const result: number = await oDataClient.Users
                .subPath(u => u.$count)
                // part of the test here is the type info
                .withQuery((u: My.Odata.Entities.QueryableUser, { $filter: { eq } }) => eq(u.Id, user.Id))
                .get();

            expect(result).toBe(1);
        });


        it("Should be able to query after cast and $count", async () => {
            const result: string = await uriClient.HasIds
                .cast(x => x.User())
                .subPath(u => u.$count)
                // part of the test here is the type info
                .withQuery((u: My.Odata.Entities.QueryableUser, { $filter: { eq } }) => eq(u.Id, "1234"))
                .get<Promise<string>>();

            expect(result).toBe(`xxx/HasIds/My.Odata.Entities.User/$count?$filter=Id%20eq%20'1234'`);
        });

    });

    describe("QueryEnums", () => {

        it("Should query string enums correctly", async () => {
            const result = await oDataClient.AppDetails
                .subPath(x => x.UserProfileTypes)
                .withQuery((app, { $filter: { eq } }) => eq(app, My.Odata.Entities.UserProfileType.Advanced))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0]).toBe(My.Odata.Entities.UserProfileType.Advanced);
        });

        it("Should query numberic enums correctly", async () => {
            const result = await oDataClient.AppDetails
                .subPath(x => x.UserTypes)
                .withQuery((app, { $filter: { eq } }) => eq(app, My.Odata.Entities.UserType.User))
                .get();

            expect(result.value.length).toBe(1);
            expect(result.value[0]).toBe(My.Odata.Entities.UserType[My.Odata.Entities.UserType.User]);
        });
    });

    // if there are duplicate keys in adjacent properties, then 
    // the user will not be able to use deconstruction to get operators
    it("Has uniquely named keys at all levels", () => {

        const allKeys = getKeys(queryUtils())
        const propNames = allKeys
            .map(key => ({ key, propName: key.substring(key.lastIndexOf(".")) }))
            .reduce((s, { key, propName }) => s[propName]
                ? { ...s, [propName]: [...s[propName], key] }
                : { ...s, [propName]: [key] }
                , {} as { [k: string]: string[] })

        const duplicates = Object
            .keys(propNames)
            .map(p => {
                if (propNames[p].length < 2) return null;

                const sorted = [...propNames[p]].sort()
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].indexOf(sorted[i - 1] + ".") !== 0) {
                        return sorted
                    }
                }

                return null;
            })
            .filter(x => !!x)

        expect(duplicates).toEqual([]);

        function getKeys(obj: any): string[] {
            return Object
                .keys(obj)
                .reduce((s, x) => [
                    ...s,
                    x,
                    ...(typeof obj[x] === "object"
                        ? getKeys(obj[x]).map(y => `${x}.${y}`)
                        : [])
                ], [] as string[])
        }
    })
});