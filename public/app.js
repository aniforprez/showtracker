/**
 * The definition of the 'MyApp' module
 *
 * This is where the MyApp module and it's dependencies are defined and the routes specified.
 */
var MyApp = angular.module('MyApp', ['ngCookies', 'ngResource', 'ngMessages', 'ngRoute', 'mgcrea.ngStrap']);

MyApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    // An angular service that enables html5
    $locationProvider.html5Mode(true);

    // Defining all routes and controllers
    $routeProvider
        .when('/', {
            templateUrl: 'views/home.html',
            controller : 'MainCtrl'
        })
        .when('/shows/:id', {
            templateUrl: 'views/detail.html',
            controller : 'DetailCtrl'
        })
        .when('/login', {
            templateUrl: 'views/login.html',
            controller : 'LoginCtrl'
        })
        .when('/signup', {
            templateUrl: 'views/signup.html',
            controller : 'SignupCtrl'
        })
        .when('/add', {
            templateUrl: 'views/add.html',
            controller : 'AddCtrl'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);