/* app.js */
/*
 * TODO
 */

/*******************************************************************************************
 * Constants
 *******************************************************************************************/

 // These are the geographic coordinates that will be used to define our neighborhood's location
 var LAT = 37.5181;
 var LNG = -122.2917;
 // This is the search radius around our neighborhood center
 var RADIUS = 4000;
 // This is the map's starting zoom level
 var ZOOM = 13;

/*******************************************************************************************
 * Google Maps initialization, Google Places request
 *******************************************************************************************/
/* This function is what begins the application. It is called as the callback to the Google
 * Places API request in index.html. A Google Map is created, centered on our neighborhood, and
 * put into the view. A Google Places request is then build based on our neighborhood, and sent.
 * The response is a list of objects, each representing a takeout restaurant. A callback function
 * converts each of these into a 'Place' object, and stores them in a 'places' list. Finally,
 * the next stage of the app is initiated with a call to 'getDetais'.
 */

// Initialize map
var map;
var service;

// initMap called by Google Maps API callback
function initMap() {

	// Custom timing measurement - Google Maps callback called
	window.performance.mark('maps_callback_start');

	// Set map starting center.
	var startingLocation = new google.maps.LatLng(LAT, LNG);

	// Create map in the #map div
	map = new google.maps.Map(document.getElementById('map'), {
		center: startingLocation,
		zoom: ZOOM
	});

	// Set up Google Places request object
	 var request = {
	 	type: 'meal_takeaway', // Return results that are takeout capable restaurants
	 	query: 'restaurants', // Search for 'restaurants' as keyword
	 	location: startingLocation, // Get results for our neighborhood
	 	radius: RADIUS // Limit results to those close by our neighborhood
	 };

	// Prepare Google Places request
	service = new google.maps.places.PlacesService(map);
	// Custom timing measurement - Google Places request sent
	window.performance.mark('places_request_start');
	// Send Google Places request
	service.textSearch(request, placesCallback);
}

// Handle Google Places response
function placesCallback(results, status) {

	// Custom timing measurement - Google Places callback called
	window.performance.mark('places_callback_start');

	// Confirm successful response
	if (status == google.maps.places.PlacesServiceStatus.OK){

	    /* Results from the Google Places request are converted into Place objects,
	       and stored in an observable array. A hard coded limit was used instead of
	       results.length because using too many places was causing query limits in
	       Google's getDetails requests */
	    for (var i = 0; i < 10; i++) { //
			places.push( new Place(results[i]) );
	    }
	    // Custom timing measurement - places list built
		window.performance.mark('places_list_built');

		// For testing
		console.log(results);

		// Request more details for the Place objects from Google Places
		getDetails();
	}
}

/*******************************************************************************************
 *
 *******************************************************************************************/

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
	this.address = placeData.formatted_address; // Formatted address
	this.shortAddress = placeData.formatted_address.split(',')[0];
	// console.log (this.shortAddress); //TODO
	this.place_id = placeData.place_id; // TODO
	// TODO
	this.google_rating = placeData.rating;

	// Extract location
	var lat = placeData.geometry.location.lat();
	var lng = placeData.geometry.location.lng();
	//
	this.lat = lat;
	this.lng = lng;

	// Create and append Google map markers for each place based on location
	this.marker = new google.maps.Marker({
		position: {lat, lng},
		map: map,
		title: placeData.name, // Set title to place name
		animation: google.maps.Animation.DROP // Add drop animation for marker initialization
	});

	// --
	// Added later from getDetails ..
	this.formatted_phone_number = ko.observable('formatted phone number');
	this.raw_phone_number = 'raw phone number';
	// Added later from initYelp ..
	this.review_count = '# of reviews';
	this.yelp_rating_img_url = 'http://placekitten.com/g/50/50';
	this.yelp_url = 'http://placekitten.com/g/200/150';
	this.yelp_image_url = 'http://placekitten.com/g/200/150';

	// --
	this.infoWindowContent = ko.computed(function(){
		var contentString = '';
		// --
		contentString += '<h3>'+self.formatted_phone_number()+'</h3>'+
						 '<img src="'+self.yelp_image_url+'" alt="yelp rating">';

		return contentString;
	});
	// --
	this.buildInfoWindow = function(){
		self.infoWindow = new google.maps.InfoWindow({
				content: self.infoWindowContent() // -- ?
			});
	};

	// Listen to marker clicks
	this.marker.addListener('click', function() {
		// On click, set corresponding place to be the active place
		viewModel.setActivePlace(self);
	});
};

/*******************************************************************************************
 *
 *******************************************************************************************/

