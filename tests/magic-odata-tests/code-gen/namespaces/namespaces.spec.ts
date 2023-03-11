
// test failures will be compile errors

import { NS1, NamespaceClient, Entity1 } from "./generatedCode.js";

describe("Namespace code gen cases ()", () => {
    const client: NamespaceClient = {} as any
    it("Should namespace classes", () => {
        const yy: Entity1 = 1 as any
    });

    describe("Collections ()", () => {

        it("Should expose entity function", () => {
            client.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3())
        });
    });
});

describe("Namespace code gen cases (NS1)", () => {
    const client: NS1.NamespaceClient = {} as any
    it("Should namespace classes", () => {
        const yy: NS1.Entity2 = 1 as any
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3())
        });
    });
});

describe("Namespace code gen cases (NS1.NS2)", () => {
    const client: NS1.NS2.NamespaceClient = {} as any
    it("Should namespace classes", () => {
        const yy: NS1.NS2.Entity3 = 1 as any
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3())
        });
    });
});

describe("Namespace code gen cases (NS1.NS3)", () => {
    const client: NS1.NS3.NamespaceClient = {} as any
    it("Should namespace classes", () => {
        const yy: NS1.NS3.Entity1 = 1 as any
    });

    describe("Collections ()", () => {

        it("Should expose entity function", () => {
            client.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1)", () => {

        it("Should expose entity function", () => {
            client.C1.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3())
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3())
        });
    });
});