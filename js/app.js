/* app.js */

/*******************************************************************************************
 * Google Maps initialization, Google Places request
 *******************************************************************************************/

// Initialize map
var map;
var service;
var infoWindow;
// initMap called by Google Maps API callback
function initMap() {

	// Custom timing measurement - Google Maps callback called
	window.performance.mark('maps_callback_start');

	// Set map starting center. Produces: {lat: -34.397, lng: 150.644}
	var startingLocation = new google.maps.LatLng(37.5181, -122.2917);

	// Create map in the #map div
	map = new google.maps.Map(document.getElementById('map'), {
		center: startingLocation,
		zoom: 13
	});

	/* Set up Google Places request object, and send request
	 *
	 * An event listener is used, because map bounds cannot be acquired until the map
	 * tiles have fully loaded. Listening for the 'bounds_changed' event ensures that
	 * getBounds() will not fire until the maps initial bounds are actually established.
	 *
	 * Alternatively, a 'location' and 'radius' parameter could be used. This would be
	 * faster (we don't need to wait for map tiles to load before sending Places request)
	 * but this would only return results in a circular area, which isn't representative
	 * of the map.
	 */
	var request = {}; // Initialize request object
	map.addListener('bounds_changed', function() {
		// Set request option parameters
		request.type = 'meal_takeaway'; // Return results that are takeout capable restaurants
		request.query = 'restaurants'; // Search for 'restaurants' as keyword
		request.bounds = map.getBounds(); // Get results only within our map boundaries

		// Send Google Places request
		service = new google.maps.places.PlacesService(map);
		service.textSearch(request, placesCallback);
	});
}

// Handle Google Places response
function placesCallback(results, status) {

	// Custom timing measurement - Google Places callback called
	window.performance.mark('places_callback_start');

	// Confirm successful response
	if (status == google.maps.places.PlacesServiceStatus.OK){
	    /* Results from the Google Places request are converted into Place objects,
	       and stored in an observable array.  */
	    for (var i = 0; i < results.length; i++) {
			places.push( new Place(results[i]) );
	    }
	}
}

/* Places are stored in an observable array, which is bound to the #places-list <ul>
   in the HTML. This automatically updates the View with a list */
var places = ko.observableArray();

/* Results from the Google Places request are converted into a Place object, where each property
   is an observable */
// TODO - do ALL properties need to be observables? Or just .active?
var Place = function(placeData) {
	this.active = ko.observable(false);
	this.name = ko.observable(placeData.name);
	this.open = ko.observable(placeData.opening_hours.open_now);
}

// ViewModel allows interaction between UI/View and Model/data
var ViewModel = function() {

	// Save local scope
	var self = this;

	// Connect the observable array of places to ViewModel
	this.placesList = places;

	// TODO
	// this.activePlace = ko.observable( this.placesList()[0] ); // ???

	// TODO
	// this.setActivePlace = function(clickedPlace) {
	// 	self.activePlace(clickedPlace);
	// }
};

// Apply bindgings to the ViewModel, linking UI/View with Model/data
ko.applyBindings(new ViewModel());

