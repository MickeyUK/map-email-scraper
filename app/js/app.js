/**
 * Map E-Mail Scraper
 * 
 * @file   This file contains the main application logic.
 * @author Michael Dearman
 */

/**
 * Google Map
 * @type {google.maps.Map}
 */
var map;

/**
 * Search radius in meters
 * @type {Number}
 */
var radius = 50000;

/**
 * Search queries
 * @type {Array}
 */
var collections = [];

/**
 * Temporary search results for processing
 * @type {Array}
 */
var searchResults;

/**
 * Google Maps markers
 * @type {Array}
 */
var markers = [];

/**
 * The establishment query input field
 * @type {HTMLInputElement}
 */
var queryField;

/**
 * Google Maps SearchBox
 * @type {google.maps.places.SearchBox}
 */
var searchField;

/**
 * Google Maps info window
 * @type {google.maps.InfoWindow}
 */
var infoWindow;

/**
 * Active collection
 * @type {Number}
 */
var collectionIndex = 0;

/**
 * Active page
 * @type {Number}
 */
var pageIndex = 0;

/**
 * Active page
 * @type {Number}
 */
var pageSize = 20;

/**
 * Page start index
 * @type {Number}
 */
var pageStart = 0;

/**
 * Page end index
 * @type {Number}
 */
var pageEnd = 0;

/**
 * Page total
 * @type {Number}
 */
var pageTotal = 0;

/**
 * Map or list view
 * @type {Number}
 */
var viewIndex = 0;

/**
 * Google API key
 * @type {String}
 */
var googleAPIKey = "";

/**
 * Hunter.io API key
 * @type {String}
 */
var hunterAPIKey = "";

/**
 * ----------------------------------------------------------
 * Initialization Functions
 * 
 * The application is initialized when the Google Maps API is
 * loaded. The initApp() function is called when the API is
 * ready.
 * ----------------------------------------------------------
 */

/**
 * Initialize everything
 */
function init() {

    // Load settings from local storage
    loadSettings().then(function () {

        // Initialize search fields
        //initSearchForm();

        // Initialize the map
        //initMap();

        // Initialize info window
        //infoWindow = new google.maps.InfoWindow();

    });

}

/**
 * After settings have been read, then initialize the app.
 */
function initApp() {

    // Show app
    document.getElementById('app').classList.add('active');

    // Initialize search fields
    initSearchForm();

    // Create google maps script and load it
    var script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + googleAPIKey + "&libraries=places&callback=initMap";
    document.body.appendChild(script);

}

/**
 * Load settings from local storage.
 * 
 * @returns {boolean}
 */
async function loadSettings() {

    api.getData().then((data) => {

        console.log(data);

        // Set API keys
        googleAPIKey = data.googleAPIKey;
        hunterAPIKey = data.hunterAPIKey;

        // Set collections
        collections = data.collections;

        // Has the google api key been set?
        if (googleAPIKey == "") {

            // First time setup
            document.getElementById('setup').classList.add('active');

        } else {

            // Load the app
            initApp();

        }

        return true;

    });

}

/**
 * This saves all the collections to file.
 */
function saveSettings() {

    // Make a copy of the collections array
    var copy = JSON.parse(JSON.stringify(collections));

    // Loop through every collection
    for (var i = 0; i < copy.length; i++) {
        
        // Loop through every result and delete location property
        for (var j = 0; j < copy[i].results.length; j++) {
            delete copy[i].results[j].location;
        }

    }

    // Make save data object
    var saveData = {
        googleAPIKey: googleAPIKey,
        hunterAPIKey: hunterAPIKey,
        collections: copy,
    };

    // Save with electron store
    api.saveData(saveData).then((data) => {

        // Stuff

    });

}

/**
 * Initialize the search field
 */
function initSearchForm() {

    // Add autocomplete to the query field
    queryField = document.getElementById('business-field');
    autocomplete(queryField, businessCategories);

    // Update radius slider
    var progress = document.querySelector('.progress');
    var valueLabel = document.querySelector('#slider-value');
    valueLabel.innerHTML = progress.value * 500;

}

