(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTopPublishers', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTopPublishers
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * The odsTopPublishers widget displays the five top publishers.
         *
         * @example
         *  <example module="ods-widgets">
         *      <file name="index.html">
         *          <ods-catalog-context context="example" example-domain="data.opendatasoft.com">
         *              <ods-top-publishers context="example"></ods-top-publishers>
         *          </ods-catalog-context>
         *      </file>
         *  </example>
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget odswidget-top-publishers">' +
                '<ul class="odswidget-top-publishers__publishers">' +
                '   <li class="no-data" ng-hide="publishers" translate>No data available yet</li>' +
                '   <li class="odswidget-top-publishers__publisher" ng-repeat="publisher in publishers" ng-if="publishers">' +
                '       <div class="odswidget-top-publishers__publisher-details">' +
                '           <div class="odswidget-top-publishers__publisher-details-name"><a ng-href="{{ context.domainUrl }}/explore/?refine.publisher={{ publisher.path }}" target="_self">{{ publisher.name }}</a></div>' +
                '           <div class="odswidget-top-publishers__publisher-details-count"><i class="fa fa-table" aria-hidden="true"></i> <span translate translate-n="publisher.count" translate-plural="Used by {{$count}} datasets">Used by {{$count}} dataset</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var catalog_search = ODSAPI.uniqueCall(ODSAPI.datasets.search);
                var refresh = function() {
                    catalog_search($scope.context, {facet: 'publisher'})
                        .then(function(response) {
                            var data = response.data;
                            $scope.publishers = data.facet_groups[0].facets.slice(0, 5);
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());
