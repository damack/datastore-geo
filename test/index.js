const { expect } = require('chai');
const GeoDataManager = require('../src');

describe('GeoDataManager', () => {
    it('Create geodata', () => {
        let called = false;

        const datastore = {
            int(val) {
                return parseInt(val);
            },
            geoPoint(val) {
                return val
            },
            key(val) {
                return {
                    namespace: val.namespace,
                    kind: val.path[0]
                }
            },
            save(args) {
                called = true;
                expect(args).to.deep.equal({
                    key: { namespace: 'ntest', kind: 'test' },
                    data: [
                        { name: 'name', value: 'test' },
                        { name: 'geohash', value: '4416340092237875681' },
                        { name: 'hashKey', value: 44 },
                        {
                            name: 'geoPoint', value: {
                                latitude: 1,
                                longitude: 50
                            }, excludeFromIndexes: true
                        }
                    ]
                });
            }
        };
        const geoDataManager = new GeoDataManager(datastore, {
            namespace: 'ntest',
            table: 'test'
        });
        geoDataManager.create({
            latitude: 1,
            longitude: 50
        }, [{
            name: 'name',
            value: 'test',
        }]);

        expect(called).to.be.true;
    });
    it('Query rectangle', () => {
        let called = false;

        let filters = [
            { key: 'geohash', ob: '>', val: '5158803897761923073' },
            { key: 'geohash', ob: '<', val: '5158803932121661439' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158803932121661441' },
            { key: 'geohash', ob: '<', val: '5158803932255879167' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158804103920353281' },
            { key: 'geohash', ob: '<', val: '5158804653676167167' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158804653676167169' },
            { key: 'geohash', ob: '<', val: '5158805203431981055' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158810426112212993' },
            { key: 'geohash', ob: '<', val: '5158810563551166463' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158810563551166465' },
            { key: 'geohash', ob: '<', val: '5158810700990119935' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158810804069335041' },
            { key: 'geohash', ob: '<', val: '5158810838429073407' },
            { key: 'hashKey', ob: '=', val: 51 },
            { key: 'geohash', ob: '>', val: '5158810838429073409' },
            { key: 'geohash', ob: '<', val: '5158810975868026879' },
            { key: 'hashKey', ob: '=', val: 51 }
        ];
        const datastore = {
            NO_MORE_RESULTS: 'NO_MORE_RESULTS',
            int(val) {
                return parseInt(val);
            },
            createQuery(namespace, table) {
                expect(namespace).to.equal('ntest');
                expect(table).to.equal('test');
                return {
                    filter(key, ob, val) {
                        expect(key).to.equal(filters[0].key);
                        expect(ob).to.equal(filters[0].ob);
                        expect(val).to.equal(filters[0].val);
                        if (
                            key === filters[0].key &&
                            ob === filters[0].ob &&
                            val === filters[0].val
                        ) {
                            filters.splice(0, 1);
                        }
                    }
                }
            },
            runQuery() {
                called = true;
                return new Promise((resolve) => {
                    resolve([[], { moreResults: 'NO_MORE_RESULTS' }]);
                });
            }
        };
        const geoDataManager = new GeoDataManager(datastore, {
            namespace: 'ntest',
            table: 'test'
        });
        geoDataManager.queryRectangle({
            MinPoint: {
                latitude: 49.40667303031876,
                longitude: 8.62557091522035
            },
            MaxPoint: {
                latitude: 49.42627204889484,
                longitude: 8.7491671066266,
            }
        });

        expect(called).to.be.true;
        expect(filters.length).to.equal(0);
    });
    it('Update geodata', async () => {
        let called = false;

        const datastore = {
            int(val) {
                return parseInt(val);
            },
            geoPoint(val) {
                return val
            },
            key(val) {
                return {
                    namespace: val.namespace,
                    id: val.path[1],
                    kind: val.path[0]
                }
            },
            transaction() {
                return {
                    commit() { },
                    rollback() { },
                    get() {
                        return new Promise((resolve) => {
                            resolve([{}]);
                        });
                    },
                    run() {
                        new Promise((resolve) => {
                            resolve();
                        });
                    },
                    save(args) {
                        called = true;
                        expect(args).to.deep.equal({
                            key: { namespace: 'ntest', id: 1, kind: 'test' },
                            data:
                            {
                                name: 'test',
                                geohash: '4416340092237875681',
                                hashKey: 44,
                                geoPoint: { latitude: 1, longitude: 50 }
                            }
                        });
                    }
                }
            },
        };
        const geoDataManager = new GeoDataManager(datastore, {
            namespace: 'ntest',
            table: 'test'
        });
        await geoDataManager.update(1, {
            latitude: 1,
            longitude: 50
        }, { name: 'test' });

        expect(called).to.be.true;
    });
});