/**
 * Initialize the Google Map
 */
function initMap() {

    // Google search options
    // https://developers.google.com/maps/documentation/javascript/places-autocomplete#add_autocomplete
    var options = {
        types: ['(establishments)'],
    };

    // Initialize the SearchBox field
    var input = document.getElementById('search-field');
    searchField = new google.maps.places.SearchBox(input, options);

    // Initialize info window
    infoWindow = new google.maps.InfoWindow();

    // Google map options
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    options = {
        center: new google.maps.LatLng(51.508742, -0.120850),
        zoom: 5,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL,
        },
        panControl: true,
        scaleControl: true,
        streetViewControl: false,
    };
    
    // Create the map
    map = new google.maps.Map(document.getElementById("results-map"), options);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
		searchField.setBounds(map.getBounds());
    });

    // Initialize collections
    initCollections();

}

/**
 * Show the setup form
 */
function toggleSetup() {

    // Set input fields
    document.getElementById('google-field').value = googleAPIKey;
    document.getElementById('hunter-field').value = hunterAPIKey;

    document.getElementById('app').classList.remove('active');
    document.getElementById('setup').classList.toggle('active');
    
}

/**
 * First time setup form submit
 */
function setup() {

    // Set API keys
    googleAPIKey = document.getElementById('google-field').value;
    hunterAPIKey = document.getElementById('hunter-field').value;

    // Google maps API key is required
    if (googleAPIKey == "") {
        showAlert('Please enter a Google Maps API key.');
        return;
    }

    // Save settings
    saveSettings();

    // Hide setup form
    document.getElementById('setup').classList.remove('active');

    // Initialize the app
    initApp();

}

/**
 * ----------------------------------------------------------
 * Collection Functions
 * 
 * The application sorts the search results into collections
 * based on the search query. This allows the user to search
 * for multiple types of establishments at once.
 * ----------------------------------------------------------
 */

function initCollections() {

    // If there are no collections, create a default one
    if (collections.length == 0) {
        createCollection();
    } else {

        // For each collection, add a marker to the map
        for (var i = 0; i < collections.length; i++) {

            // Create a new collection div
            var collection = document.createElement('div');
            collection.id = 'collection-' + i;
            collection.classList.add('collection');

            collection.innerHTML = `
                <div class="collection-info" onclick="setCollection(${i});">
                    <div class="collection-label">Searching For</div>
                    <div class="collection-query">${ collections[i].query }</div>
                    <div class="collection-label">Near</div>
                    <div class="collection-location">${ collections[i].location }</div>
                    <div class="collection-label">Within</div>
                    <div class="collection-radius">${ collections[i].radius }</div>
                </div>
                ${(i == 0 ? `` : `<div class="collection-delete" onclick="deleteCollection(${i})"></div>`)}
            `;

            document.getElementById('collections').appendChild(collection);

            // Create blank marker
            markers.push([]);

        }

        // Set the active collection
        setCollection(0);

    }

}

/**
 * Creates a new results collection.
 */
function createCollection() {

    // Clear map markers
    resetMarkers();

    // Create collection
    var collection = {
        query: "",
        location: "",
        radius: radius,
        results: [],
    };
            
    // Add collection to the collections array
    collections.push(collection);

    // Create corresponding markers array
    markers.push([]);

    // Create collection element
    var collection = document.createElement('div');
    collection.id = 'collection-' + (collections.length-1);
    collection.classList.add('collection');

    collection.innerHTML = `
        <div class="collection-info" onclick="setCollection(${collections.length-1});">
            <div class="collection-label">Searching For</div>
            <div class="collection-query"></div>
            <div class="collection-label">Near</div>
            <div class="collection-location"></div>
            <div class="collection-label">Within</div>
            <div class="collection-radius"></div>
        </div>
        ${ ((collections.length-1) == 0 ? `` : `<div class="collection-delete" onclick="deleteCollection(${(collections.length-1)})"></div>`) }
    `;

    // Append collection to the sidebar
    var sidebar = document.getElementById('collections');
    sidebar.appendChild(collection);

    // Set the new collection as active
    if (map != null) map.setCenter(new google.maps.LatLng(51.508742, -0.120850));
    setCollection(collections.length-1);

    return collection;

}

