/* app.js */

/*
 * TODO
 */

/*******************************************************************************************
 * Check localStorage and initialize location data
 *******************************************************************************************/

// The map's starting zoom level
var ZOOM = 13;
// The search radius, in meters
var RADIUS = 5000;


/*
 * Geographic coordinates that will be used to define our map's initial center
 */

// Check localStorage for data from previous user visit
var mapCenterStored = localStorage.getItem('mapCenter');

// If data was stored, set the map center to the existing map canter
if (mapCenterStored !== null) {
	var mapCenter = JSON.parse(mapCenterStored);
}
// If no data was stored, set the map center to a default
else {
	var mapCenter = {
		'lat': 37.5181,
		'lng': -122.2917
	};
}


/*
 * Search term used for Yelp requests
 */

// Check localStorage for data from previous user visit
var yelpLocationStored = localStorage.getItem('yelpLocation');

// If data was stored, use the existing search term
if (yelpLocationStored !== null) {
	var yelpLocation = yelpLocationStored;
}
// If no data was stored, use a default search term
else {
	var yelpLocation = 'Belmont, California';
}


/*
 * If Yelp data doesn't exist from a previous user visit, request new Yelp data.
 * If old Yelp data does exist, the old data will be loaded instead, once Google Maps has responded.
 */

// Check localStorage for data from previous user visit
var placesStoredString = localStorage.getItem('placesStored');

// If data is absent, request new Yelp data
if (placesStoredString === null) {

	// Begin Yelp request
	getYelp();
}

/*******************************************************************************************
 * Yelp requests
 *******************************************************************************************/

// Holder for storing Yelp data in localStorage
var placesStorage;

/* This function makes a request to the Yelp API for local restaurant data */
function getYelp() {

	/* Thanks to MarkN on Udacity forums for help explaining Yelp request and OAuth use
	 * https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/4 */

 	// User Timing API - for testing perf
	window.performance.mark('getYelp_called');
	window.performance.measure('getYelp delay', 'start_app', 'getYelp_called');

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
		location: yelpLocation, // Location of the place
		term: 'food', // Search for food (broader than "restaurant")
		limit: 10, // Limit number of search results to reduce clutter
		radius_filter: RADIUS // Narrow the physical area of search
	};

	// Generate a required OAuth signature using external library
	var encodedSignature = oauthSignature.generate('GET',yelp_url, parameters, YELP_KEY_SECRET, YELP_TOKEN_SECRET);
	// Add the signature to the Yelp parameters object
	parameters.oauth_signature = encodedSignature;

	// Set settings object for AJAX request
	var settings = {
		url: yelp_url, // base url for Yelp API
		data: parameters, // Send the Yelp API parameters
		cache: true,  // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
		dataType: 'jsonp', // Need jsonp for cross-domain requests
		jsonp: false // Prevent jQuery from defining its own callback function, which invalidates OAuth stuff
	};

 	// User Timing API - for testing perf
	window.performance.mark('yelp_data_requested');
	window.performance.measure('getYelp executing', 'getYelp_called', 'yelp_data_requested');

	// Set a timeout in case Yelp request fails
	/* This is required because our Yelp request is cross origin and uses JSONP,
	 * which will not execute our callback if an error occurs */
	yelpTimeout = window.setTimeout(function(){
		alert("It looks like Yelp isn't responding :( Try refreshing the page."+
		      " If that doesn't work, consider going outside :D ");
	}, 4000);

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
 * and stores them in an observable array. Also stores data as normal objects, and updates localStorage */
function yelpCallback(data) {

	// Clear the Yelp error timeout, since we have recieved a response
	window.clearTimeout(yelpTimeout);

 	// User Timing API - for testing perf
	window.performance.mark('yelpCallback_start');
	window.performance.measure('Wait for Yelp data', 'yelp_data_requested', 'yelpCallback_start');

	// Clear existing places data
	places([]);
	placesStorage = [];

	// For each place returned
	for (var i = 0, total = data.businesses.length; i < total; i++) {

		// Convert data to Place object and add to observable array
		places.push( new Place(data.businesses[i]) );

		// Save raw data for localStorage
		placesStorage.push(data.businesses[i]);
    }

    // Store/update raw places data in localStorage
    localStorage.setItem('placesStored', JSON.stringify(placesStorage) );
    // Store/update Yelp location data in localStorage
    localStorage.setItem('yelpLocation', yelpLocation);

 	// User Timing API - for testing perf
	window.performance.mark('yelpCallback_end');
	window.performance.measure('yelpCallback executing', 'yelpCallback_start', 'yelpCallback_end');
}

