angular.module('MyApp')
	.factory('Auth', ['$http', '$location', '$rootScope', '$cookieStore', '$alert', function($http, $location, $rootScope, $cookieStore, $alert) {
		$rootScope.currentUser = $cookieStore.get('user');
		$cookieStore.remove('user');

		return {
			login: function(user) {
				return $http.post('/api/login', user)
					.success(function(data) {
						$rootScope.currentUser = data;
						$location.path('/');

						$alert({
							title    : 'Hello!',
							content  : 'Login successful',
							placement: 'top-right',
							type     : 'success',
							duration : 3
						});
					})
					.error(function() {
						$alert({
							title    : 'Error!',
							content  : 'Invalid Username or Password',
							placement: 'top-right',
							type     : 'danger',
							duration : 3
						});
					});
			},
			signup: function(user) {
				return $http.post('/api/signup', user)
					.success(function() {
						$location.path('/login');

						$alert({
							title    : 'Awesome!',
							content  : 'Your account has been created',
							placement: 'top-right',
							type     : 'success',
							duration : 3
						});
					})
					.error(function(response) {
						$alert({
							title    : 'Error!',
							content  : response.data,
							placement: 'top-right',
							type     : 'danger',
							duration : 3
						});
					});
			},
			logout: function() {
				return $http.get('/api/logout')
					.success(function() {
						$rootScope.currentUser = null;
						$cookieStore.remove('user');
						$alert({
							content  : 'Logged out',
							placement: 'top-right',
							type     : 'info',
							duration : 3
						});
					});
			}
		};
	}]);