// ViewModel allows interaction between UI/View and Model/data
var ViewModel = function() {

	// Save local scope
	var self = this;

	// Text to filter our places is bound to <input>
	self.filterText = ko.observable('Pizza');

	/* Filter places by user text input. This is bound to <ul> for places, and will update in real
	 * time as the user changes the filter text in <input>. Updating/re-computation will not occur
	 * if 'places' changes however, thanks to the use of peek(). This will prevent re-computation
	 * each time a new place is added during 'places' initialization, as well as when additional data
	 * from the Yelp API is added to each place. */
	self.filteredList = ko.computed(function(){

		//
		console.log('filtering');

		// Custom timing measurement - filter start
		window.performance.mark('filter_start');

		// Store the filter text and the places list, limiting re-computation
		var filterText = self.filterText().toLowerCase(); // Filter text, lower cased
		var placesCopy = places.peek().slice(); // Places list. Peek() prevents recomputation
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

		// If the active place has been initialized
		if (self.activePlace() !== 'uninitialized') {
			// Reset the active place's map marker
			self.activePlace().marker.setIcon(null);
			// -- Close the active place's info window
			self.activePlace().infoWindow.close();

		}

		// Set new active place
		self.activePlace(clickedPlace);

		// Set new marker icon
		self.activePlace().marker.setIcon('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|00BCD4');

		// Create a bounce animation for the active place
		self.activePlace().marker.setAnimation(google.maps.Animation.BOUNCE); // Begin bouncing
		setTimeout( function(){clickedPlace.marker.setAnimation(null)}, 1400 ); // Stop after 2 bounces (700ms each)

		//-- Open info window
		self.activePlace().buildInfoWindow();
		self.activePlace().infoWindow.open(map, self.activePlace().marker);
	}
};

// Apply bindgings to the ViewModel, linking UI/View with Model/data
var viewModel = new ViewModel();
ko.applyBindings(viewModel);

/*******************************************************************************************
 *
 *******************************************************************************************/

/* */
function getDetails(){

	var count = 0;

	for (var i = 0; i < places().length; i++) {
		var request = {
			placeId: places()[i].place_id
		};
		service = new google.maps.places.PlacesService(map);
		service.getDetails(request, callback);
	}

	function callback(place, status){
		if (status == google.maps.places.PlacesServiceStatus.OK) {

			for (var j = 0; j < places().length; j++){
				if (place.place_id == places()[j].place_id){
					// places()[j].formatted_phone_number = place.formatted_phone_number;
					// --
					places()[j].formatted_phone_number(place.formatted_phone_number);
					places()[j].raw_phone_number = place.formatted_phone_number.replace(/[()-]|\s/g, "");
				}
				else{
					//
				}
			}

			count++;

			if (count >= places().length){
				initYelp();
			}

		}
		else {
			console.log(status);
			//
		}
	}
}

/*******************************************************************************************
 *
 *******************************************************************************************/

// https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/4
// MarkN

function initYelp() {

	// Testing
	console.log('Initializing Yelp...');

	// Abstract some Yelp API parameters
	var yelp_url = 'https://api.yelp.com/v2/search?';
	var YELP_KEY = 'c_mhQXy35rz4043INaHmfg';
	var YELP_KEY_SECRET = 'GyunKRoE9EkuYwUe_zzFkJ24JG8';
	var YELP_TOKEN = 'LtonUTLkQVzi-rA3HEp0rWvmLd9DuvTm';
	var YELP_TOKEN_SECRET = '_AzbVT0ASeJhb1BT92FS1kofRk8';

	//
	for (var i = 0, total = places().length; i < total; i++) {

		// Set required Yelp API parameters object
		var parameters = {
			// OAuth required values
			oauth_consumer_key: YELP_KEY,
			oauth_token: YELP_TOKEN,
			oauth_nonce: Math.floor(Math.random() * 1e12).toString(), // Generates a random number and returns it as a string for OAuthentication
			oauth_timestamp: Math.floor(Date.now()/1000),
			oauth_signature_method: 'HMAC-SHA1',
			oauth_version : '1.0',
			callback: 'yelpCB', // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
			// Place-specific parameters for request
			location: places()[i].address, // Location of the place
			term: places()[i].name, // Name of place
			limit: 1 // Limit to only one response item
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
			test: 'test' // TODO
		};

		/* done and fail - jsonP */ // TODO

		//
		// Send AJAX query via jQuery library
		$.ajax(settings);

	}
};

function yelpCB(data) {

	//
	placesCopy = [];
	for (var i = 0; i < places().length; i++) {
		placesCopy.push(places()[i]);
	}
	placesLength = placesCopy.length;

	for (var i = 0; i < placesLength; i++) {
		if ( placesCopy[i].raw_phone_number == data.businesses[0].phone || placesCopy[i].shortAddress == data.businesses[0].location.address[0]) {

			places()[i].review_count = data.businesses[0].review_count;
			places()[i].yelp_rating_img_url = data.businesses[0].rating_img_url;
			places()[i].yelp_url = data.businesses[0].url;
			places()[i].yelp_image_url = data.businesses[0].image_url;
			return;
		}
	}
};