/* If Yelp data persists from the last user visit, this function will load it into the places array.
 * This is used in lieu of an unnecessary Yelp request */
function loadStoredData() {

	console.log('loading stored data into places');

	// Convert places data string into JSON object
	storedPlaces = JSON.parse(placesStoredString);

	// For each place, create and append a new Place object
	for (var i = 0, total = storedPlaces.length; i < total; i++) {

		// Convert data to Place object and add to observable array
		places.push( new Place(storedPlaces[i]) );

	}
}

/*******************************************************************************************
 * Google Maps initialization, Google Places request
 *******************************************************************************************/
/* A Google Map is created, centered on our initial neighborhood, and put into the view.
 * This function is called as a callback to the Google Maps API request in index.html.
 *
 * Additionally, if persistent Yelp data from a previous user visit exists, this function
 * will kick off the loading of that data (and the Yelp request will be skipped).
 *
 * Finally, this function will establish Google Autocomplete functionality on a user
 * text <input>, and enable said input to update the current location. This will
 * re-center the map on the new location, request new Yelp data (updating the places model),
 * and update localStorage appropriately. */

// Initialize map
var map;
var service;
var geocoder; // Used later for converting locations to coordinates

// initMap called by Google Maps API callback
function initMap() {

	// User Timing API - for testing perf
	window.performance.mark('initMap_called');
	window.performance.measure('Wait for maps', 'maps_request', 'initMap_called');

	// Create map in the #map div
	map = new google.maps.Map(document.getElementById('map'), {
		center: mapCenter,
		zoom: ZOOM,
		mapTypeControl: false
	});

	/* Once maps has successfully loaded */

	/* If places data exists from last user visit, simply load that data into places array */
	if (placesStoredString !== null) {

		// Load from last visit into places array
		loadStoredData();
	}

	// Set country restriction to US
	var countryRestrict = {'country': 'us'};

	// Initiated the Google Autocomplete object
	var autocomplete = new google.maps.places.Autocomplete(

		// Connect to UI text <input>
		( document.getElementById('location-search-text-autocomplete') ), {
	 		types: ['address'], // Only show addresses
	 		componentRestrictions: countryRestrict // Restrict to United States
		});

	// Add listener for place selection
	autocomplete.addListener('place_changed', onPlaceChange);

	/* This function searches for places in a new location based on user <input>.
	 * It is called when a place is selected from the autocomplete list.
	 */
	function onPlaceChange() {

		// Store selected location
		var location = autocomplete.getPlace();

		// If results are valid
		if (location.geometry && location.formatted_address) {

			// For each existing place
			for (var i = 0, total = places().length; i < total; i++) {

				// Remove the corresponding map marker
				places()[i].marker.setMap(null);
			}

			// Update the Yelp location to the user's <input>
			yelpLocation = location.formatted_address;

			// Begin a new Yelp request with the new location
			getYelp();

			// Update the map center
			mapCenter = location.geometry.location;

			// Update the map center in localStorage
			localStorage.setItem('mapCenter', JSON.stringify(mapCenter) );

			// Re-center the map
			map.setCenter(mapCenter);
		}
	}

	// User Timing API - for testing perf
	window.performance.mark('initMap_done');
	window.performance.measure('Load map', 'initMap_called', 'initMap_done');
}

/* Alert the user if Google Maps failed to load. This function is called if the Maps
 * request is unsuccessful */
function mapsError() {
	alert("It looks like Google Maps isn't working :( Try refreshing the page."+
		  " If that doesn't work, consider going outside :D");
	// document.location.href = 'http://www.mozilla.org' // Relocate to apology page
}

/*******************************************************************************************
 * Model
 *******************************************************************************************/
/* Results from the Yelp request are converted into Place objects. Place objects
 * store relevant data about each place, that will be displayed in the view. They also
 * establish each place's info window, map marker, and map marker listener.
 */