/**
 * Sets the active collection.
 * 
 * @param {number} index    The index of the collection to set as active 
 */
function setCollection(index) {

    // Show map, hide list
    if (map != null) map.setCenter(new google.maps.LatLng(51.508742, -0.120850));
    document.getElementById('results-map').classList.add('active');
    document.getElementById('results-list').classList.remove('active');

    // Clear map markers
    resetMarkers();

    // Get the collection element
    var collection = document.getElementById('collection-' + index);

    // Get the active collection element
    var activeCollection = document.querySelector('.collection.active');

    // Remove the active class from the active collection
    if (activeCollection) {
        activeCollection.classList.remove('active');
    }

    // Add the active class to the new collection
    collection.classList.add('active');

    // Set the active collection index
    collectionIndex = index;

    // Add markers to the map
    pageIndex = 0;
    if (markers[index].length > 0) {
        updatePagination();
    } else {

        // Hide header and footer
        document.getElementById('results-header').classList.remove('active');
        document.getElementById('results-footer').classList.remove('active');

    }

    // Update pagination
    updatePagination();

    // Update the search form
    viewMap();

}

/**
 * Deletes a results collection.
 * 
 * @param {number} index    The index of the collection to delete 
 */
function deleteCollection(index) {

    // Clear map markers
    resetMarkers();

    // Get the collection element
    var collection = document.getElementById('collection-' + index);

    // Remove the collection element
    collection.parentNode.removeChild(collection);

    // Update IDs of all collections
    var collectionElements = document.querySelectorAll('.collection');
    for (var i = 0; i < collectionElements.length; i++) {
        collectionElements[i].id = 'collection-' + i;
    }

    // Delete the collection from the collections array
    collections.splice(index, 1);

    // Remove the markers array
    markers.splice(index, 1);

    // Set the active collection
    setCollection(index - 1);

    // Save the updated collections
    saveSettings();

}

/**
 * Updates a results collection information.
 */
function updateCollection(index, collectionQuery, collectionLocation, collectionRadius) {

    // Update collection
    collections[index].query = collectionQuery;
    collections[index].location = collectionLocation;
    collections[index].radius = collectionRadius;

    // Get the collection element
    var collection = document.getElementById('collection-' + index);

    // Update the query label
    var queryLabel = collection.querySelector('.collection-query');
    queryLabel.innerHTML = collections[index].query;

    // Update the location label
    var locationLabel = collection.querySelector('.collection-location');
    locationLabel.innerHTML = collections[index].location;

    // Update the radius label
    var radiusLabel = collection.querySelector('.collection-radius');
    radiusLabel.innerHTML = collections[index].radius + 'm';

}


/**
 * Resets a results collection, removing all results.
 * 
 * @param {number} index    The index of the collection to reset 
 */
function resetCollection(index) {

    // Reset collection
    collections[index].results = [];

    // Reset markers
    markers[index] = [];

    // Reset pagination
    pageIndex = 0;

}

/**
 * ----------------------------------------------------------
 * Google Functions
 * 
 * The application uses the Google Places API to search for
 * establishments. The search results are stored in the
 * searchResults array. The results are then processed and
 * added to the collections array.
 * ----------------------------------------------------------
 */

/**
 * Creates a marker to place on the map.
 * 
 * @param {google.maps.places.PlaceResult} place  The Google Place object 
 */
function createMarker(establishment) {

    // Create marker
    var marker = new google.maps.Marker({
        map: null,
        position: establishment.location,
        title: establishment.name,
    });

    // Add click event listener to marker
    marker.addListener('click', function () {
        
        infoWindow.setContent(`
        ${ infoWindowProperty("", establishment.photo, 4) }
        <div class="info-window">
            <h2>${establishment.name}</h2>
            <div class="info-properties">
                ${ infoWindowProperty("Address", establishment.address) }
                ${ infoWindowProperty("Phone Number", establishment.phone, 2) }
                ${ infoWindowProperty("Website", establishment.website, 1) }
                ${ infoWindowProperty("E-Mail", establishment.email, 3) }
            </div>
        </div>
        `);
        
        infoWindow.open(map, this);

    });

    // Add marker to the markers array
    markers[collectionIndex].push(marker);

    return marker;

}

