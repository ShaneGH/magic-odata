
import { queryUtils } from "magic-odata-client";

describe("Query", function () {

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