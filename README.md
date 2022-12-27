# [mongodb-cursor-pagination](<https://github.com/murshidazher/mongo-cursor-pagination>) [![npm](https://img.shields.io/npm/v/mongo-cursor-pagination.svg?label=&color=0080FF)](https://github.com/murshidazher/mongo-cursor-pagination/releases/latest)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/murshidazher/mongo-cursor-pagination/release.yml?branch=master&style=flat-square)
![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)

> Cursor-based pagination for MongoDB.

Based on [mongo-cursor-pagination](https://github.com/mixmaxhq/mongo-cursor-pagination) but written from scratch in TypeScript with an API that resembles the [cursor connection spec from Relay](https://facebook.github.io/relay/graphql/connections.htm).

<!-- toc -->

- [mongodb-cursor-pagination ](#mongodb-cursor-pagination-)
  - [The problem](#the-problem)
  - [The solution](#the-solution)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API](#api)
    - [`findPaginated`](#findpaginated)
      - [Arguments](#arguments)
      - [Returns](#returns)
    - [`aggregatePaginated`](#aggregatepaginated)
      - [Arguments](#arguments-1)
      - [Returns](#returns-1)
  - [License](#license)

<!-- tocstop -->

## The problem

By default, MongoDB allows us to paginate results with `limit` and `skip`. That's known as offset-based pagination. It's definitely the simplest way to paginate, but in some situations it's not very **stable**.

Imagine you have a restaurant software showing a list of orders paginated with `limit: 3` and `skip: 0`:

- `{ _id: ObjectId, number: 53 }`
- `{ _id: ObjectId, number: 52 }`
- `{ _id: ObjectId, number: 51 }`

Nice, so far so good. Now, when you click the button to see the next page, here's what you'd expect to see (`limit: 3`, `skip: 3`):

- `{ _id: ObjectId, number: 50 }`
- `{ _id: ObjectId, number: 49 }`
- `{ _id: ObjectId, number: 48 }`

Pretty reasonable, right? By using `skip: 3` we're basically telling MongoDB `hey, I want to skip orders #53, #52 and #51`.

**But imagine a new order (#54) arrived while we were staring at the 1st page**. In that case, querying with `skip: 3` would actually give us:

- `{ _id: ObjectId, number: 51 }`
- `{ _id: ObjectId, number: 50 }`
- `{ _id: ObjectId, number: 49 }`

That's because in this new scenario we're actually telling MongoDB `hey, I want to skip orders #54, #53 and #52`.

If you have any trouble to fully comprehend what's happening here, try to imagine the following scenario yourself:

- You've queried the 1st page with `limit: 3` and `skip: 0`.
- While you are looking at the 1st page, 200 new orders arrive.
- What will you see when you try to query the 2nd page with `limit: 3` and `skip: 3`?

## The solution

**So how can we make sure that the 2nd page always start from the order #50** no matter how many orders have been received in the meantime? Well, a naive approach would be like:

```ts
collection
  .find({ number: { $lt: 51 } }
  .sort({ number: -1 })
  .toArray()
```

And that's somewhat what this lib does but in a much more robust way.

For a more thorough explanation I highly recommend reading the excellent [blog post from Mixmax](https://engineering.mixmax.com/blog/api-paging-built-the-right-way). You can also read the source code — I tried to add helpful comments.

## Installation

```sh
npm i mongodb-cursor-pagination
```

```sh
yarn add mongodb-cursor-pagination
```

## Usage

```ts
import { MongoClient } from 'mongodb'
import { findPaginated } from 'mongodb-cursor-pagination'

const client = await MongoClient.connect(uri)
const db = client.db()
const collection = db.collection('users')

let skipFirst20

// Get third page
skipFirst20 = await findPaginated(collection, {
  first: 10,
  skip: 20
})


let result

// Get first page
result = await findPaginated(collection, {
  first: 10
})

// Go to second page
result = await findPaginated(collection, {
  first: 10,
  after: result.pageInfo.endCursor,
})

// Back to first page
result = await findPaginated(collection, {
  last: 10,
  before: result.pageInfo.startCursor,
})
```

## API

### `findPaginated`

Runs a paginated query on top of `Collection#find`.

#### Arguments

- `collection`: The MongoDB collection.
- `params`:
  - Properties:
    - `first`: How many documents to get (forwards pagination).
    - `after`: The cursor (forwards pagination).
    - `last`: How many documents to get (backwards pagination).
    - `before`: The cursor (backwards pagination).
    - `query`: The query to be passed to `Collection#find`.
    - `sort`: The sort to be passed to `Collection#find`.
    - `projection`: The projection to be passed to `Collection#find`.

#### Returns

- `edges`: An array with the contents of the page.
  - Properties:
    - `node`: The document.
    - `cursor`: An opaque string pointing to this document in the context of this query. It can be passed to parameters `after` or `before` to get a page starting after or before this document.
- `pageInfo`:
  - Properties
    - `startCursor`: The cursor of the first document in this page.
    - `endCursor`: The cursor of the last document in this page.
    - `hasPreviouPage`: Whether there's another page before this one.
    - `hasNextPage`: Whether there's another page after this one.

### `aggregatePaginated`

Runs a paginated aggregation on top of `Collection#aggregate`.

#### Arguments

- `collection`: The MongoDB collection.
- `params`:
  - Properties:
    - `first`: How many documents to get (forwards pagination).
    - `after`: The cursor (forwards pagination).
    - `last`: How many documents to get (backwards pagination).
    - `before`: The cursor (backwards pagination).
    - `pipeline`: The pipeline array to be passed to `Collection#aggregate`.
    - `sort`: The sort to be passed to `Collection#aggregate`.

#### Returns

- `edges`: An array with the contents of the page.
  - Properties:
    - `node`: The document.
    - `cursor`: An opaque string pointing to this document in the context of this query. It can be passed to parameters `after` or `before` to get a page starting after or before this document.
- `pageInfo`:
  - Properties
    - `startCursor`: The cursor of the first document in this page.
    - `endCursor`: The cursor of the last document in this page.
    - `hasPreviouPage`: Whether there's another page before this one.
    - `hasNextPage`: Whether there's another page after this one.

## License

Released under the [MIT License](./LICENSE.md).