/**
 * Resets the markers array.
 */
function resetMarkers() {

    // Remove all markers from the map
    if (markers[collectionIndex] !== undefined) {
        for (var i = 0; i < markers[collectionIndex].length; i++) {
            if (markers[collectionIndex][i] !== undefined)
                markers[collectionIndex][i].setMap(null);
        }
    }

}

/**
 * Creates a formatted establishment object
 * from a Google Place object, and adds it to
 * the collection.
 * 
 * @param {google.maps.places.PlaceResult} place  The Google Place object 
 */
function createEstablishment(place) {
    
    // Create establishment
    var establishment = {
        id: 0,
        name: place.name,
        status: place.business_status,
        address: place.formatted_address,
        location: place.geometry.location,
        latidude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        price: place.price_level,
        photo: (place.photos !== undefined &&  place.photos[0] !== undefined) ? place.photos[0].getUrl() : null,
        website: null,
        phone: null,
        twitter: null,
        facebook: null,
        linkedin: null,
        instagram: null,
        email: [],
    };

    // Add establishment to collection
    collections[collectionIndex].results.push(establishment);

    return establishment;
    
}

/**
 * ----------------------------------------------------------
 * Google Search Functions
 * 
 * The application searches for establishments using the
 * Google Places API. The search results are stored in the
 * collections array.
 * ----------------------------------------------------------
 */

/**
 * Updates the radius value and slider.
 */
function onRadiusChange() {

    var progress = document.querySelector('.progress');
    var valueLabel = document.querySelector('#slider-value');

    var value = progress.value;
    radius = value * 500;
    valueLabel.innerHTML = radius;
    progress.style.background = `linear-gradient(to right, #FFF 0%, #FFF ${value}%, rgb(0, 120, 215) ${value}%, rgb(0, 120, 215) 100%)`;

}

/**
 * Searches for establishments using the Google Places API.
 */
function newSearch() {

    // Show map, hide list
    map.setCenter(new google.maps.LatLng(51.508742, -0.120850));
    document.getElementById('results-map').classList.add('active');
    document.getElementById('results-list').classList.remove('active');

    // Hide results header and footer
    document.getElementById('results-header').classList.remove('active');
    document.getElementById('results-footer').classList.remove('active');
    document.getElementById('results-list-container').classList.remove('active');

    // Check if business field is empty
    if (queryField.value.length === 0) return;

    // Get SearchBox results
    var places = searchField.getPlaces();
    if (places == null) return;

    // Reset the markers
    resetMarkers();

    // Reset the current collection
    resetCollection(collectionIndex);

    // Update the collection properties
    updateCollection(collectionIndex, queryField.value, searchField.getPlaces()[0].formatted_address, radius);

    // Do the google text search
    textSearch(places);

}

/**
 * Performs a Google Places text search.
 * 
 * @param {google.maps.places.PlaceResults} places  The Google Places object
 */
async function textSearch(places) {

    // Show loading overlay
    document.getElementById('overlay').classList.add('active');
    document.getElementById('overlay-loading-fill').style.width = '0%';

    searchResults = [];
    var service = new google.maps.places.PlacesService(map);
    
    // Create bounds
    var bounds = new google.maps.LatLngBounds();
    
    service.textSearch({
        query: queryField.value,
        location: places[0].geometry.location,
        type: ['establishment'],
        radius: radius,
    }, async function (results, status, pagination) {

        // Clear search form
        searchField.set('places', null);
        var input = document.getElementById('search-field').value = '';

        // Check if the search was successful
        if (status !== google.maps.places.PlacesServiceStatus.OK) return false;

        // Loop through results
        for (var i = 0; i < results.length; i++) {

            // Store results for later use
            searchResults.push(results[i]);

            // Update bounds
            bounds.extend(results[i].geometry.location);

        }

        // Sleep for 2 seconds before getting the next page
        await sleep(2000);

        // Check if there are more results
        if (pagination.hasNextPage) {

            pagination.nextPage();

        } else {

            // Fit map to bounds
            map.fitBounds(bounds);

            // Process the search results
            processResults();

        }
        

    });

}

