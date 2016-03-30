/* app.js */

/*
 * TODO
 */

/*******************************************************************************************
 * Constants
 *******************************************************************************************/

// Geographic coordinates that will be used to define our map's initial center
var LAT = 37.5181;
var LNG = -122.2917;
// The map's starting zoom level
var ZOOM = 13;
// The search radius, in meters
var RADIUS = 5000;
// Yelp initial search location
var yelpStartingLocation = 'Belmont, California';

/*******************************************************************************************
 * Yelp requests
 *******************************************************************************************/

/* This function makes a request to the Yelp API for local restaurant data */
function getYelp() {

	/* Thanks to MarkN on Udacity forums for help explaining Yelp request and OAuth use
	 * https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/4 */

 	// User Timing API - for testing perf
	window.performance.mark('getYelp_called');
	window.performance.measure('getYelp delay', 'start_app', 'getYelp_called');

	console.log('Requesting Yelp data...');

	// Abstract some Yelp API / OAuth parameters
	// These should ideally be hidden somehow...
	var yelp_url = 'https://api.yelp.com/v2/search?';
	var YELP_KEY = 'c_mhQXy35rz4043INaHmfg';
	var YELP_KEY_SECRET = 'GyunKRoE9EkuYwUe_zzFkJ24JG8';
	var YELP_TOKEN = 'LtonUTLkQVzi-rA3HEp0rWvmLd9DuvTm';
	var YELP_TOKEN_SECRET = '_AzbVT0ASeJhb1BT92FS1kofRk8';

	// Set required Yelp API parameters object
	var parameters = {
		// OAuth required values
		oauth_consumer_key: YELP_KEY,
		oauth_token: YELP_TOKEN,
		oauth_nonce: Math.floor(Math.random() * 1e12).toString(), // Generates a random number and returns it as a string for OAuthentication
		oauth_timestamp: Math.floor(Date.now()/1000), // Generates a timestamp
		oauth_signature_method: 'HMAC-SHA1',
		oauth_version : '1.0',
		callback: 'yelpCallback', // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
		// Place-specific parameters for request
		location: yelpStartingLocation, // Location of the place
		term: 'food', // Search for food (broader than 'restaurant')
		limit: 10, // Limit number of search results to reduce clutter
		radius_filter: RADIUS // Narrow the physical area of search
	};

	// Generate a required OAuth signature using external library
	var encodedSignature = oauthSignature.generate('GET',yelp_url, parameters, YELP_KEY_SECRET, YELP_TOKEN_SECRET);
	// Add the signature to the Yelp parameters object
	parameters.oauth_signature = encodedSignature;

	// Set settings object for AJAX request
	var settings = {
		url: yelp_url, // url for Yelp API
		data: parameters, // Send the Yelp API parameters
		cache: true,  // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
		dataType: 'jsonp', // Need jsonp for cross-domain requests
		jsonp: false, // Prevent jQuery from defining its own callback function, which invalidates OAuth stuff
	};

 	// User Timing API - for testing perf
	window.performance.mark('yelp_data_requested');
	window.performance.measure('getYelp executing', 'getYelp_called', 'yelp_data_requested');

	// Send AJAX query via jQuery library
	$.ajax(settings);

	/* Trying to work out a way to make successful AJAX requests without jQuery */
	// http://blog.garstasio.com/you-dont-need-jquery/ajax/#jsonp

	/*
	var url = yelp_url+
	'cache='+settings.cache+
	'&dataType='+settings.dataType+
	'&jsonp='+settings.jsonp+
	'&oauth_consumer_key='+parameters.oauth_consumer_key+
	'&oauth_token='+parameters.oauth_token+
	'&oauth_nonce='+parameters.oauth_nonce+
	'&oauth_timestamp='+parameters.oauth_timestamp+
	'&oauth_signature='+parameters.oauth_signature+
	'&oauth_signature_method='+parameters.oauth_signature_method+
	'&oauth_version='+parameters.oauth_version+
	'&callback='+parameters.callback+
	'&location='+parameters.location+
	'&term='+parameters.term+
	'&limit='+parameters.limit;

	var scriptElement = document.createElement('script');
	scriptElement.setAttribute('src', url);
	document.body.appendChild(scriptElement);

	// Error occuring...
	// {"error": {"text": "One or more parameters are missing in request", "id": "MISSING_PARAMETER", "field": "oauth_consumer_key"}}
	*/

}

