/*
The controller for adding a show to the database. It get's the name entered into the form and
using the show service, adds to the database
 */
angular.module('MyApp')
	.controller('AddCtrl', ['$scope', '$alert', 'Show', function($scope, $alert, Show) {
		$scope.addShow = function() {
			Show.save({ showName: $scope.showName }, function() {
				$scope.showName = '';
				$scope.addForm.$setPristine();
				$alert({
					content: 'TV show has been added',
					placement: 'top-right',
					type: 'success',
					duration: 3
				});
			}, function(response) {
				$scope.showName = '';
				$scope.addForm.$setPristine();
				$alert({
					content: response.data.message,
					placement: 'top-right',
					type: 'danger',
					duration: 3
				});
			});
		};
	}]);