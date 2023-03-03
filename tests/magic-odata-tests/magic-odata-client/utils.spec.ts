
import { treeify } from "../../../magic-odata-code-gen/src/utils.js"


describe("treeify", function () {
    const tree = treeify([
        [["a"], 4],
        [["d", "e"], 7],
        [[], 1],
        [["a"], 3],
        [["a", "b"], 5],
        [[], 2],
        [["a", "c"], 6],
        [["d", "f", "a"], 8]
    ])

    it("works as expected", () => {
        expect(tree).toEqual({
            value: [1, 2],
            children: {
                "a": {
                    value: [4, 3],
                    children: {
                        "b": {
                            value: [5],
                            children: {}
                        },
                        "c": {
                            value: [6],
                            children: {}
                        }
                    }
                },
                "d": {
                    value: [],
                    children: {
                        "e": {
                            value: [7],
                            children: {}
                        },
                        "f": {
                            value: [],
                            children: {
                                "a": {
                                    value: [8],
                                    children: {}
                                }
                            }
                        }
                    }
                }
            }
        })
    })
});
