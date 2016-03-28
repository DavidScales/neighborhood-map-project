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
 * the next stage of the app is initiated with calls to 'getDetails' and 'initYelp'.
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
	console.log('Requesting Google Places data...');

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

		// For testing - TODO
		// console.log(results);

		// Request more details for the Place objects from Google Places
		getDetails();
		// Request more details for the Place objects from Yelp
		initYelp();
	}
}

/*******************************************************************************************
 * Model
 *******************************************************************************************/

/* Results from the Google Places request are converted into a Place object. Place objects
 * store relevant data about each place, that will be displayed in the view. KO observables
 * are used to ensure view content is updated when future API calls change model data.
 *
 * Because 3rd Party API's are called only once, I could likely avoid using KO observables
 * in this section, in lieu of more traditional dynamic content creation. However, as KO
 * is already loaded for other aspects of the app, I will stick to it for consistency, and
 * potential future scalability */
var Place = function(placeData) {

	// Store local scope
	var self = this;

	// These values are extracted from the initial Places request
	this.name = placeData.name; // The name of the place
	this.open = placeData.opening_hours.open_now; // TODO - show and/or filter by 'open now'
	this.address = placeData.formatted_address; // Formatted address
	this.shortAddress = placeData.formatted_address.split(',')[0]; // Simple street address
	this.place_id = placeData.place_id; // Identifier that will be used for future API requests
	this.google_rating = placeData.rating; // Google's rating for this place

	// Extract location
	var lat = placeData.geometry.location.lat();
	var lng = placeData.geometry.location.lng();

	// Create and append Google map markers for each place based on location
	this.marker = new google.maps.Marker({
		position: {lat, lng},
		map: map,
		title: placeData.name, // Set title to place name
		animation: google.maps.Animation.DROP // Add drop animation for marker initialization
	});

	// These values will be updated on a successful request to Google Places Details
	this.formatted_phone_number = ko.observable('Phone number unavailable'); // Formatted phone number
	this.raw_phone_number = 'raw phone number'; // Unformatted phone number

	// These values will be updated on a successful request to Yelp
	this.review_count = ko.observable('# of reviews unavailable'); // # of Yelp reviews
	this.yelp_rating_img_url = ko.observable('http://placekitten.com/g/50/50'); // Yelp rating image
	this.yelp_url = ko.observable('http://placekitten.com/g/200/150'); // Corresponding Yelp web page
	this.yelp_image_url = ko.observable('http://placekitten.com/g/200/150'); // A Yelp image of the place

	/* Using a KO computed observable, the content of Google Map info windows can be dynamically
	 * updated as future API calls change Place data */
	this.infoWindowContent = ko.computed(function(){
		var contentString = '';
		// TODO
		contentString += '<h3>'+self.formatted_phone_number()+'</h3>'+
						 '<img src="'+self.yelp_image_url()+'" alt="yelp rating">';

		return contentString;
	});

	// Info windows will be built on demand to ensure up-to-date values are used
	this.buildInfoWindow = function(){
		self.infoWindow = new google.maps.InfoWindow({
				content: self.infoWindowContent()
			});
	};

	// Listen to marker clicks
	this.marker.addListener('click', function() {
		// On click, set this place to be the "active" place
		viewModel.setActivePlace(self);
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

	// A bound text <input> allows filtering of places.
	self.filterText = ko.observable('');

	/* This is the list of places to be displayed in the view (as a list, and as markers on the map).
	 * It is filtered by user text input. It's bound to the <ul> for places, and will update in real
	 * time as the user changes the filter text in the <input>. */
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

		// Build and open info window
		self.activePlace().buildInfoWindow();
		self.activePlace().infoWindow.open(map, self.activePlace().marker);
	};
};

// Apply bindings to the ViewModel, linking UI/View with Model/data
var viewModel = new ViewModel();
ko.applyBindings(viewModel);

/*******************************************************************************************
 * Google Places Details request
 *******************************************************************************************/

/* This function performs a second Google Places request, for each 'place' in the model.
 * This second request gets additional information for each 'place', specifically its phone number.
 * The phone number is used not only for the view, but also to identify corresponding location
 * information returned from future Yelp requests. */
function getDetails(){

	console.log('Requesting Google Place Details data...');

	// Keep track of when requests have been recieved for all places
	var count = 0;

	// For each place in the model
	for (var i = 0, total = places().length; i < total; i++) {

		// Create a Google Place Details request object
		var request = {
			placeId: places()[i].place_id
		};

		// Create and send a Google Place Details request
		service = new google.maps.places.PlacesService(map);
		service.getDetails(request, detailsCallback);
	}

	// This callback recieves the new data for each place, and incorperates it into the model
	function detailsCallback(place, status){

		// If the request was successful
		if (status == google.maps.places.PlacesServiceStatus.OK) {

			// Compare each place in the model to the data recieved
			for (var j = 0, total = places().length; j < total; j++){

				// If the places have the same ID
				if (place.place_id == places()[j].place_id){
					// Update the corresponding place's phone number fields in the model
					places()[j].formatted_phone_number(place.formatted_phone_number);
					places()[j].raw_phone_number = place.formatted_phone_number.replace(/[()-]|\s/g, "");
				}
			}
		}
		// Otherwise the request was unsuccessful
		else {
			// Log status / error
			console.log(status);
		}

		// Increment the number of responses (successful or not)
		count++;

		// If all of the responses are complete (successful or not)
		if (count >= places().length){
			// Update loaded status
			detailsLoaded = true;

			// if Yelp responses are also complete
			if (yelpLoaded) {
				// Integrate Yelp data into model
				integrateYelp();
			}
		}
	}
}

// Keep track of when details have been loaded
var detailsLoaded = false;

/*******************************************************************************************
 * Yelp requests
 *******************************************************************************************/

/* This function iterates through each place in the model, and makes a request for Yelp data
 * on each corresponding place. Once Yelp data is recieved, it is stored. */
function initYelp() {

	/* Thanks to MarkN on Udacity forums for help explaining Yelp request and OAuth use
	 * https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/4 */

	console.log('Requesting Yelp data...');

	// Abstract some Yelp API / OAuth parameters
	// These should ideally be hidden somehow...
	var yelp_url = 'https://api.yelp.com/v2/search?';
	var YELP_KEY = 'c_mhQXy35rz4043INaHmfg';
	var YELP_KEY_SECRET = 'GyunKRoE9EkuYwUe_zzFkJ24JG8';
	var YELP_TOKEN = 'LtonUTLkQVzi-rA3HEp0rWvmLd9DuvTm';
	var YELP_TOKEN_SECRET = '_AzbVT0ASeJhb1BT92FS1kofRk8';

	// For each place in the model
	for (var i = 0, total = places().length; i < total; i++) {

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
		};

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

		// Error occuring
		// {"error": {"text": "One or more parameters are missing in request", "id": "MISSING_PARAMETER", "field": "oauth_consumer_key"}}

		*/
	}
}

