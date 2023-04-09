
# Contributing

This project is open to any contributions

## Add a bug or feature request

Create [github issues](https://github.com/ShaneGH/magic-odata/issues) for bugs or feature requests

Use labels [bug](https://github.com/ShaneGH/magic-odata/labels/bug) or [feature-request](https://github.com/ShaneGH/magic-odata/labels/feature-request)

## Create a pull request

Prerequisites:

 * Windows or linux os. (Mac is thoretically possible, but untested)
 * nodejs (v18, but earler versions are possible)
 * typescript (^4.9.1)
 * [Dotnet6 (windows, linux or mac)](#why-dotnet)

### Code structure

There are 5 projects in this repo

 * [./magic-odata-shared](https://github.com/ShaneGH/magic-odata/tree/main/magic-odata-shared) contains some shared interfaces between prod packages
 * [./magic-odata-code-gen](https://github.com/ShaneGH/magic-odata/tree/main/magic-odata-code-gen)
 * [./magic-odata-client](https://github.com/ShaneGH/magic-odata/tree/main/magic-odata-client)
 * [./tests/magic-odata-tests](https://github.com/ShaneGH/magic-odata/tree/main/tests/magic-odata-tests) contains the majority of tests
 * [./tests/magic-odata-tests-browser](https://github.com/ShaneGH/magic-odata/tree/main/tests/magic-odata-tests-browser) contains some browser specific tests, as well as some tests with different code gen config

### Getting started

 1. Run a getting started script: `./setupEnvironment.ps1` or `./setupEnvironment.sh`
 2. Start a test server: `cd ./tests/TestServer; dotnet run`
    * This step is optional on windows. The test scripts will do this for you
 3. In a new shell, execute tests
    * Windows `cd ./tests/magic-odata-tests; npm run build-and-test-win`
    * Unix `cd ./tests/magic-odata-tests; npm run build-and-test-unix`

## Why dotnet?

As much as possible, tests are run against a real odata server. Since microsoft have a founding stake in odata it seems that Microsoft tools should be used to verify test cases.

[Eventually this will be refactored out](https://github.com/ShaneGH/magic-odata/issues/14)



