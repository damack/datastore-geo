const { S2Cell, S2LatLng, S2LatLngRect, S2RegionCoverer } = require('nodes2ts');

module.exports = class S2Manager {
    static generateGeohash(geoPoint) {
        const latLng = S2LatLng.fromDegrees(geoPoint.latitude, geoPoint.longitude);
        const cell = S2Cell.fromLatLng(latLng);
        const cellId = cell.id;
        return cellId.id;
    }
    static generateHashKey(geohash, hashKeyLength) {
        if (geohash.lessThan(0)) {
            hashKeyLength++;
        }

        const geohashString = geohash.toString(10);
        const denominator = Math.pow(10, geohashString.length - hashKeyLength);
        return geohash.divide(denominator);
    }
    static latLngRectFromQueryRectangleInput(geoQueryRequest) {
        const minPoint = geoQueryRequest.MinPoint;
        const maxPoint = geoQueryRequest.MaxPoint;

        let latLngRect = null;

        if (minPoint != null && maxPoint != null) {
            const minLatLng = S2LatLng.fromDegrees(minPoint.latitude, minPoint.longitude);
            const maxLatLng = S2LatLng.fromDegrees(maxPoint.latitude, maxPoint.longitude);

            latLngRect = S2LatLngRect.fromLatLng(minLatLng, maxLatLng);
        }

        return latLngRect;
    }
    static getGeoHashRanges(latLngRect, hashKeyLength) {
        const ranges = [];
        const covering = new S2RegionCoverer().getCoveringCells(latLngRect);
        covering.forEach(outerRange => {
            const rangeMin = outerRange.rangeMin().id;
            const rangeMax = outerRange.rangeMax().id;
            const minHashKey = S2Manager.generateHashKey(rangeMin, hashKeyLength);
            const maxHashKey = S2Manager.generateHashKey(rangeMax, hashKeyLength);
            const denominator = Math.pow(10, rangeMin.toString().length - minHashKey.toString().length);

            if (minHashKey.equals(maxHashKey)) {
                ranges.push({
                    rangeMin,
                    rangeMax
                });
            } else {
                for (let l = minHashKey; l.lessThanOrEqual(maxHashKey); l = l.add(1)) {
                    if (l.greaterThan(0)) {
                        ranges.push({
                            rangeMin: l.equals(minHashKey) ? rangeMin : l.multiply(denominator),
                            rangeMax: l.equals(maxHashKey) ? rangeMax : l.add(1).multiply(denominator).subtract(1)
                        });
                    } else {
                        ranges.push({
                            rangeMin: l.equals(minHashKey) ? rangeMin : l.subtract(1).multiply(denominator).add(1),
                            rangeMax: l.equals(maxHashKey) ? rangeMax : l.multiply(denominator)
                        });
                    }
                }
            }
        });
        return ranges;
    }
    static filterByRectangle(list, latLngRect) {
        return list.filter(item => {
            const latLng = S2LatLng.fromDegrees(item.geoPoint.latitude, item.geoPoint.longitude);
            delete item.geohash;
            delete item.hashKey;
            return latLngRect.containsLL(latLng);
        });
    }
}