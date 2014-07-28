/**
* showControllers Module
*
* The definition of all the controllers used in the app
*
* One thing I learned is that you MUST NOT put the square braces '[]' after this MyApp since it is only adding a controller to the module and not defining the app itself. When defining the app, the square braces are used to either add dependencies or specify that there are none.
*/

var MyApp = angular.module('MyApp');

// The controller for the main page with the search and filter
MyApp.controller('MainCtrl', ['$scope', 'Show', function($scope, Show){
	// The alphabet loaded to scope.alphabet
	$scope.alphabet = ['0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J','K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
	// All genres loaded to scope.genres
	$scope.genres = ['Action', 'Adventure', 'Animation', 'Children', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Food', 'Home and Garden', 'Horror', 'Mini-Series', 'Mystery', 'News', 'Reality', 'Romance', 'Sci-Fi', 'Sport', 'Suspense', 'Talk Show', 'Thriller', 'Travel'];

	// Defining the heading
	$scope.headingTitle = "Top 12 Shows";

	// Gets the shows that are returned by the query
	$scope.shows = Show.query();

	/**
	 * The function to get all the shows for a certain genre
	 *
	 * @param genre "The genre selected by the user"
	 */
	$scope.filterByGenre = function(genre) {
		$scope.shows = Show.query({genre: genre});
		$scope.headingTitle = genre;
	};

	/**
	 * The function to get shows for selected alphabet
	 *
	 * @param char "The selected character"
	 */
	$scope.filterByAlphabet = function(char) {
		$scope.shows = Show.query({alphabet: char});
		$scope.headingTitle = "Shows with " + char;
	};
}]);