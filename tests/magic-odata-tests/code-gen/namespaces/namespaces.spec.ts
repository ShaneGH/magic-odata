
// test failures will be compile errors

import { NS1 } from "./generatedCode.js";

describe("Namespace code gen cases (NS1.NS2)", () => {
    const client1: NS1.NS2.NamespaceClient = {} as any
    describe("Collections (C1.C2)", () => {
        it("Should namespace classes", () => {
            const yy: NS1.NS2.Entity = 1 as any
        });

        it("Should expose entity sets", () => {
            client1.C1.C2.Entities.subPath
        });

        it("Should expose singletons", () => {
            client1.C1.C2.Entity.subPath
        });

        it("Should expose entiy function", () => {
            client1.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client1.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            throw new Error();
        });
    });


    describe("Collections (C1.C3)", () => {
        it("Should namespace classes", () => {
            const yy: NS1.NS2.Entity = 1 as any
        });

        it("Should expose entity sets", () => {
            client1.C1.C3.Entities.subPath
        });

        it("Should expose singletons", () => {
            client1.C1.C3.Entity.subPath
        });

        it("Should expose entiy function", () => {
            client1.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client1.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            throw new Error();
        });
    });
});

describe("Namespace code gen cases (NS1.NS3)", () => {
    const client1: NS1.NS3.NamespaceClient = {} as any
    describe("Collections (C1.C2)", () => {
        it("Should namespace classes", () => {
            const yy: NS1.NS3.Entity = 1 as any
        });

        it("Should expose entity sets", () => {
            client1.C1.C2.Entities.subPath
        });

        it("Should expose singletons", () => {
            client1.C1.C2.Entity.subPath
        });

        it("Should expose entiy function", () => {
            client1.C1.C2.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client1.C1.C2.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            throw new Error();
        });
    });


    describe("Collections (C1.C3)", () => {
        it("Should namespace classes", () => {
            const yy: NS1.NS3.Entity = 1 as any
        });

        it("Should expose entity sets", () => {
            client1.C1.C3.Entities.subPath
        });

        it("Should expose singletons", () => {
            client1.C1.C3.Entity.subPath
        });

        it("Should expose entiy function", () => {
            client1.C1.C3.Entity.subPath(x => x.F1())
        });

        it("Should expose collection function", () => {
            client1.C1.C3.Entities.subPath(x => x.F2())
        });

        it("Should expose unbound function", () => {
            throw new Error();
        });
    });
});