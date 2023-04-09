
// test failures will be compile errors

import { NS1, NS4, NS5, NamespaceClient, Entity1, CastingTests1 } from "./generatedCode.js";

describe("Namespace code gen cases ()", () => {
    const client: NamespaceClient = new NamespaceClient({} as any)
    it("Should namespace classes", () => {
        const yy: Entity1 = 1 as any
    });

    describe("Collections ()", () => {

        it("Should expose entity function", () => {
            client.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.unboundFunctions(x => x.F3()).uri()
        });
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3_12()).uri()
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3_12()).uri()
        });
    });
});

describe("Namespace code gen cases (NS1)", () => {
    const client: NS1.NamespaceClient = new NS1.NamespaceClient({} as any)
    it("Should namespace classes", () => {
        const yy: NS1.Entity2 = 1 as any
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3_12()).uri()
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3_12()).uri()
        });
    });
});

describe("Namespace code gen cases (NS1.NS2)", () => {
    const client: NS1.NS2.NamespaceClient = new NS1.NS2.NamespaceClient({} as any)
    it("Should namespace classes", () => {
        const yy: NS1.NS2.Entity3 = 1 as any
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3_12()).uri()
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3_12()).uri()
        });
    });
});

describe("Namespace code gen cases (NS1.NS3)", () => {
    const client: NS1.NS3.NamespaceClient = new NS1.NS3.NamespaceClient({} as any)
    it("Should namespace classes", () => {
        const yy: NS1.NS3.Entity1 = 1 as any
    });

    describe("Collections ()", () => {

        it("Should expose entity function", () => {
            client.Entity.subPath(x => x.F1_13()).uri()
        });

        it("Should expose collection function", () => {
            client.Entities.subPath(x => x.F2_13()).uri()
        });

        it("Should expose unbound function", () => {
            client.unboundFunctions(x => x.F3_13()).uri()
        });
    });

    describe("Collections (C1)", () => {

        it("Should expose entity function", () => {
            client.C1.Entity.subPath(x => x.F1_13()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.Entities.subPath(x => x.F2_13()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.unboundFunctions(x => x.F3_13()).uri()
        });
    });

    describe("Collections (C1.C2)", () => {

        it("Should expose entity function", () => {
            client.C1.C2.Entity.subPath(x => x.F1_13()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C2.Entities.subPath(x => x.F2_13()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C2.unboundFunctions(x => x.F3()).uri()
        });
    });

    describe("Collections (C1.C3)", () => {

        it("Should expose entity function", () => {
            client.C1.C3.Entity.subPath(x => x.F1_13()).uri()
        });

        it("Should expose collection function", () => {
            client.C1.C3.Entities.subPath(x => x.F2_13()).uri()
        });

        it("Should expose unbound function", () => {
            client.C1.C3.unboundFunctions(x => x.F3()).uri()
        });
    });
});

describe("Namespace code gen cases (NS4)", () => {
    const client: NS4.NamespaceClient = new NS4.NamespaceClient({} as any)

    it("Should expose unbound function", () => {
        client.C1.C2.unboundFunctions(x => x.F3_5({ x: 7 })).uri()
    });
});

describe("Namespace code gen cases (NS5)", () => {
    const client: NS5.NamespaceClient = new NS5.NamespaceClient({} as any)

    it("Is fine :)", () => {
    });
});

describe("Casting namespace clashes", () => {
    const client = new CastingTests1.Namespace.NamespaceClient({} as any)

    it("Should cast correctly (1)", () => {
        const result1 = client.Parents
            .cast(x => x.CastingTests1_Namespace_Child())
            .subPath(x => x.$count)
            .uri(false)

        const result2 = client.Parents
            .cast(x => x.CastingTests2_Namespace_Child())
            .subPath(x => x.$count)
            .uri(false)

        expect(result1.relativePath).toBe("Parents/CastingTests1.Namespace.Child/$count")
        expect(result2.relativePath).toBe("Parents/CastingTests2.Namespace.Child/$count")
    });
});