(function () {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsResultEnumerator', function () {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsResultEnumerator
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {number} [max=10] Maximum number of results to show. The value can be changed dynamically using a variable.
         * @param {boolean} [showHitsCounter=false] Displays the number of hits (search results). This is the number of results available on the API, not the number of results displayed in the widget.
         * @param {boolean} [showPagination=false] Displays a pagination block below the results to be able to browse them all.
         * @description
         * The odsResultEnumerator widget enumerates the search results (records for a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, datasets for a {@link ods-widgets.directive:odsCatalogContext Catalog Context}). It repeats the template (the content of the directive element) for each of them.
         *
         * If used with a {@link ods-widgets.directive:odsCatalogContext Catalog Context}, for each result, the following AngularJS variables are available:
         *
         *  * `item.datasetid`: Dataset identifier of the dataset
         *  * `item.metas`: An object holding the key/values of metadata for this dataset
         *
         * If used with a {@link ods-widgets.directive:odsDatasetContext Dataset Context}, for each result, the following AngularJS variables are available:
         *
         *  * `item.datasetid`: Dataset identifier of the dataset this record belongs to
         *  * `item.fields`: an object hold all the key/values for the record
         *  * `item.geometry`: if the record contains geometrical information, this object is present and holds its GeoJSON representation
         *
         *  @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="example"
         *                               example-domain="https://data.opendatasoft.com">
         *              <ul>
         *                  <ods-result-enumerator context="example">
         *                      <li>
         *                          <strong>{{item.metas.title}}</strong>
         *                          (<a ng-href="{{context.domainUrl + '/explore/dataset/' + item.datasetid + '/'}}" target="_blank">{{item.datasetid}}</a>)
         *                      </li>
         *                  </ods-result-enumerator>
         *              </ul>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                context: '=',
                max: '@?',
                showHitsCounter: '@?',
                showPagination: '@?'
            },
            template: '' +
                '<div class="odswidget odswidget-result-enumerator">' +
                '    <div ods-results="items" ods-results-context="context" ods-results-max="{{max}}" class="odswidget-result-enumerator__results">' +
                '        <div ng-if="loading"><ods-spinner class="odswidget-spinner--large"></ods-spinner></div>' +
                '        <div ng-if="!loading && !items.length" class="odswidget-result-enumerator__no-results-message" role="status" translate>No results</div>' +
                '        <div ng-if="!loading && items.length && hitsCounter" class="odswidget-result-enumerator__results-count" role="status">{{context.nhits}} <span translate>results</span></div>' +
                '        <div ng-repeat="item in items" inject class="odswidget-result-enumerator__item"></div>' +
                '    </div>' +
                '    <ods-pagination-block ng-if="pagination" context="context" per-page="{{max}}" container-identifier="{{localId}}"></ods-pagination-block>' +
                '</div>',
            link: function (scope, element) {
                scope.localId = 'odsResultEnumerator-' + ODS.StringUtils.getRandomUUID();
                element.children()[0].id = scope.localId;
            },
            controller: ['$scope', function ($scope) {
                $scope.hitsCounter = (angular.isString($scope.showHitsCounter) && $scope.showHitsCounter.toLowerCase() === 'true');
                $scope.pagination = (angular.isString($scope.showPagination) && $scope.showPagination.toLowerCase() === 'true');
            }]
        };
    });

}());
