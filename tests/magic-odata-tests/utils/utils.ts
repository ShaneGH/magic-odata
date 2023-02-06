
export const { uniqueString, uniqueNumber } = (function () {
    let i = parseInt((new Date().getTime() / 100).toFixed());
    return {
        uniqueString: (prefix = "string_") => `${prefix}${++i}`,
        uniqueNumber: () => ++i
    };
})();