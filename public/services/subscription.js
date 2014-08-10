/*
The subscription service to tell the server to subscribe or unsubscribe the user from the show
 */
angular.module('MyApp')
	.factory('Subscription', ['$http', function($http) {
		return {
			subscribe: function(show, user) {
				return $http.post('/api/subscribe', { showId: show._id });
			},
			unsubscribe: function(show, user) {
				return $http.post('/api/unsubscribe', { showId: show._id });
			}
		};
	}]);