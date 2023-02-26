

 * [Installation](#installation)
 * [Code generation](#code-generation)
 * [Client configuration](#client-configuration)
 * [Angular configuration](#angular-configuration)
 * [Basic Queries](#basic-queries)
 * [Uri Generation](#uri-generation)
 * [Key lookup](#key-lookup)
 * [Sub path lookup](#sub-path-lookup)
    * [$value and $count](#value-and-count)
 * [Query options](#query-options)
    * [$filter](#filter)
    * [$select](#select)
    * [$expand](#expand)
    * [$orderBy](#orderby)
    * [$search](#search)
    * [$skip, $top and $count](#paging)
    * [custom](#custom)
 * [Casting](#casting)

# Installation

`npm i magic-odata-code-gen --save-dev; npm i magic-odata-client;`

 * `magic-odata-code-gen` is a dev dependency required to generate a client at compile time
     * This tool is small and we recommend installing it locally per project in order to avoid versioning issues
 * `magic-odata-client` is a dependency of your application. The generated code will use this package

# Code generation

Generate code using the `magic-odata-code-gen/dist/index.js` tool. For help, run `node node_modules/magic-odata-code-gen/dist/index.js --help`

## Quick no config generation

To generate quick client from a URI, specify the `--metadataUrl` arg

 * `node node_modules/magic-odata-code-gen/dist/index.js --metadataUrl "https://raw.githubusercontent.com/ShaneGH/magic-odata/main/docs/sampleOdataMetadata.xml"`

OData metadata is published by OData servers. It usually ends eith `/$metadata`. You can find out more about metadata [on the OData website](https://www.odata.org/blog/queryable-odata-metadata/)

## Configurable client generation

To generate a configurable client from a URI, specify the `--config` arg

 * `node node_modules/magic-odata-code-gen/dist/index.js --config ./my-config-file.json`

The schema of the config file is documented [in config.ts](../magic-odata-code-gen/src/config.ts). Example:

```json
{
    "inputFileLocation": {
        "fromUri": "https://my.odata.server.com/odata/$metadata"
    },
    "outputFileLocation": "./odata-client.ts",
    "httpHeaders": [
        ["Accept", "application/xml"]
    ],
    "codeGenSettings": {
        "oDataClientName": "MyODataClient"
    }
}
```

## Authenticating

Many odata servers will protect their $metadata. There are 2 ways to overcome this, depending on where the client is being generated

### Authenticating client generation on your local machine

For this case you do not need any extra configuration. When the request to the $metadata file fails, you will be prompted to enter the necessary http headers which will authenticate the next request

### Authenticating client generation on a CI server

For this case you must specify the required headers in a config file or using the `--httpHeaders` arg. In order to prevent prompts you must also specify the `--ciMode` arg or the `"ciMode": true` property in config

# Client configuration

OData clients are configured using the [RequestTools](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/entitySet/requestTools.ts) type. Example:

```typescript
const oDataClient = new ODataClient({
    // MANDATORY: the HTTP client that will do all of the low level work
    // Browser fetch, node fetch API and the "node-fetch" module all work well here
    request: (input, init) => fetch(input, init),

    // MANDATORY: the root uri for queries
    uriRoot: "https://my.odata.server.com/odata",

    // OPTIONAL: add custom logic for building URIs
    uriInterceptor: (uri: ODataUriParts) => {

        let queryPart = Object
            .keys(uri.query)
            .map(x => `${x}=${uri.query[x]}`)
            .join("&");

        const uriRoot = removeTrailingSlash(uri.uriRoot)
        const entityName = addLeadingSlash(removeTrailingSlash(uri.relativePath))
        queryPart = queryPart && `?${queryPart}`

        return `${uriRoot}${entityName}${queryPart}`
    },

    // OPTIONAL: add custom logic for modifying a RequestOptions object before it is executed
    requestInterceptor: (url: string, options: RequestOptions) => {
        return {
            ...options,
            headers: [
                ...options.headers
                ["Authorization", "Bearer eyJhbGciOi...."]
            ]
        }
    },

    // OPTIONAL: add custom logic for parsing raw HTTP responses
    // use the defaultInterceptor to use the inbuilt framework parsing
    responseInterceptor: async (input, url, options, defaultInterceptor) => {
        const defaultResult = await defaultInterceptor(input, url, options)
        console.log(`Received ${defaultResult["@odata.count"]} results`)

        return defaultResult
    }
})
```

# Angular configuration

Angular configuration differs from normal configuration in two ways

 1. Requests are executed by the angular `HttpClient` rather than the `fetch` api
 2. The `HttpClient` returns `Observable` instead of `Promise`

In order to use angular mode you must:

## 1 - Specify `angularMode` in code gen config

See [CodeGenConfig](../magic-odata-code-gen/src/config.ts) for all angular configuration modes

```json
{
    "inputFileLocation": {
        "fromUri": "..."
    },
    "outputFileLocation": "...",
    "angularMode": true
}
```

## 2 - Wire up an angular client in a DI factory

In app.module.ts. See [client configuration](#client-configuration) for more info on client input args

```typescript
@NgModule({
  providers: [{
    provide: MyODataClient,
    deps: [HttpClient],
    useFactory: (ngClient: HttpClient) => new MyODataClient({
        request: (uri, args) => {
            // map from fetch headers to ng HttpClient headers
            const headers: { [k: string]: string[] } = args.headers?.reduce((s, x) => ({
                ...s,
                [x[0]]: [...s[x[0]] || [], x[1]]
            }), {} as { [k: string]: string[] });

            return ngClient.request(args.method, uri.toString(), {
                headers: headers,
                observe: "response",

                // If angularMode is set to true, this value must be set to "text".
                // angularMode can be set with finer detail, in which case this can 
                // be set to "arraybuffer" or "blob"
                responseType: "text"
            })
        },
        uriRoot: ...
    })
  }],
  ...
})
export class AppModule { }
```

# Basic Queries

Execute a query by chaining optional odata operations (e.g. path, key lookup, query) and calling the `get` method

```typescript
// get all users
const users = new MyOdataCliet({...})
    .Users
    .get()
```

# Uri Generation

You can also use the client to build a URI without executing a HTTP request

```typescript
// get all users
const userUriComponents = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $filter: { eq } }) => eq(user.Id, '123'))
    // the argument specifies whether to encode uri componentes or not
    .uri(false)
```

# Key Lookup

```typescript
const user = new MyOdataCliet({...})
    .Users
    .withKey(x => x.key(user.Id))
    .get()

// use a lookup without type safety
const userName = new MyOdataCliet({...})
    .Users
    .withKey(k => k.keyRaw("'123'"))
    .get()
```

# Sub Path Lookup

```typescript
// use a type safe lookup
const userName = new MyOdataCliet({...})
    .Users
    .withKey(k => k.key(user.Id))
    .subPath(user => user.Name)
    .get()
```

## $value and $count

The $value path allows you to get a primitive value as a string

```typescript
const userName = new MyOdataCliet({...})
    .User
    .withKey(k => k.key(user.Id))
    .subPath(user => user.Name)
    .subPath(name => name.$value)
    .get();
```

The $count path allows you to get a raw count of items as a number

```typescript
const userName = new MyOdataCliet({...})
    .User
    .subPath(user => user.$count)
    .get();
```

# Query Options

Use the `withQuery` function to add query params to a request. Query tools can be combined to form a complex query url

```typescript
// combine $filter, $orderby, $skip and $top query params
const users = new MyOdataCliet({...})
    .User
    .withQuery((user, {
        $filter: {containsString},
        $orderby: {orderBy},
        $skip,
        $top
    }) => [
        containsString(user.Name, "John"),
        orderBy(user.Name),
        $skip(0),
        $top(10)
    ])
    .get();
```

## $filter

See [FilterUtils](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/filters.ts) for details of all filters

```typescript
// use the inbult eq filter
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $filter: { eq } }) => eq(user.Id, '123'))
    .get()

// use a custom filter with property paths
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $filter: { filterRaw } }) => 
        filterRaw({id: user.Id}, props => `${props.id} eq '123'`))
    .get()

// use a custom filter
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $filter: { filterRaw } }) => filterRaw("Id eq '123'"))
    .get()
```

## $select

See [SelectUtils](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/select.ts) for details of all select tools

```typescript
// use an inbuilt select
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $select: { select } }) => select(user.Name))
    .get()
    
// use a raw select
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $select: { selectRaw } }) => selectRaw("Id,Name"))
    .get()
```

## $expand

See [ExpandUtils](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/expand.ts) for details of all expand tools

```typescript
// simple expand clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expand } }) => expand(user.Friends))
    .get()
    
// complex expand clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expand }, { $select: { select } }) => 
        expand(user.Friends, f => select(f.name)))
    .get()

// expand *
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expandAll } }) => expandAll())
    .get()

// expand $ref
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expandRef } }) => expandRef())
    .get()

// expand $count
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expandCount } }) => expandCount(user.friends))
    .get()

// expand clause with nested query
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expand } }, { $filter: { eq } }) =>
        expand(user.Friends, friend => eq(friend.Id, 123)))
    .get()

// custom expand clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $expand: { expandRaw } }) => expandRaw("Friends"))
    .get()
```

## $orderby

See [OrderingUtils](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/orderBy.ts) for details of all orderby tools

```typescript
// simple orderby clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $orderBy: { orderBy } }) => orderBy(user.Name))
    .get()
    
// custom orderby clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $orderBy: { orderByRaw } }) => orderByRaw("Name"))
    .get()
```

## $search

See [SearchUtils](https://github.com/ShaneGH/magic-odata/blob/main/magic-odata-client/src/query/search.ts) for details of all search tools

```typescript
// inbuilt search clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $search: {term} }) => term("Search term1"))
    .get()
    
// custom search clause
const myUser = new MyOdataCliet({...})
    .Users
    .withQuery((user, { $search: { searchRaw } }) => searchRaw('"John" OR "Bob"'))
    .get()
```

## Paging

For a raw `$count` of entities or values, see [$value and $count](#value-and-count)

```typescript
const users = new MyOdataCliet({...})
    .User
    .withQuery((user, {
        $skip,
        $top,
        $count
    }) => [
        $skip(10),
        $top(10),
        $count()
    ])
    .get();
```

## Custom

The custom operator allows to you add anything as a URL parameter

```typescript
const users = new MyOdataCliet({...})
    .User
    .withQuery((user, {custom}) => [
        custom("$skip", 10),
        custom("$top", 10),
        custom("apiToken", "123456")
    ])
    .get();
```

# Casting

```typescript
const admins = new MyOdataCliet({...})
    .Users
    .cast(user => user.Admin())
    .get()
```