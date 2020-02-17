(function () {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.factory('Geocoder', ['ODSWidgetsConfig', 'AlgoliaPlaces', 'JawgGeocoder', function(ODSWidgetsConfig, AlgoliaPlaces, JawgGeocoder) {
        /*
        Returns the geocoding service deopending on ODSWidgetsConfig's `geocodingProvider` setting
         */
        if (ODSWidgetsConfig.geocodingProvider === 'jawg') {
            return JawgGeocoder;
        } else {
            return AlgoliaPlaces;
        }
    }]);

    /*
    Calls to the following services should return an array of:
        {
            "location": {
                "lat": 12,
                "lng": 34
            },
            "bbox": [[lat1, lng1], [lat2, lng2]], // Optional
            "name": "Paris",
            "highlightedName": "<em>Par</em>is"
            "parents": "Ile-de-France, France"
            "type": "country"|"region"|"city"|"street"|"address"|"poi"|"railway"|"aeroway"
     */

    mod.service('AlgoliaPlaces', ['$http', 'ODSWidgetsConfig', '$q',  function($http, ODSWidgetsConfig, $q) {
        /*
            Documentation: https://community.algolia.com/places/rest.html
         */
        var computeParents = function(algoliaSuggestion) {
            var parents = '';

            ['city', 'administrative', 'country'].forEach(function(prop) {
                if (angular.isDefined(algoliaSuggestion[prop])) {
                    if (parents.length > 0) {
                        parents += ', ';
                    }
                    parents += algoliaSuggestion[prop];
                }
            });

            return parents;
        };
        var computeType = function(algoliaSuggestion) {
            // Note: Algolia doesn't contain regions
            if (algoliaSuggestion._tags.indexOf("aeroway") >= 0) {
                return "aeroway";
            } else if (algoliaSuggestion._tags.indexOf("railway") >= 0) {
                return "railway";
            } else if (algoliaSuggestion.is_country) {
                return "country";
            } else if (algoliaSuggestion.is_city) {
                return "city";
            } else if (algoliaSuggestion.is_highway) {
                return "street";
            } else {
                return "address"; // Can't be more precise than that :/
            }
        };

        var options = {};
        if (ODSWidgetsConfig.algoliaPlacesApplicationId && ODSWidgetsConfig.algoliaPlacesAPIKey) {
            options.headers = {
                'X-Algolia-Application-Id': ODSWidgetsConfig.algoliaPlacesApplicationId,
                'X-Algolia-API-Key': ODSWidgetsConfig.algoliaPlacesAPIKey
            };
        }

        var currentRequest = null;
        return function(query, aroundLatLng) {
            var deferred = $q.defer();
            var queryOptions = angular.extend({}, options);

            if (currentRequest) {
                currentRequest.resolve();
            }
            currentRequest = $q.defer();
            queryOptions.timeout = currentRequest.promise;
            queryOptions.params = {
                'query': query,
                'aroundLatLngViaIP': false,
                'language': ODSWidgetsConfig.language || 'en',
                'hitsPerPage': 5
            };
            if (aroundLatLng) {
                queryOptions.params.aroundLatLng = aroundLatLng.join(',');
            }

            $http.get('https://places-dsn.algolia.net/1/places/query', queryOptions).success(function(result) {
                var suggestions = [];
                angular.forEach(result.hits, function(suggestion) {
                    suggestions.push({
                        location: suggestion._geoloc,
                        name: suggestion.locale_names[0],
                        highlightedName: suggestion._highlightResult.locale_names[0].value,
                        parents: computeParents(suggestion),
                        type: computeType(suggestion)
                    })
                });
                deferred.resolve(suggestions);
            }).error(function() {
                deferred.reject();
            });

            return deferred.promise;
        };
    }]);

    mod.service('JawgGeocoder', ['$http', 'ODSWidgetsConfig', '$q', function($http, ODSWidgetsConfig, $q) {
        // https://www.jawg.io/docs/apidocs/places/autocomplete/#layers
        // Regarding configuration: https://app.clubhouse.io/opendatasoft/story/17461/experiment-alternative-geocoding-api-as-a-backend-for-geosearch#activity-19300
        var includedLayers = [
            'address',
            // 'venue',
            'street',
            // 'neighbourhood',
            'locality',
            // 'borough',
            'localadmin',
            'county',
            // 'macrocounty',
            'region',
            'macroregion',
            'country',
            // 'coarse',
            'postalcode'
        ];

        // https://github.com/pelias/openstreetmap/blob/master/config/category_map.js
        // The categories parameter lets you select which types of OSM POIs are included in the data.
        // Additionally, it adds a "category" property on results that help us determine their type.
        // var includedCategories = [
        //     'transport',
        //     // 'recreation',
        //     // 'religion',
        //     // 'education',
        //     // 'entertainment',
        //     // 'nightlife',
        //     // 'food',
        //     'government',
        //     'professional',
        //     // 'finance',
        //     // 'health',
        //     // 'retail',
        //     // 'accommodation',
        //     // 'industry',
        //     // 'recreation',
        //     'natural',
        // ];

        var computeHighlight = function(query, result) {
            // Best-effort client-side highlighting
            // Try to account for spaces, quotes... that may match (e.g. "Saint-Nazaire" / "Saint Nazaire")
            var whitespace = new RegExp(/\W/);
            query = query.replace(whitespace, "\\W");
            var re = new RegExp(query, 'i');
            return result.replace(re, '<em>$&</em>');
        };

        var computeParents = function(jawgSuggestion) {
            var parents = '';
            var previousParent = null;

            ['locality', 'region', 'country'].forEach(function(prop) {
                var existingProp = jawgSuggestion.properties[prop];
                if (angular.isDefined(existingProp) && existingProp !== jawgSuggestion.properties.name) {
                    if (previousParent !== existingProp) {
                        if (parents.length > 0) {
                            parents += ', ';
                        }
                        parents += jawgSuggestion.properties[prop];
                        previousParent = existingProp;
                    }
                }
            });

            return parents;
        };

        var computeType = function(jawgSuggestion) {
            // Aeroway, Railway are unsupported
            if (jawgSuggestion.properties.category && jawgSuggestion.properties.category.indexOf('transport:air') >= 0) {
                return 'aeroway';
            } else if (jawgSuggestion.properties.category
                && (jawgSuggestion.properties.category.indexOf('transport:public') >= 0
                || jawgSuggestion.properties.category.indexOf('transport:rail') >= 0)) {
                // Somehow, parisian metro isn't rail
                return 'railway';
            } else if (jawgSuggestion.properties.layer === 'venue') {
                return 'poi';
            } else if (jawgSuggestion.properties.layer === 'country') {
                return 'country';
            } else if (jawgSuggestion.properties.layer === 'locality') {
                return 'city';
            } else if (jawgSuggestion.properties.layer === 'street') {
                return 'street';
            } else if (jawgSuggestion.properties.layer === 'region' || jawgSuggestion.properties.layer === 'macroregion') {
                return 'region';
            } else {
                return 'address';
            }
        };

        var currentRequest = null;

        return function(query, aroundLatLng) {
            var deferred = $q.defer();

            if (currentRequest) {
                currentRequest.resolve();
            }
            currentRequest = $q.defer();
            var queryOptions = {
                'params': {
                    'focus.point.lat': aroundLatLng[0],
                    'focus.point.lon': aroundLatLng[1],
                    'layers': includedLayers.join(','),
                    // 'categories': includedCategories.join(','),
                    'text': query,
                    'access-token': ODSWidgetsConfig.jawgGeocodingAPIKey,
                    'size': 5
                },
                'timeout': currentRequest.promise
            };

            $http.get('https://api.jawg.io/places/v1/autocomplete', queryOptions).success(function(result) {
                var suggestions = [];
                angular.forEach(result.features, function(suggestion) {
                    var normalizedSuggestion = {
                        location: {
                            lat: suggestion.geometry.coordinates[1],
                            lng: suggestion.geometry.coordinates[0]
                        },
                        name: suggestion.name,
                        highlightedName: computeHighlight(query, suggestion.properties.name), // The API doesn't provide highlight
                        parents: computeParents(suggestion),
                        type: computeType(suggestion)
                    };

                    if (suggestion.bbox) {
                        normalizedSuggestion.bbox = [
                            [suggestion.bbox[1], suggestion.bbox[0]],
                            [suggestion.bbox[3], suggestion.bbox[2]],
                        ];
                    }
                    suggestions.push(normalizedSuggestion);
                });
                deferred.resolve(suggestions);
            }).error(function() {
                deferred.reject();
            });
            return deferred.promise;
        }
    }]);
}());
