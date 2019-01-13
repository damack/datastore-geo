const S2Manager = require('./S2Manager');
const Datastore = require('@google-cloud/datastore');

class GeoDataManager {
    constructor(datastore, config) {
        this.datastore = datastore;
        this.table = config.table;
        this.namespace = config.namespace;
        this.hashKeyLength = config.hashKeyLength || 2;
    }
    async queryRectangle(rectangle) {
        const promises = [];
        const latLngRect = S2Manager.latLngRectFromQueryRectangleInput(rectangle);
        const ranges = S2Manager.getGeoHashRanges(latLngRect, this.hashKeyLength);

        const query = async (datastore, namespace, table, range, hashKey) => {
            let queryOutputs = [];
            const nextQuery = async (endCursor) => {
                let query = datastore.createQuery(namespace, table);
                query.filter('geohash', '>', range.rangeMin.toString(10));
                query.filter('geohash', '<', range.rangeMax.toString(10));
                query.filter('hashKey', '=', datastore.int(hashKey));
                if (endCursor) {
                    query = query.start(endCursor);
                }

                const results = await datastore.runQuery(query);
                const info = results[1];
                queryOutputs = queryOutputs.concat(results[0]);
                if (info.moreResults !== datastore.NO_MORE_RESULTS) {
                    return nextQuery(info.endCursor);
                }
            }

            await nextQuery();
            return queryOutputs;
        };

        for (const range of ranges) {
            const hashKey = S2Manager.generateHashKey(range.rangeMin, this.hashKeyLength).toString(10);
            promises.push(query(this.datastore, this.namespace, this.table, range, hashKey));
        }
        const mergedResults = [];
        const results = await Promise.all(promises);
        results.forEach(queryOutputs => queryOutputs.forEach(queryOutput => mergedResults.push(queryOutput)));
        return S2Manager.filterByRectangle(mergedResults, latLngRect)
    }
    create(geoPoint, data) {
        const geohash = S2Manager.generateGeohash(geoPoint);
        const hashKey = S2Manager.generateHashKey(geohash, this.hashKeyLength);

        data.push({
            name: 'geohash',
            value: geohash.toString(10),
        });
        data.push({
            name: 'hashKey',
            value: this.datastore.int(hashKey.toString(10)),
        });
        data.push({
            name: 'geoPoint',
            value: this.datastore.geoPoint(geoPoint),
            excludeFromIndexes: true,
        });
        return this.datastore.save({
            key: this.datastore.key({
                namespace: this.namespace,
                path: [this.table]
            }),
            data
        })
    }
    async update(id, geoPoint, data) {
        const transaction = this.datastore.transaction();
        const key = this.datastore.key({
            namespace: this.namespace,
            path: [this.table, this.datastore.int(id)]
        });
        const geohash = S2Manager.generateGeohash(geoPoint);
        const hashKey = S2Manager.generateHashKey(geohash, this.hashKeyLength);

        try {
            await transaction.run();
            const [obj] = await transaction.get(key);

            obj.geohash = geohash.toString(10);
            obj.hashKey = this.datastore.int(hashKey.toString(10));
            obj.geoPoint = this.datastore.geoPoint(geoPoint);
            transaction.save({
                key,
                data: Object.assign(data, obj),
            });
            return transaction.commit();
        } catch (err) {
            transaction.rollback();
            throw err;
        }
    }
    delete(id) {
        return this.datastore.delete(this.datastore.key({
            namespace: this.namespace,
            path: [this.table, this.datastore.int(id)]
        }));
    }
};
module.exports = GeoDataManager;

/*
const geoDataManager = new GeoDataManager();

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

/*
geoDataManager.create({
    latitude: 49.4836192,
    longitude: 8.555047599999966
}, [{
    name: 'name',
    value: 'test',
}]).then(() => {
    console.log("saved");
});
*/

/*
const datastore = new Datastore({
    projectId: 'parkserving',
    keyFilename: './parkserving.json'
});
const geoDataManager = new GeoDataManager(datastore, {
    namespace: 'parkserving-test',
    table: 'places'
});

geoDataManager.update('5629499534213120', {
    latitude: 49.4836192,
    longitude: 8.555047599999966
}, {
        name: 'test2'
    }).then(() => {
        console.log("saved");
    });
/*

geoDataManager.delete('5641906755207168').then(() => {
    console.log("Done");
});
*/

/*
config = {
    projectId: 'test-226214',
    keyFilename: './keyfile.json'
};

const box = {
    MinPoint: {
        latitude: 49.257673335491475,
        longitude: 7.695207268749982
    },
    MaxPoint: {
        latitude: 49.57126896742891,
        longitude: 9.672746331249982,
    }
}

const promises = [];
const latLngRect = S2Manager.latLngRectFromQueryRectangleInput(box);
const ranges = S2Manager.getGeoHashRanges(latLngRect, hashKeyLength);
for (const range of ranges) {
    const hashKey = S2Manager.generateHashKey(range.rangeMin, hashKeyLength).toString(10);
    promises.push(datastore.runQuery(datastore
        .createQuery('places')
        .filter('geohash', '>', range.rangeMin.toString(10))
        .filter('geohash', '<', range.rangeMax.toString(10))
        .filter('hashKey', '=', datastore.int(hashKey))
    ));
}

Promise.all(promises).then((results) => {
    const mergedResults = [];
    results.forEach(queryOutputs => queryOutputs[0].forEach(queryOutput => mergedResults.push(queryOutput)));
    console.log(mergedResults);
}).catch(err => {
    console.error('ERROR:', err);
});

/*
datastore.save({
    key: datastore.key('places'),
    data: [{
        name: 'geohash',
        value: geohash.toString(10),
    }, {
        name: 'hashKey',
        value: datastore.int(hashKey.toString(10)),
    }, {
        name: 'geoPoint',
        value: datastore.geoPoint(coordinates)
    }, {
        name: 'street',
        value: 'Lindenfelser Straße'
    }, {
        name: 'streetnumber',
        value: '18'
    }, {
        name: 'city',
        value: 'Ilvesheim'
    }, {
        name: 'zipcode',
        value: '68549'
    }]
}).then(() => {
    console.log("Saved");
}).catch(err => {
    console.error('ERROR:', err);
});
*/