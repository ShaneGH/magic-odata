
class Test {
    constructor() {
        this.prop = "X"
    }

    dox() {
        return 2
    }
}

const tested = new Test()
const proxy = new Proxy({}, {
    get(target, p, receiver) {
        console.log("#", p, receiver)
        return target[p]
    },
    apply(target, thisArg, argArray) {
        // if (typeof target === "function") {
        //     return target.apply(thisArg, argArray)
        // }

        console.log("tt")
        return 55
    }
})

function buildProxy(id) {
    return {
        /**
         * A trap method for a function call.
         * @param target The original callable object which is being proxied.
         */
        apply() {
            console.log(`#1 ${id}`)
        },
        construct() {
            console.log(`#2 ${id}`)
        },
        defineProperty() {
            console.log(`#3 ${id}`)
        },
        deleteProperty() {
            console.log(`#4 ${id}`)
        },
        get() {
            console.log(`#5 ${id}`)

            if (arguments[1] === Symbol.toPrimitive) {
                return function () { return id }
            }
        },
        getOwnPropertyDescriptor() {
            console.log(`#6 ${id}`)
        },
        getPrototypeOf() {
            console.log(`#7 ${id}`)
        },
        has() {
            console.log(`#8 ${id}`)
        },
        isExtensible() {
            console.log(`#9 ${id}`)
        },
        ownKeys() {
            console.log(`#10 ${id}`)
        },
        preventExtensions() {
            console.log(`#11 ${id}`)
        },
        set() {
            console.log(`#12 ${id}`)
        },
        setPrototypeOf() {
            console.log(`#13 ${id}`)
        }
    }
}

const px = new Proxy({}, buildProxy("x"))
const py = new Proxy({}, buildProxy("y"))

px.toString = function () {
    console.log("'''")
    return "yyyy"
}

console.log(px + py)

// const { dox } = proxy
// dox()

// function xx({ dox }) {
//     dox()
// }

// xx(proxy)

//console.log(proxy())