/* This callback recieves the Yelp data for the local restaurants, converts them into Place objects,
 * and stores them in an observable array. */
function yelpCallback(data) {

	console.log('Recieving Yelp data...');

 	// User Timing API - for testing perf
	window.performance.mark('yelpCallback_start');
	window.performance.measure('Wait for Yelp data', 'yelp_data_requested', 'yelpCallback_start');

	for (var i = 0, total = data.businesses.length; i < total; i++) { //
		places.push( new Place(data.businesses[i]) );
    }

 	// User Timing API - for testing perf
	window.performance.mark('yelpCallback_end');
	window.performance.measure('yelpCallback executing', 'yelpCallback_start', 'yelpCallback_end');
}

/*******************************************************************************************
 * Google Maps initialization, Google Places request
 *******************************************************************************************/
/* A Google Map is created, centered on our initial neighborhood, and put into the view.
 * This function is called as a callback to the Google Maps API request in index.html */

// Initialize map
var map;
var service;

// initMap called by Google Maps API callback
function initMap() {

	// User Timing API - for testing perf
	window.performance.mark('initMap_called');
	window.performance.measure('Wait for maps', 'maps_request', 'initMap_called');

	console.log('Setting up map...');

	// Set map starting center.
	var googleStartingLocation = new google.maps.LatLng(LAT, LNG);

	// Create map in the #map div
	map = new google.maps.Map(document.getElementById('map'), {
		center: googleStartingLocation,
		zoom: ZOOM
	});

	// User Timing API - for testing perf
	window.performance.mark('initMap_done');
	window.performance.measure('Load map', 'initMap_called', 'initMap_done');
}

/*******************************************************************************************
 * Model
 *******************************************************************************************/
/* Results from the Yelp request are converted into Place objects. Place objects
 * store relevant data about each place, that will be displayed in the view. They also
 * establish each place's info window, map marker, and map marker listener.
 */
var Place = function(placeData) {

	// User Timing API - for testing perf
	// window.performance.mark('place_start');

	// Store local scope
	var self = this;

	// These values are extracted from the initial Yelp request
	this.name = placeData.name; // Name
	this.address = placeData.location.display_address[0]; // Address
	this.phoneNumber = placeData.display_phone; // Phone number
	this.rating = placeData.rating; // Yelp rating, numeric
	this.ratingImage = placeData.rating_img_url; // Yelp rating, graphic
	this.reviewCount = placeData.review_count; // Number of Yelp reviews
	this.image = placeData.image_url; // A Yelp image associated with the place
	this.snippetText = placeData.snippet_text; // A Yelp snippet associated with the place
	this.yelpUrl = placeData.url; // Link to the place's Yelp web page

	var lat = placeData.location.coordinate.latitude; // Latitude for map marker placement
	var lng = placeData.location.coordinate.longitude;// Longitude for map marker placement

	// Create and append Google map markers for each place based on location
	this.marker = new google.maps.Marker({
		position: {lat, lng},
		map: map,
		title: self.name, // Set title to place name
		animation: google.maps.Animation.DROP // Add drop animation for marker initialization
	});

	// Listen to marker clicks
	this.marker.addListener('click', function() {
		// On click, set this place to be the "active" place
		viewModel.setActivePlace(self);
	});

	// Build HTML content for an info window
	this.infoWindowContent = '<h1>'+self.name+'</h1>'+
							 '<h2>'+self.address+'</h2>'+
							 '<h2>'+self.phoneNumber+'</h2>'+
						     '<img src="'+self.image+'" alt="yelp image">'+
						     '<img src="'+self.ratingImage+'" alt="yelp rating">'+
						     '<p>'+self.reviewCount+'</p>'+
						     '<p>'+self.snippetText+'</p>';

	// Establish an info window (not yet displayed)
	self.infoWindow = new google.maps.InfoWindow({
		content: self.infoWindowContent
	});

	// User Timing API - for testing perf
	// window.performance.mark('place_end');
	// window.performance.measure('Building place', 'place_start', 'place_end');
};