// Store Yelp responses
var yelpResonses = [];
// Keep track of when data has been loaded
var yelpLoaded = false;

// This callback recieves the Yelp data for each place, and stores it.
function yelpCallback(data) {
	yelpResonses.push(data.businesses[0]);

	// If Yelp responses are complete
	if (yelpResonses.length == places().length) {
		// Update loaded status
		yelpLoaded = true;

		// If Details responses are also complete
		if (detailsLoaded) {
			// Integrate Yelp data into model
			integrateYelp();
		}
	}
}

/* Integrate Yelp data into model. This function will only execute once all Details requests are complete, since
 * the phone number data from the Details request are needed to integrate Yelp data with the model. */
function integrateYelp() {

	// Compare each place in the model with Yelp responses
	for (var i = 0, total = places().length; i < total; i++) {

		for (var j = 0, totalYelp = yelpResonses.length; j < totalYelp; j++) {

			// If the phone numbers or addresses match
			if ( places()[i].raw_phone_number == yelpResonses[j].phone || places()[i].shortAddress == yelpResonses[j].location.address[0]) {

				// Update model data
				places()[i].review_count(yelpResonses[j].review_count); // # of Yelp reviews
				places()[i].yelp_rating_img_url(yelpResonses[j].rating_img_url); // Yelp rating image
				places()[i].yelp_url(yelpResonses[j].url); // Corresponding Yelp web page
				places()[i].yelp_image_url(yelpResonses[j].image_url); // A Yelp image from the place
				// End once a match is found
				return;
			}
		}
	}
}

/* A note on failure: This app performs four external API requests.
 *
 * The first is to Google Maps, to create the map and get the Google Places library. Should this fail, the
 * entire app's functionality is essentially destroyed, since all features are based on this. There
 * is thus no way to really compensate for this. Even if the app didn't break, there would be nothing
 * to display. TODO - add failure alert
 *
 * The second is to Google Places, to get data on 'places' in the neighborhood. Similarly, if this
 * fails, the entire app's functionality is destroyed, and again there is thus no way to really
 * compensate for this. Even if the app didn't break, there would be nothing to display. TODO - add
 * failure alert
 *
 * The third is to Google Place Details, which gets phone numbers for each place in the model. If this
 * fails, the fourth request (to Yelp) would cause errors, because this request relies on comparing
 * phone numbers in order to identify which place in the model to update. However, failure should simply
 * mean that default model values are not updated, and these default values specify to the user that an
 * error has occured and the app will not break. TODO - test
 *
 * The fourth is to Yelp, and similar to the Google Place Details request, failure of this request
 * should simply mean that default model values aren't updated, and these value should inform the user
 * that an error has occured, and the app will not break. Side note: because this is a cross domain request,
 * JSONP must be used and does not support $.ajax.fail or $.ajax.error. TODO - test */



