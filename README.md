[![npm version](https://badge.fury.io/js/datastore-geo.svg)](https://badge.fury.io/js/datastore-geo)
[![Build Status](https://travis-ci.com/damack/datastore-geo.svg?branch=master)](https://travis-ci.com/damack/datastore-geo)
[![codecov](https://codecov.io/gh/damack/datastore-geo/branch/master/graph/badge.svg)](https://codecov.io/gh/damack/datastore-geo)

# Geo Library for google-cloud datastore
This project is bringing creation and querying of geospatial data to Node JS developers using [Google Cloud Datastore][datastore].

## Features
* **Box Queries:** Return all of the items that fall within a pair of geo points that define a rectangle as projected onto a sphere.
* **Basic CRUD Operations:** Create, update, and delete geospatial data items.

## Installation
Using npm:
`npm install --save datastore-geo`.

## Getting started
First you'll need to import the Google Cloud Datastore sdk and set up your Datastore connection:

```js
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
    projectId: '...',
    keyFilename: '...'
});
```

Next you must create an instance of GeoDataManager to query and write to the table, but you must always provide a `Datastore` instance and a table name.

```js
const geoDataManager = require('datastore-geo');
const geoDataManager = new GeoDataManager(datastore, {
    hashKeyLength: 2,
    namespace: 'optional',
    table: '...'
});
```

## Choosing a `hashKeyLength` (optimising for performance and cost)
The `hashKeyLength` is the number of most significant digits (in base 10) of the 64-bit geo hash to use as the hash key. Larger numbers will allow small geographical areas to be spread across Datastore partitions, but at the cost of performance as more queries need to be executed for box/radius searches that span hash keys. 

If your data is sparse, a large number will mean more requests since more empty queries will be executed and each has a minimum cost. However if your data is dense and `hashKeyLength` too short, more requests will be needed to read a hash key and a higher proportion will be discarded by server-side filtering.

Optimally, you should pick the largest `hashKeyLength` your usage scenario allows. The wider your typical radius/box queries, the smaller it will need to be.

This is an important early choice, since changing your `hashKeyLength` will mean recreating your data.

## Creating a index
We need also a merged index for Google Cloud Datastore. For this you need to setup the [Google Cloud SDK][sdk] and create a index.yaml e.g.

```
indexes:
- kind: places
  properties:
  - name: hashKey
  - name: geohash
```

Now you need to create the index:

```
gcloud datastore indexes create index.yaml
```

## Adding data
geoDataManager.update(geoPoint, data);

```js
geoDataManager.create({
    latitude: 50,
    longitude: 1
}, [{
    name: 'name',
    value: 'test',
}]).then(() => {
    console.log("saved");
});
```

## Updating data
geoDataManager.update(id, geoPoint, data);

```js
geoDataManager.update(1, {
    latitude: 50,
    longitude: 1
}, {
    name: 'test2'
}).then(() => {
    console.log("saved");
});
```

## Deleting data
geoDataManager.delete(id);

```js
geoDataManager.delete(1).then(() => {
    console.log("Done");
});
```

## Rectangular queries
Query by rectangle by specifying a `MinPoint` and `MaxPoint`.

```js
geoDataManager.queryRectangle({
    MinPoint: {
        latitude: 49.257673335491475,
        longitude: 7.695207268749982
    },
    MaxPoint: {
        latitude: 49.57126896742891,
        longitude: 9.672746331249982,
    }
}).then(test => {
    console.log(test);
});
```

## Limitations

### Queries retrieve all paginated data
Although low level query requests return paginated results, this library automatically pages through the entire result set. When querying a large area with many points, a lot of requests may be consumed.

### More Requests
The library retrieves candidate Geo points from the cells that intersect the requested bounds. The library then post-processes the candidate data, filtering out the specific points that are outside the requested bounds. Therefore, the consumed requests will be higher than the final results dataset. Typically 8 queries are exectued per radius or box search.

### High memory consumption
Because all paginated `Query` results are loaded into memory and processed, it may consume substantial amounts of memory for large datasets.

### Dataset density limitation
The Geohash used in this library is roughly centimeter precision. Therefore, the library is not suitable if your dataset has much higher density.

[datastore]: https://github.com/googleapis/nodejs-datastore
[sdk]: https://cloud.google.com/sdk/docs