/**
 * Processes the search results.
 */
async function processResults() {

    // Hunter.IO Status
    var hunterEnabled = true;

    // Loop through results
    for (var i = 0; i < searchResults.length; i++) {

        // Google place object
        var place = searchResults[i];

        // Invalid place
        if (place == null || !place.geometry) {
            console.log("Returned place contains no geometry");
            continue;
        }

        // Bias map to first result
        if (i === 0) map.setCenter(place.geometry.location);

        // Create establishment
        var establishment = createEstablishment(place);
        establishment.id = i;

        // Get place details
        var service = new google.maps.places.PlacesService(map);
        service.getDetails({
            placeId: place.place_id,
            fields: ['website', 'formatted_phone_number'],
        }, function (place, status) {

            // Check if the search was successful
            if (status !== google.maps.places.PlacesServiceStatus.OK) return false;

            // Update establishment
            establishment.website = place.website;
            establishment.phone = place.formatted_phone_number;

            // Get contact info
            if (hunterEnabled && hunterAPIKey !== '') {

                fetch(`https://api.hunter.io/v2/domain-search?api_key=${hunterAPIKey}&domain=${establishment.website}`, {
                    method: 'GET',
                }).then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    hunterEnabled = false;
                    throw new Error('Request failed!');
                }, networkError => {
                    console.log(networkError.message);
                    hunterEnabled = false;
                }).then(jsonResponse => {
                    
                    // Store e-mail addresses
                    for (var i = 0; i < jsonResponse.data.emails.length; i++) {
                        establishment.email.push(jsonResponse.data.emails[i].value);
                    }

                    // Store social media links
                    establishment.facebook = jsonResponse.data.facebook;
                    establishment.linkedin = jsonResponse.data.linkedin;
                    establishment.twitter = jsonResponse.data.twitter;
                    establishment.instagram = jsonResponse.data.instagram;

                    console.log(establishment);

                });

            }

            // Create marker
            var marker = createMarker(establishment);

            // Update progress bar
            var progress = (i / searchResults.length) * 100;
            document.getElementById('overlay-loading-fill').style.width = progress + '%';

        });

        // Sleep for 2 seconds before getting the next page
        await sleep(2000);

        // Last result
        if (i === searchResults.length - 1) {
                
            // Hide loading overlay
            document.getElementById('overlay').classList.remove('active');

            // Show results header and footer
            document.getElementById('results-header').classList.add('active');
            document.getElementById('results-footer').classList.add('active');
            document.getElementById('results-list-container').classList.add('active');

            // Save collections to file
            saveSettings();

            // Display results
            pageIndex = 0;
            pageStart = 0;
            updatePagination();
            displayResults();
            console.log(collections[collectionIndex]);

        }

    }

}

/**
 * Displays the search results.
 */
