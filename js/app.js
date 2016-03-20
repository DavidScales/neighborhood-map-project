/* app.js */

/*******************************************************************************************
 * Google Maps initialization, Google Places request
 *******************************************************************************************/

// Initialize map
var map;
var service;
var infoWindow;
var placesRequested = false; // Prevent multiple requests
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
	 * The boolean condition 'mapRequest', ensures that the map won't be re-requested
	 * every time the map bounds change.
	 *
	 * Alternatively, a 'location' and 'radius' parameter could be used. This would be
	 * faster (we don't need to wait for map tiles to load before sending Places request)
	 * but this would only return results in a circular area, which isn't representative
	 * of the map.
	 */
	var request = {}; // Initialize request object
	map.addListener('bounds_changed', function() {
		// If Google Places have not been requested
		if (!placesRequested){
			// Set request option parameters
			request.type = 'meal_takeaway'; // Return results that are takeout capable restaurants
			request.query = 'restaurants'; // Search for 'restaurants' as keyword
			request.bounds = map.getBounds(); // Get results only within our map boundaries

			// Prepare Google Places request
			service = new google.maps.places.PlacesService(map);
			// Custom timing measurement - Google Places request sent
			window.performance.mark('places_request_start');
			// Send Google Places request
			service.textSearch(request, placesCallback);
			// Change Places requested status, to avoid multiple requests
			placesRequested = true;
		}
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
	    // Custom timing measurement - places list built
		window.performance.mark('places_list_built');

		// For testing
		console.log(results);
	}
}

/* Places are stored in an observable array, which is bound to the #places-list <ul>
 * in the HTML. This automatically updates the View with a list */
var places = ko.observableArray();

/* Results from the Google Places request are converted into a Place object, where each property
 * is an observable */
var Place = function(placeData) {
	//
	var self = this;
	// TODO
	this.name = placeData.name; // The name of the place // Even need this line?
	this.open = placeData.opening_hours.open_now; // TODO - show and/or filter by 'open now'

	// Extract location
	var lat = placeData.geometry.location.lat();
	var lng = placeData.geometry.location.lng();

	// Create and append Google map markers for each place based on location
	this.marker = new google.maps.Marker({
		position: {lat, lng},
		title: placeData.name,
		map: map,
		animation: google.maps.Animation.DROP // Add drop animation for marker initialization
	});
	// Listen to marker clicks
	this.marker.addListener('click', function() {
		// On click, set corresponding place to be the active place
		viewModel.setActivePlace(self);
	});
};

// ViewModel allows interaction between UI/View and Model/data
var ViewModel = function() {

	// Save local scope
	var self = this;

	// Text to filter our places is bound to <input>
	self.filterText = ko.observable('Pizza');

	/* Filter places by user text input. This is bound to <ul> for places, and will update in real
	 * time as the user changes the filter text in <input>, or the places list changes */
	self.filteredList = ko.computed(function(){

		// Custom timing measurement - filter start
		window.performance.mark('filter_start');

		// Store the filter text and the places list, limiting re-computation
		var filterText = self.filterText().toLowerCase(); // Filter text, lower cased
		var placesCopy = places().slice(); // Places list
		var placesLength = placesCopy.length; // Places list length, for loop
		// Store filtered places
		var filteredList = [];

		// For each place in the places list
		for (var i = 0; i < placesLength; i++) {
			// If the place name (lower case) contains the filter text
			if ( placesCopy[i].name.toLowerCase().includes(filterText) ) {
				// Add the corresponding map marker
				placesCopy[i].marker.setMap(map);
				// Add appropriate places to filtered list
				filteredList.push( placesCopy[i] );
			}
			// Otherwise
			else {
				// Remove the corresponding map marker
				placesCopy[i].marker.setMap(null);
			}
		}

		// Custom timing measurement - filter end
		window.performance.mark('filter_end');
		window.performance.measure('filter_time', 'filter_start', 'filter_end');

		// Return only places that contain the filter text
		return filteredList;
	});

	/* Keep track of which place is currently under investigation by the user, or "active".
	 * A click listener exists on each WHAT UI element, that calls a function which changes
	 * the clicked UI element's corresponding place to the "active" place. KO logic in the html
	 * changes the CSS class of the active UI element.
	 * Bound to WHAT */ // TODO - WHAT?
	self.activePlace = ko.observable('uninitialized');

	/* Update the place that is currently active.
	 * Bound to WHAT, called on UI click. */ // TODO - WHAT?
	self.setActivePlace = function(clickedPlace) {
		// Set new active place
		self.activePlace(clickedPlace);
		// Create a bounce animation for the active place
		clickedPlace.marker.setAnimation(google.maps.Animation.BOUNCE); // Begin bouncing
		setTimeout( function(){clickedPlace.marker.setAnimation(null)}, 1400 ); // Stop after 2 bounces (700ms each)
	}
};

// Apply bindgings to the ViewModel, linking UI/View with Model/data
var viewModel = new ViewModel();
ko.applyBindings(viewModel);

/* Current bug - map bounds resizing will re-request and autoupdate list and map */





