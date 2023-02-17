import { Search } from "../queryBuilder.js"

export type SearchUtils = {

    /**
     * Search for a term
     */
    term(term: string): Search

    /**
     * Combine search terms with an AND separator
     */
    searchAnd(...terms: Search[]): Search

    /**
     * Combine search terms with an OR separator
     */
    searchOr(...terms: Search[]): Search

    /**
     * Negate a search term with NOT
     */
    searchNot(term: Search): Search

    /**
     * Add a custom search term
     * @example searchRaw('NOT "bob"')
     */
    searchRaw(searchString: string): Search
}

function term(term: string): Search {
    return {
        $$oDataQueryObjectType: "Search",
        $$search: `"${term}"`
    }
}

function searchAnd(...terms: Search[]): Search {
    return {
        $$oDataQueryObjectType: "Search",
        $$search: `(${terms.map(x => x.$$search).join(" AND ")})`
    }
}

function searchOr(...terms: Search[]): Search {
    return {
        $$oDataQueryObjectType: "Search",
        $$search: `(${terms.map(x => x.$$search).join(" OR ")})`
    }
}

function searchNot(term: Search): Search {
    return {
        $$oDataQueryObjectType: "Search",
        $$search: `(NOT ${term.$$search})`
    }
}

function searchRaw(searchString: string): Search {
    return {
        $$oDataQueryObjectType: "Search",
        $$search: searchString
    }
}

export function newUtils(): SearchUtils {
    return {
        term,
        searchAnd,
        searchOr,
        searchNot,
        searchRaw
    }
}