var map;
var infowindow;
var searchBox;
var infowindow;
var list;

// Initialize Google Map
function initMap() {

	// Default location
	var defaultLoc = {lat: 53.3808279, lng: -1.4708821};

	// Center map on default location
	map = new google.maps.Map(document.getElementById('map'), {
		center: defaultLoc,
		zoom: 15
	});

	// Link search input to UI element.
	var input = document.getElementById('search');
	searchBox = new google.maps.places.SearchBox(input);
	infowindow = new google.maps.InfoWindow();

	// Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	// Location entered into search box
	var markers = [];
	searchBox.addListener('places_changed', function() {

	// Set global list
	list = [];

	// Get places
	var places = searchBox.getPlaces();
	if (places.length === 0) {
		return;
	}

	// Clear out old markers
	markers.forEach(function(marker) {
		marker.setMap(null);
	});
	markers = [];

	// For each place, get the icon, name and location.
	var bounds = new google.maps.LatLngBounds();
	places.forEach(function(place) {

		// Nothing found
		if (!place.geometry) {
			console.log("Returned place contains no geometry");
			return;
		}

		// Icon
		var icon = {
			url: place.icon,
			size: new google.maps.Size(71, 71),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(17, 34),
			scaledSize: new google.maps.Size(25, 25)
		};

		// Create a marker for each place.
		var marker = new google.maps.Marker({
			map: map,
			icon: icon,
			title: place.name,
			position: place.geometry.location
		});

		// Place details
		var request = { reference: place.reference };
		var details = new google.maps.places.PlacesService(map);
		details.getDetails(request, function(details, status) {

			// Add to object
			var obj = {
			"name": place.name,
			"address": place.formatted_address,
			"website": "",
			"phone_number": "",
			"emails": ""
			};

			// E-Mails
			var emails = '';
			if (details != null) {

				if (details.website != null) {
					var emailList = [];
					$.get("https://api.hunter.io/v2/domain-search?api_key="+hunter_key+"&domain="+details.website, function( data ) {
					$.each(data.data.emails, function(index, value) {
						emails += '<a href="mailto:'+value.value+'">'+value.value+'</a><br>';
						emailList.push(value.value);
					});
					});
					obj.website = details.website;
					obj.emails = emailList;
				}

				if (details.formatted_phone_number != null) {
					obj.phone_number = details.formatted_phone_number;
				}

			}

			// Push to master list
			list.push(obj);

			// If marker clicked
			google.maps.event.addListener(marker, 'click', function() {

				// Set info bubble
				infowindow.setContent('<div><h2>' + place.name + '</h2><br>' +
					'<span class="title">Address</span><br>' + place.formatted_address + '<br><br>' +
					(obj.phone_number === "" ? '' : '<span class="title">Phone Number</span><br>' + obj.phone_number + '<br><br>') +
					(obj.website === "" ? '' : '<span class="title">Website</span><br><a target="_blank" href="' + obj.website + '" title="'+ obj.website + '">'+ obj.website.substring(0,50) + '</a><br><br>') +
					(emails.length > 0 ? '<span class="title">E-Mail(s)</span><br>' + emails : '') +
					'</div>');
				infowindow.open(map, this);

			});

		});

		// Add to markers
		markers.push(marker);

		// Viewport
		if (place.geometry.viewport) {
			bounds.union(place.geometry.viewport);
		} else {
			bounds.extend(place.geometry.location);
		}

		});

		map.fitBounds(bounds);
	});
}

// Creates the text list
function createPopup(list){
	var popup = open("", "Popup", "width=400,height=600");

	$(list).each(function(index,value){
		var section = popup.document.createElement("div");
		section.style = "margin-bottom: 20px; padding-bottom: 10px; border-bottom: solid 1px gray;";

		section.innerHTML += '<b>Name:</b> '+value.name + '<br>';
		section.innerHTML += '<b>Address:</b> '+value.address + '<br>';
		section.innerHTML += '<b>Website:</b> <a href="'+value.website+'">'+value.website+'</a><br>';
		section.innerHTML += '<b>Phone Number:</b> '+value.phone_number + '<br>';
		section.innerHTML += '<b>Emails:<br>';
		$(value.emails).each(function(index,value){
			section.innerHTML += '<a href="mailto:'+value+'">'+value+'</a><br>';
		});

		popup.document.body.appendChild(section);
	});
}

// Creates a CSV file and downloads it
function downloadCSV(list) {
	var csv = toCsv(list);
	var downloadLink = document.createElement("a");
	var blob = new Blob(["\ufeff", csv]);
	var url = URL.createObjectURL(blob);
	downloadLink.href = url;
	downloadLink.download = "places.csv";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

/**
* Converts a value to a string appropriate for entry into a CSV table.  E.g., a string value will be surrounded by quotes.
* @param {string|number|object} theValue
* @param {string} sDelimiter The string delimiter.  Defaults to a double quote (") if omitted.
*/
function toCsvValue(theValue, sDelimiter) {
	var t = typeof (theValue), output;

	if (typeof (sDelimiter) === "undefined" || sDelimiter === null) {
		sDelimiter = '"';
	}

	if (t === "undefined" || t === null) {
		output = "";
	} else if (t === "string") {
		output = sDelimiter + theValue + sDelimiter;
	} else {
		output = String(theValue);
	}

	return output;
}

/**
* Converts an array of objects (with identical schemas) into a CSV table.
* @param {Array} objArray An array of objects.  Each object in the array must have the same property list.
* @param {string} sDelimiter The string delimiter.  Defaults to a double quote (") if omitted.
* @param {string} cDelimiter The column delimiter.  Defaults to a comma (,) if omitted.
* @return {string} The CSV equivalent of objArray.
*/
function toCsv(objArray, sDelimiter, cDelimiter) {
	var i, l, names = [], name, value, obj, row, output = "", n, nl;

	// Initialize default parameters.
	if (typeof (sDelimiter) === "undefined" || sDelimiter === null) {
		sDelimiter = '"';
	}
	if (typeof (cDelimiter) === "undefined" || cDelimiter === null) {
		cDelimiter = ",";
	}

	for (i = 0, l = objArray.length; i < l; i += 1) {
		// Get the names of the properties.
		obj = objArray[i];
		row = "";
		if (i === 0) {
			// Loop through the names
			for (name in obj) {
				if (obj.hasOwnProperty(name)) {
					names.push(name);
					row += [sDelimiter, name, sDelimiter, cDelimiter].join("");
				}
			}
			row = row.substring(0, row.length - 1);
			output += row;
		}

		output += "\n";
		row = "";
		for (n = 0, nl = names.length; n < nl; n += 1) {
			name = names[n];
			value = obj[name];
			if (n > 0) {
				row += ",";
			}
			row += toCsvValue(value, '"');
		}
		output += row;
	}

	return output;
}