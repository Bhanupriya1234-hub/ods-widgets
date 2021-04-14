(function() {
    'use strict';

    angular.module('ods-widgets')
        .directive('odsGeotooltip', ['$timeout', 'ModuleLazyLoader', 'ODSWidgetsConfig', function ($timeout, ModuleLazyLoader, ODSWidgetsConfig) {
            /**
             * @ngdoc directive
             * @name ods-widgets.directive:odsGeotooltip
             * @scope
             * @restrict E
             * @param {Array|string} [coords=none] Coordinates of a point to display in the tooltip; either an array of two numbers as [latitude, longitude], or a string under the form of "latitude,longitude".
             * If you use a string, surround it with simple quotes to ensure Angular treats it as a string. If you are working with a record (e.g., using {@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}), you can directly use the content of a `geo_point_2d` field.
             * @param {Object} [geojson=none] GeoJSON object of a shape to display in the tooltip. If you are working with a record (e.g., using {@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}), you can directly use the content of a `geo_shape` field.
             * @param {Object} [record=none] A record object (e.g., from {@link ods-widgets.directive:odsResultEnumerator odsResultEnumerator}) from which the geometry will be taken (this is the `geometry` property of the record)
             * @param {number} [width=200] Width of the tooltip, in pixels
             * @param {number} [height=200] Height of the tooltip, in pixels
             * @param {number} [delay=500] Delay before the tooltip appears on hover, in milliseconds
             *
             * @description
             * When used to surround a text, the odsGeotooltip widget displays a tooltip showing a point and/or a shape in a map.
             *
             * @example
             *  <example module="ods-widgets">
             *      <file name="index.html">
             *          <!-- Display specific values -->
             *          <p>
             *              <ods-geotooltip coords="'48.858093,2.294694'">Nice place</ods-geotooltip>
             *          </p>
             *          <p>
             *              <ods-geotooltip coords="[48.841601, 2.284822]">Nice people</ods-geotooltip>
             *          </p>
             *
             *          <ods-dataset-context context="events"
             *                               events-domain="https://documentation-resources.opendatasoft.com/"
             *                               events-dataset="evenements-publics-openagenda-extract">
             *              <!-- Display values from records -->
             *              <ods-result-enumerator context="events" max="1">
             *                  <div>
             *                      <!-- Using the value from a field with a "geo_point_2d" type -->
             *                      <ods-geotooltip coords="item.fields.latlon">Location</ods-geotooltip>
             *                      <!-- Directly passing a record -->
             *                      <ods-geotooltip record="item">Same location</ods-geotooltip>
             *                  </div>
             *              </ods-result-enumerator>
             *          </ods-dataset-context>
             *      </file>
             *  </example>
             */
            // The container is shared between directives to avoid performance issues
            var container = angular.element('<div id="odswidget-geotooltip" class="odswidget" style="opacity: 0; transition: opacity 200ms ease-out; position: fixed; z-index: 40000; visibility: hidden;"></div>');
            var map = null,
                layerGroup = null;

            var displayTooltip = function(tippedElement, width, height, coords, geoJson, record) {
                // Make the container the right size
                var resized = false,
                    geoJsonLayer;
                if (width !== container.css('width') || height !== container.css('height')) {
                    resized = true;
                }
                container.css('width', width);
                container.css('height', height);

                // Position it at the right place
                var availableBottomSpace = jQuery(window).height()-(tippedElement.offset().top-jQuery(document).scrollTop());
                if (container.height() < availableBottomSpace) {
                    // There is enough space below: let's place the tooltip right below the element
                    container.css('top', tippedElement.height()+tippedElement.offset().top-jQuery(document).scrollTop()+5+'px');
                } else {
                    container.css('top', tippedElement.offset().top-jQuery(document).scrollTop()-5-container.height()+'px');
                }
                var availableRightSpace = jQuery(window).width()-(tippedElement.offset().left-jQuery(document).scrollLeft());
                var availableLeftSpace = jQuery(window).width() - availableRightSpace;
                if (container.width() < availableRightSpace) {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()+'px');
                } else if (container.width() < availableLeftSpace) {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()-container.width()+'px');
                } else {
                    // No space is enough on either side, let's just center it
                    // In small space situations, we know the tooltip will always be at least 20px smaller than the
                    // viewport, so keeping a 10px space seems a good compromise.
                    container.css('left', 10);
                }
                tippedElement.after(container);

                if (map === null) {
                    map = new L.ODSMap(container[0], {
                        zoomControl: false,
                        basemapsList: [ODSWidgetsConfig.basemaps[0]],
                        maxZoom: 16
                    });
                } else if (resized) {
                    map.invalidateSize();
                }

                if (layerGroup !== null) {
                    map.removeLayer(layerGroup);
                }
                layerGroup = L.layerGroup();
                var bounds = new L.LatLngBounds();

                if (coords) {
                    if (angular.isString(coords)) {
                        coords = coords.split(',');
                    }
                    var point = new L.LatLng(coords[0], coords[1]);
                    var pointLayer = L.marker(point);
                    layerGroup.addLayer(pointLayer);
                    bounds.extend(point);
                }

                if (geoJson) {
                    if (angular.isString(geoJson)) {
                        geoJson = angular.fromJson(geoJson);
                    }
                    geoJsonLayer = L.geoJson(geoJson);
                    layerGroup.addLayer(geoJsonLayer);
                    bounds.extend(geoJsonLayer.getBounds());
                }

                if (record && angular.isDefined(record.geometry)) {
                    geoJsonLayer = L.geoJson(record.geometry);
                    layerGroup.addLayer(geoJsonLayer);
                    bounds.extend(geoJsonLayer.getBounds());
                }

                layerGroup.addTo(map);
                map.fitBounds(bounds, {reset: true});
                container.css('opacity', '1');
                container.css('visibility', 'visible');
            };

            var hideTooltip = function() {
                container.css('opacity', '0');
                $timeout(function() {
                    container.css('visibility', 'hidden');
                }, 200);
            };

            return {
                template: '<span ng-transclude style="border-bottom: 1px dotted #000000; cursor: help;" class="geotooltip"></span>',
                replace: true,
                restrict: 'E',
                transclude: true,
                scope: {
                    'coords': '=',
                    'width': '@',
                    'height': '@',
                    'delay': '@',
                    'geojson': '=',
                    'record': '='
                },
                link: function(scope, element, attrs) {
                    ModuleLazyLoader('leaflet').then(function() {
                        var tooltipWidth = attrs.width || 200;
                        // Limit to the viewport width (with a 20px buffer)
                        tooltipWidth = Math.min(tooltipWidth, window.innerWidth - 20);
                        tooltipWidth += 'px';

                        var tooltipHeight = (attrs.height || 200) + 'px';
                        var tooltipPop = null;
                        var delay = attrs.delay || 500;

                        // Events
                        element.bind('mouseenter', function() {
                            if (delay === 0) {
                                displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson, scope.record);
                            } else {
                                tooltipPop = $timeout(function() {
                                    displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson, scope.record);
                                    tooltipPop = null;
                                }, delay);
                            }
                        });
                        element.bind('click', function() {
                            displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson, scope.record);
                            if (tooltipPop !== null) {
                                // Chances are we triggered the original timer
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }
                        });
                        element.bind('mouseleave', function() {
                            hideTooltip();
                            if (tooltipPop !== null) {
                                // We are currently counting down until the tooltip appearance, let's forget it
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }

                        });
                    });
                }
            };
        }]);
}());