/* Places are stored in an observable array, which is bound to the #places-list <ul>
 * in the HTML. This automatically updates the View with a list */
var places = ko.observableArray();

/*******************************************************************************************
 * ViewModel
 *******************************************************************************************/

// ViewModel allows interaction between UI/View and Model/data
var ViewModel = function() {

	// Store local scope
	var self = this;

	// A bound text <input> allows filtering of places.
	self.filterText = ko.observable('');

	/* This is the list of places to be displayed in the view (as a list, and as markers on the map).
	 * It is filtered by user text input. It's bound to the <ul> for places, and will update in real
	 * time as the user changes the filter text in the <input>. */
	self.filteredList = ko.computed(function(){

		// User Timing API - for testing perf
		// window.performance.mark('filter_start');

		// Store the filter text and the places list, limiting re-computation
		var filterText = self.filterText().toLowerCase(); // Filter text, lower cased
		var placesCopy = places().slice(); // Store a shallow copy of places
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

		// User Timing API - for testing perf
		// window.performance.mark('filter_end');
		// window.performance.measure('Filtering', 'filter_start', 'filter_end');

		// Return only places that contain the filter text
		return filteredList;
	});

	/* Keep track of which place is currently under investigation by the user, or "active".
	 * A click listener exists on each 'place' UI element (map marker and <li> item), that calls
	 * a function which changes the clicked element's corresponding place to the "active" place.
	 * KO logic in the html changes the CSS class of the active UI element.
	 */
	self.activePlace = ko.observable('uninitialized');

	/* Update the place that is currently active.
	 * Called on UI click ('place' map marker or <li> item */
	self.setActivePlace = function(clickedPlace) {

		// If the active place has been initialized
		if (self.activePlace() !== 'uninitialized') {

			// Reset the active place's map marker
			self.activePlace().marker.setIcon(null);

			// Close the active place's info window
			self.activePlace().infoWindow.close();
		}

		// Set new active place
		self.activePlace(clickedPlace);

		// Set new marker icon, which is distinct from the rest
		self.activePlace().marker.setIcon('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|00BCD4');

		// Create a bounce animation for the active place
		self.activePlace().marker.setAnimation(google.maps.Animation.BOUNCE); // Begin bouncing
		setTimeout( function(){clickedPlace.marker.setAnimation(null);}, 1400 ); // Stop after 2 bounces (700ms each)

		// Open info window
		self.activePlace().infoWindow.open(map, self.activePlace().marker);
	};
};

// Apply bindings to the ViewModel, linking UI/View with Model/data
var viewModel = new ViewModel();
ko.applyBindings(viewModel);

/* A note on failure: This app performs two external API requests.
 *
 * The first is to Google Maps, to create the map. Should this fail, the
 * entire app's functionality is essentially destroyed, since all features are based on this. There
 * is thus no way to really compensate for this. Even if the app didn't break, there would be nothing
 * to display. TODO - add failure alert
 *
 * The second is to Yelp, and similar to the Google Map request, failure of this request
 * Should this fail, the
 * entire app's functionality is essentially destroyed, since all features are based on this. There
 * is thus no way to really compensate for this. Even if the app didn't break, there would be nothing
 * to display. TODO - add failure alert
 *
 * Side note: because this is a cross domain request,
 * JSONP must be used and does not support $.ajax.fail or $.ajax.error. TODO - test */

getYelp();

// Testing with User Timing API - log measurements
function logMeasurements(){

	var measures = window.performance.getEntriesByType('measure');

	var name, start, end, duration;

	for (var i = 0; i < measures.length; i++){

		name = measures[i].name;
		duration = Math.floor(measures[i].duration);
		start = Math.floor(measures[i].startTime);
		end = start + duration;

		console.log(start + ': ' + name + '(' + duration + '): ' + end);
	}
}

