
# magic-odata
Magical OData client generation for typescript. No more `string`. No more `any`!

[![Node.js CI](https://github.com/ShaneGH/magic-odata/actions/workflows/node.js.yml/badge.svg)](https://github.com/ShaneGH/magic-odata/actions/workflows/node.js.yml)
[![NPM]](https://img.shields.io/npm/v/magic-odata-client.svg?style=flat)
[![Coverage Status](https://coveralls.io/repos/github/ShaneGH/magic-odata/badge.svg?branch=main)](https://coveralls.io/github/ShaneGH/magic-odata?branch=main)
[![License]](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)

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
    uriRoot: "https://my.odata.server/odata"
})

// use the client!
const popularBlogPosts = oDataClient.BlogPosts
    // Use object deconstruction to choose query tools
    .withQuery((blogPost, {
        $orderby: {orderBy}, 
        $skip, 
        $top
    }) => [ 
        // Combine query tools and fluent operations to build a query
        blogPost.Comments.$count.gt(100).or(blogPost.Likes.gt(100)),
        orderBy(blogPost.Name),
        $skip(0),
        $top(10)
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
    * `magic-odata-client` minifies and compresses to ~10KB
 * Optional angular mode, for the angular `HttpClient`

## Features

 See [Features.md](https://github.com/ShaneGH/magic-odata/blob/main/docs/Features.md)

 * Code gen configuration
    * $metadata files protected with authentication
    * Angular mode
 * Client configuration
 * OData GET requests
 * OData URI generation
 * Entity keys
 * Entity path
 * @Parameter aliases
 * Enums
 * Functions
 * Indexed ordered collections
 * Query options
    * $filter
        * fluent comparison operators
    * $select
    * $expand
        * $levels
    * $orderBy
    * $search
    * $skip, $top and $count
    * custom
    * $root
 * Casting
 * $value

## Contributing

See [Contributing.md](https://github.com/ShaneGH/magic-odata/blob/main/Contributing.md)