# Neighborhood Map Project

This project is a single page application featuring a neighborhood map that contains information on local restaurants, gathered from 3rd party API's. From this project, I learned how design patterns can help keep a codebase manageable, and speed up production. I also gained some experience with AJAX and using 3rd party API's.

### Running the Application
The easiest way to check out the app is to simply visit the [hosted site], or open *src/index.html* in your browser. *Note - there is currently some bugs for older versions of the native android browser, but Chrome, Safari, and Firefox should work fine.*

### Building the Application
I used Grunt to build a production version of the site (located in *dist*). The Gruntfile (included in the repo), minifies and uglifies the CSS, HTML, and JavaScript, and inlines them directly into the main HTML file, *index.html*. It also optimizes the site's images. To build the production code, simply run `grunt` in the command line from the project directory. The source code can be found in *src*.

### How It Works
The app starts by sending a Google Maps API (and Google Places Library) request, from *index.html*. In the meantime, local storage is checked for existing location and restaurant data from a previous user visit.

If this data is not present, a Yelp API request is made using default values. The Yelp API returns info (as JSON objects) about restaurants in a neighborhood. As a callback, these objects are converted into "Place" objects, and the original data is stored in local storage for the next user visit. Place objects store relevant data about each place, that will be displayed in the view. They also establish each place's info window, map marker, and map marker listener. Places are stored in an observable array (model), which is bound to the HTML. This automatically updates the view.

If data from a previous visit is found, that is used instead, and is similarly converted and stored. This is initiated by the Google Maps API callback. This callback also creates a Google Map, centered on either the previous or default neighborhood, and puts it into the view. Google Autocomplete functionality is then established on a user text input, and enables said input to update the current neighborhood. This will recenter the map on the new location, request new Yelp data (updating the model), and update local storage appropriately.

Should either the Yelp or Google API's fail, the user is alerted.

The ViewModel contains functionality for hiding and showing a sidebar, buttons, and infowindows, based on user mouse clicks and hovering. Additionally, the ability to filter places (as list items and map markers) based on rating and name are established here and bound to user inputs. Small visual changes, such as bouncing a map marker or changing the CSS of a list item, are also established and similarly bound to the UI.

The site has a mobile-first design, and utilizes jQuery, Knockout, OAuth, and Grunt.

### Credits
I used a variety of tools and resources:

- Map icons and favicon from [simpleicon.com]
- [Google Maps API]
- [Google Places Library]
- [jQuery]
- [Knockout]
- [Yelp API]
- [A sliding menu tutorial]
- [grunt inline]
- [grunt htmlmin]
- [grunt imageoptim]
- [Image Magick]
- [ImageOptim]
- [A helpful Udacity post on OAuth]
- [OAuth library]

[hosted site]:<http://davidscales.github.io/neighborhood-map-project/dist/>
[simpleicon.com]:<http://simpleicon.com/>
[Google Maps API]:<https://developers.google.com/maps/documentation/javascript/>
[Google Places Library]:<https://developers.google.com/places/javascript/>
[jQuery]:<https://jquery.com/>
[Knockout]:<http://knockoutjs.com/>
[Yelp API]:<https://www.yelp.com/developers/documentation/v2/overview>
[A sliding menu tutorial]:<http://www.sitepoint.com/css3-sliding-menu/>
[A helpful Udacity post on OAuth]:<https://discussions.udacity.com/t/how-to-make-ajax-request-to-yelp-api/13699/4>
[OAuth library]:<https://github.com/bettiolo/oauth-signature-js>
[Image Magick]: <http://www.imagemagick.org/script/index.php>
[ImageOptim]: <https://imageoptim.com/>
[grunt imageoptim]:<https://github.com/JamieMason/grunt-imageoptim>
[grunt htmlmin]:<https://github.com/gruntjs/grunt-contrib-htmlmin>
[grunt inline]:<https://github.com/chyingp/grunt-inline>