var Place = function(placeData) {

	// Store local scope
	var self = this;

	// These values are extracted from the initial Yelp request
	this.name = placeData.name; // Name
	this.address = placeData.location.display_address[0]; // Address
	this.autoPhoneNumber = "tel:" + placeData.display_phone; // Formatted phone number for autodialing
	this.phoneNumber = "("+placeData.phone.slice(0,3)+")"+placeData.phone.slice(3,6)+"-"+placeData.phone.slice(6); // Formatted phone number for displaying
	this.rating = placeData.rating; // Yelp rating, numeric
	this.ratingImage = placeData.rating_img_url; // Yelp rating, graphic
	this.reviewCount = placeData.review_count; // Number of Yelp reviews
	this.image = placeData.image_url; // A Yelp image associated with the place
	this.snippetText = placeData.snippet_text; // A Yelp snippet associated with the place
	this.yelpUrl = placeData.url; // Link to the place's Yelp web page
	this.lat = placeData.location.coordinate.latitude; // Latitude for map marker placement
	this.lng = placeData.location.coordinate.longitude;// Longitude for map marker placement

	// Create and append Google map markers for each place based on location
	this.marker = new google.maps.Marker({
		position: {
			lat: self.lat,
			lng: self.lng
		},
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
	this.infoWindowContent = '<div class="infowindow">'+
							 '<h1>'+self.name+'</h1>'+
							 '<h2>'+self.address+'</h2>'+
							 '<a href="'+self.autoPhoneNumber+'">'+self.phoneNumber+'</a>'+
						     '<img src="'+self.image+'" alt="yelp image">'+
						     '<img src="'+self.ratingImage+'" alt="yelp rating">'+
						     '<p>'+self.reviewCount+'</p>'+
						     '<p>'+self.snippetText+'</p>'+
						     '</div>';

	// Establish an info window (not yet displayed)
	self.infoWindow = new google.maps.InfoWindow({
		content: self.infoWindowContent,
		maxWidth: 250 // Restrict maximum width, looks better
	});
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

	/* Open/closed status of the sidebar. This boolean is used in the HTML to determine what CSS
	 * class to apply to the sidebar (an "open" class or "closed/default" class). Functions
	 * are called to change the status of this boolean when a user hovers/clicks areas in the UI. */
	self.sidebarVisible = ko.observable(false);

	// Open the sidebar, changing its CSS class. Bound to UI. Also close current info window.
	self.openSidebar = function() {

		// Open sidebar
		self.sidebarVisible(true);

		// If the active place has been initialized
		if (self.activePlace() !== 'uninitialized') {

			// Close the current active place's info window
			self.activePlace().infoWindow.close();
		}
	};

	// Close the sidebar, changing its CSS class. Bound to UI.
	self.closeSidebar = function() {
		self.sidebarVisible(false);
	};

	// Minimum star value for filtering by rating. This is bound to a slider <input> & <span>
	self.ratingNumber = ko.observable(0);

	// A bound text <input> allows filtering of places by name.
	self.filterText = ko.observable('');

	/* This is the list of places to be displayed in the view (as a list, and as markers on the map).
	 * It is filtered by user input. It's bound to the <ul> for places, and will update in real
	 * time as the user changes the filter text in the <input>. */
	self.filteredList = ko.computed(function(){

		// Store the filter text and the places list, limiting re-computation
		var filterText = self.filterText().toLowerCase(); // Filter text, lower cased
		var placesCopy = places().slice(); // Store a shallow copy of places
		var placesLength = placesCopy.length; // Places list length, for loop
		// Store filtered places
		var filteredList = [];

		// For each place in the places list
		for (var i = 0; i < placesLength; i++) {

			// If the place name (lower case) contains the filter text, and the rating is above the minimum
			if ( placesCopy[i].name.toLowerCase().includes(filterText) &&  placesCopy[i].rating >= self.ratingNumber() ) {

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

			// Reset the current active place's map marker
			self.activePlace().marker.setIcon(null);

			// Close the current active place's info window
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

		// Shift map to compensate for Google's silly Info Window placement. Slightly hacky.
		// setTimeout(function(){
		// 	map.panBy(-20,0);
		// }, 500);

	};
};

// Apply bindings to the ViewModel, linking UI/View with Model/data
var viewModel = new ViewModel();
ko.applyBindings(viewModel);

/*******************************************************************************************
 * Testing
 *******************************************************************************************/

// Testing with User Timing API - log perf measurements
function logMeasurements(){

	var measures = window.performance.getEntriesByType('measure');

	var name, start, end, duration;

	for (var i = 0; i < measures.length; i++){

		name = measures[i].name;
		duration = Math.floor(measures[i].duration);
		start = Math.floor(measures[i].startTime);
		end = start + duration;

		console.log(name+': @'+start+'ms, taking '+duration+'ms, ending at '+end+'ms');
	}
}
