# Places Scraper

This serves as an example template for using the [Google Places API](https://developers.google.com/places/) and [Hunter.io](http://hunter.io) for collating business information quickly. To use this you will need to obtain private API keys for these services.

## Google Places API Key

To obtain an API key for the Google Places service, you will first need to log in to the [Google Developer Console](https://console.developers.google.com/). Next, you will need to create a project for the scraper. Once you've done that, select the **Library** tab and look for **Google Maps Javascript API**. Select that and then click **Enable**. You will then be prompted to set up the authentication process. Select API key and follow the instructions. Make a note of the generated API key.

## Hunter.io API Key

Once you have created an account with [hunter.io](https://hunter.io/), go to your dashboard and select **API**. Make a note of the API key (you might have to click the **Generate a new key** button).

## Adding Keys to the Scraper

You will need to make 2 changes to the **index.html** file. On **line 30** is where you enter your hunter.io API key, inside the quotes:

    var hunter_key = "YOUR_KEY_HERE";

On **line 40** is where you add your Google API key. Replace 'YOUR_API_KEY' with the key you generated on the Google Developer Console.

## Using the Scraper

To use the scraper, type business/service queries and the location, like this:

    restaurants in London
    supermarkets in Manchester
    spas in york

You can click a marker on the map to view information on that location. If e-mail addresses exist in the hunter.io database for that location, they will come up. You can see the markers in text form by selecting **Text View**. You can download the places in CSV (Comma Seperated Values) format, making it easy to import into tables and databases.