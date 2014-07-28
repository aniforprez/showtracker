/**
* MyApp Module
*
* To create the module Show to query from TheTVDB
*/

var MyApp = angular.module('MyApp');

MyApp.factory('Show', ['$resource', function($resource){
	return $resource('/api/shows/:_id');
}]);