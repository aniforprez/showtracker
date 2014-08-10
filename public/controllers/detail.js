/*
The controller for the details view where we perform user subscription functinos (subscribe, unsubscribe, check if sunscribed)
and also get the next episode to air if there is one to display
 */
angular.module('MyApp')
	.controller('DetailCtrl', ['$scope', '$rootScope', '$routeParams', 'Show', 'Subscription', function($scope, $rootScope, $routeParams, Show, Subscription){
		Show.get({ _id: $routeParams.id }, function(show) {
			$scope.show = show;

			// To check if user is subscribed to updates on this show
			$scope.isSubscribed = function() {
				return $scope.show.subscribers.indexOf($rootScope.currentUser._id) !== -1;
			};

			// To subscribe users to updates on this show
			$scope.subscribe = function() {
				Subscription.subscribe(show).success(function() {
					$scope.show.subscribers.push($rootscope.currentUser._id);
				});
			};

			// To unsubscribe the user from updates on this show
			$scope.unsubscribe = function() {
				Subscription.unsubscribe(show).success(function() {
					var index = $scope.show.subscribers.indexOf($rootScope.currentUser._id);
					$scope.show.subscribers.splice(index, 1);
				});
			};

			// The filter to check if there is a next episode and return the date of airing
			$scope.nextEpisode = show.episodes.filter(function(episode) {
				return new Date(episode.firstAired) > new Date();
			})[0];
		});
	}]);