function displayResults() {

    // Abort if no results
    if (collections[collectionIndex].results.length === 0) return false;

    // Clear markers
    resetMarkers();

    // Create bounds
    var bounds = new google.maps.LatLngBounds();

    // Create results list
    var resultsList = document.getElementById('results-list-page-0');
    resultsList.innerHTML = '';

    // Loop through results
    pageStart = pageIndex * pageSize;
    pageEnd = Math.min(pageStart + pageSize, collections[collectionIndex].results.length);
    for (var i = pageStart; i < pageEnd; i++) {

        // Check if the result exists
        if (collections[collectionIndex].results[i] === undefined) continue;

        // Get establishment
        var establishment = collections[collectionIndex].results[i];

        // Location set?
        if (establishment.location === undefined) {

            // Create Google Maps location from coordinates
            var location = new google.maps.LatLng(establishment.latidude, establishment.longitude);

            // Update establishment
            establishment.location = location;

            // Create marker
            var marker = createMarker(establishment);

        }

        // Show marker
        markers[collectionIndex][i].setMap(map);

        // Update bounds
        bounds.extend(establishment.location);

        // Add to results list table
        var child = document.getElementById('results-list-item-' + establishment.id);
        child = document.createElement('div');
        child.id = 'results-list-item' + establishment.id;
        child.classList.add('results-list-row');
        child.innerHTML = `
        <h2 class="list-name">${ establishment.name }</h2>
        <div class="list-columns">
            <div class="list-fields">
                ${ resultTableProperty('Address', establishment.address) }
                ${ resultTableProperty('Phone', establishment.phone, 2) }
                ${ resultTableProperty('Website', establishment.website, 1) }
            </div>

            <div class="list-fields">
                ${ resultTableProperty('E-Mail', establishment.email, 3) }
                ${ resultTableProperty('Twitter', establishment.twitter, 4) }
            </div>
        </div>
        `;

        // Add child to results list
        document.getElementById('results-list-page-0').appendChild(child);

    }


    // Show or hide header and footer
    if (collections[collectionIndex].results.length > 0) {

        document.getElementById('results-header').classList.add('active');
        document.getElementById('results-footer').classList.add('active');
        document.getElementById('results-list-container').classList.add('active');

    } else {

        document.getElementById('results-header').classList.remove('active');
        document.getElementById('results-footer').classList.remove('active');
        document.getElementById('results-list-container').classList.remove('active');

    }

    // Fit map to bounds
    map.fitBounds(bounds);

}

/**
 * Updates the pagination numbers and buttons.
 */
function updatePagination() {

    // Page numbers
    pageTotal = Math.ceil(collections[collectionIndex].results.length / pageSize);

    // Update totals
    document.getElementById('results-count-number').innerHTML = collections[collectionIndex].results.length;
    document.getElementById('page-current').innerHTML = pageIndex + 1;
    document.getElementById('page-total').innerHTML = pageTotal;

    var paginationNumbers = document.getElementById("page-buttons");
    var nextButton = document.getElementById("page-next");
    var prevButton = document.getElementById("page-prev");

    // Clear pagination
    paginationNumbers.innerHTML = "";

    for (let i = 1; i <= pageTotal; i++) {
    
        // Create button
        var button = document.createElement("button");
        button.innerHTML = i;
        button.classList.add("app-page-button");
        button.classList.add("pill");
        button.onclick = function () {

            // Remove active class from all buttons
            var buttons = document.getElementsByClassName("app-page-button");
            for (var j = 0; j < buttons.length; j++) {
                buttons[j].classList.remove("active");
            }

            // Set active class
            this.classList.add("active");

            // Update page index
            document.getElementById('page-current').innerHTML = i;

            pageIndex = i - 1;

            displayResults();

        };

        if (i === pageIndex + 1) {
            button.classList.add("active");
        }
        
        paginationNumbers.appendChild(button);

    }

}

/**
 * ----------------------------------------------------------
 * View Functions
 * 
 * The application uses a list view to display the search
 * results.
 * ----------------------------------------------------------
 */

/**
 * Displays the list view.
 */
function viewList() {

    viewIndex = 1;

    // Reset page index
    pageIndex = 0;

    // Update views
    document.getElementById('results-map').classList.remove('active');
    document.getElementById('results-list').classList.add('active');

    // Update pill buttons
    document.getElementById('pill-map').classList.remove('active');
    document.getElementById('pill-list').classList.add('active');

    // Update results
    displayResults();

}

/**
 * Displays the map view.
 */
function viewMap() {

    viewIndex = 0;

    // Reset page index
    pageIndex = 0;

    // Update views
    document.getElementById('results-map').classList.add('active');
    document.getElementById('results-list').classList.remove('active');

    // Update pill buttons
    document.getElementById('pill-map').classList.add('active');
    document.getElementById('pill-list').classList.remove('active');

    // Update results
    displayResults();

}

/**
 * ----------------------------------------------------------
 * Export Functions
 * 
 * The application can export the search results to various
 * formats.
 * ----------------------------------------------------------
 */

/**
 * Exports the search results to a CSV file.
 */
function exportCSV() {

    api.saveCSV();

}

