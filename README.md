# magic-odata
Magical OData client generation for typescript. No more `string`. No more `any`!

## Install

`npm i magic-odata-code-gen --save-dev; npm i magic-odata-client;`

 * `magic-odata-code-gen` is a dev dependency required to generate a client at compile time
     * This tool is small and we recommend installing it locally per project in order to avoid versioning issues
 * `magic-odata-client` is a dependency of your application. The generated code will use this package

## Generate

`node node_modules/magic-odata-code-gen/dist/index.js --metadataUrl "https://raw.githubusercontent.com/ShaneGH/magic-odata/main/docs/sampleOdataMetadata.xml"`

## Use

```typescript
// import a generated client
import { ODataClient } from "./odataClient.js"

// create a client instance
const oDataClient = new ODataClient({
    // inject a basic Http client
    request: (input, init) => fetch(input, init),

    // add a root URI
    uriRoot: "http://my.odata.server/odata"
})

// Use the client!
const users = oDataClient.BlogPosts
    .withQuery((blog, {
        filter: {gt, or}, 
        orderBy: {orderBy}, 
        paging
    }) => [ 
        or(gt(blog.Comments.$count, 100), gt(blog.Likes, 100)),
        orderBy(blog.Name),
        paging(10, 0)
    ])
    .get();
```

## Why?

Write safe, statically typed odata queries in typescript. No more `string`. No more `any`!

 * Cut down on runtime errors
 * Explore OData API possibilities in your IDE
 * Runs in the browser or in node
 * No prod dependencies. Small bundle size
    * Generated executable code is tiny. Almost all generated code is `type` information
    * `magic-odata-client` minifies to ~24KB
 * Optional angular mode, for the angular `HttpClient`

## Features

 * Code gen configuration
    * $metadata files protected with authentication
    * Angular mode
 * Client configuration
 * Entity keys
 * Entity path
 * Query options
    * $filter
    * $select
    * $expand
    * $orderBy
    * $search
    * $skip, $top and $count
    * custom
 * Casting
 * $value

## Contributing