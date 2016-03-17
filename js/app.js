
var map;
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: -34.397, lng: 150.644},
		zoom: 8
	});
}

var ViewModel = function() {
	var self = this;

};

ko.applyBindings(new ViewModel());