/**
 * Exports the search results to a JSON file.
 */
function exportJSON() {

    api.saveJSON();

}

/**
 * ----------------------------------------------------------
 * Helper Functions
 * 
 * The application uses helper functions to perform various
 * tasks.
 * ----------------------------------------------------------
 */

/**
 * Helper function for sleep.
 * 
 * @param {number} ms   The milliseconds. 
 * @returns {Promise}
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper function for showing an alert.
 * 
 * @param {string} message  The message. 
 */
function showAlert(message) {
    window.api.messageMain("send-alert", message)
}

/**
 * Helper function for toggling dropdowns.
 * 
 * @param {HTMLElement} buttonElement   The button element.
 * @param {string} dropdownElement      The dropdown element.
 */
function toggleDropdown(buttonElement, dropdownElement) {

    buttonElement.classList.toggle('active');
    document.getElementById(dropdownElement).classList.toggle('active');

}

/**
 * Helper function for getting the Twitter handle.
 * 
 * @param {string}  url     The URL.
 * @returns {string}
 */
function extractTwitterHandle(url) {
    if (!url) return null;
    const match = url.match(/^https?:\/\/(www\.)?twitter.com\/@?(?<handle>\w+)/);
    return match?.groups?.handle ? `@${match.groups.handle}` : null;
}

/**
 * Helper function for info window.
 * 
 * @param {string} label    The label. 
 * @param {string} value    The value. 
 * @returns {string}
 */
function infoWindowProperty(label, value, type = 0) {
    if (value === "" || value === null || value === undefined) return "";
    switch (type) {

        case 0: // Default
            return `<div class="info-property">
                        <div class="info-label">${label}</div>
                        <div class="info-value">${value}</div>
                    </div>`;
        
        case 1: // Link
            return `<div class="info-property">
                        <div class="info-label">${label}</div>
                        <a target="_blank" href="${value}" class="info-value">${value}</a>
                    </div>`;
        
        case 2: // Telephone
        return `<div class="info-property">
                    <div class="info-label">${label}</div>
                    <a target="_blank" href="tel:${value}" class="info-value">${value}</a>
                </div>`;

        case 3: // E-Mails
            
            if (value.length === 0) return "";
            var html = `<div class="info-property">
                            <div class="info-label">${label}</div>`;

            for (var i = 0; i < value.length; i++) {
                html += `<a target="_blank" href="mailto:${value[i]}" class="info-value">${value[i]}</a><br>`;
            }

            html += `</div>`;

            return html;
        
        case 4: // Image
            return `<div class="info-thumbnail-container">
                        <img src="${value}" class="info-thumbnail" />
                    </div>`;

    }

    
}

/**
 * Helper function for results table.
 * 
 * @param {string} label    The label. 
 * @param {string} value    The value. 
 * @returns {string}
 */
function resultTableProperty(label, value, type = 0) {
    if (value === "" || value === null || value === undefined) return "";
    switch (type) {

        case 0: // Default
            return `<div class="list-field">
                        <div class="list-label">${label}</div>
                        <div class="list-value">${value}</div>
                    </div>`;
        
        case 1: // Link
            return `<div class="list-field">
                        <div class="list-label">${label}</div>
                        <a target="_blank" href="${value}" class="list-value">${value}</a>
                    </div>`;
        
        case 2: // Telephone
        return `<div class="list-field">
                    <div class="list-label">${label}</div>
                    <a target="_blank" href="tel:${value}" class="list-value">${value}</a>
                </div>`;

        case 3: // E-Mails
            
            if (value.length === 0) return "";
            var html = `<div class="list-field">
                            <div class="list-label">${label}</div>`;

            for (var i = 0; i < value.length; i++) {
                html += `<a target="_blank" href="mailto:${value[i]}" class="list-value">${value[i]}</a>`;
            }

            html += `</div>`;

            return html;
        
        case 4: // Twitter
            
            return `<div class="list-field">
                <div class="list-label">${label}</div>
                <a target="_blank" href="${value}" class="list-value">${extractTwitterHandle(value)}</a>
            </div>`;

    }

    
}