const S2Manager = require('./S2Manager');

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
