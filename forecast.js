//"True / 1" will disable calling of the Forecast API
var debug = 0;

var numDaysToShow = 7;
var dayNamesArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var monthNamesArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var ipJSON;
var weatherJSON;
var ipAPI = "http://ip-api.com/json/?callback=?";

var weatherAPI = "https://api.forecast.io/forecast/";
var APIKey = "393bc8a959669aaeb679cfbf7285637f";
var exclusions = "?exclude=[minutely,hourly,alerts,flags]"; //Option passed into the forecast.io API

var degF = $("#f");
var degC = $("#c");

degF.click(function(){
	if(degC.hasClass("selected")){
		degC.removeClass("selected");
		degF.addClass("selected");
		
		for(var i = 0;i<numDaysToShow;i++){
			displayWeatherData(forecastArr[forecastIndex], i, false);
		}
	}
});

degC.click(function(){
	if(degF.hasClass("selected")){
		degF.removeClass("selected");
		degC.addClass("selected");
		
		for(var i = 0;i<numDaysToShow;i++){
			displayWeatherData(forecastArr[forecastIndex], i, true);
		}
	}
});

/*Stores data as; 
forecastArr [
	{  //Forecast-Object 
		coordinatesArr: [lat, lon],
		location: "Bellevue, WA, US",
		dayArr: [
			{	//Day-Object
				date: "", //Example: Mon, Sep 12
				weatherIcon: "", //URL to appropriate icon
				summary: "",
				tempArr: [], //Low, High, Cur(optional)
				sunTimesArr: [], //Times at sunrise, sunset
				precipChance: 0
			}
		]
	}
]
*/
var forecastArr = [];
var forecastIndex = 0;

function Day(date, icon, summary, tempArr, sunTimesArr, precipChance){
	this.date = date; //Mon, Tue, etc...
	this.weatherIcon = icon; //Used to link to appropriate icon
	this.summary = summary;
	this.tempArr = tempArr //Low, High, ("Cur" optional)
	this.sunTimesArr = sunTimesArr; //Times at sunrise, sunset
	
	//Reformat precipChance
	this.precipChance = precipChance + "%";; //chance of rain(0-100%)
}

function Forecast(lat, lon, city, region, country){
	this.coordinatesArr = [lat, lon];
	this.location = city + ", " + region + ", " + country; //City, Region, Country
	this.dayArr = [];
}

getUserLocation();

function getUserLocation(){
	if(arguments.length === 0){
		$.getJSON(ipAPI, function(json) {
			ipJSON = json;

			if(!debug){
				getForecast();
			}
		});
	} else {
		//TODO take a "city,region" argument, parse it to lat/lon array,
		//and query the api on the given location
	}
	
}

//Calculate the weather for a particular location, given a "city/state" input
function getForecast(){
	
	//Used instead of ".getJSON" due to the inability to do cross-domain AJAX queries
	$.ajax({
		url: buildWeatherRequest(),
		dataType: "jsonp",
		success: function(json) {
		weatherJSON = json;		
		parseWeatherData();
		}
	});
}

function buildWeatherRequest(){
	return (weatherAPI + APIKey + "/" + ipJSON.lat + "," + ipJSON.lon + exclusions);
}

//Augment forecast.io JSON into human readable form
function parseWeatherData(){
	
	forecastArr.push(new Forecast(ipJSON.lat, ipJSON.lon, ipJSON.city, ipJSON.region, ipJSON.countryCode));
	forecastIndex = forecastArr.length - 1;
	
	for(var i = 0;i<numDaysToShow;i++){
		
		
		//Convert time to formatted date (day, month date)
		var dayDate = new Date(weatherJSON.daily.data[i].time * 1000); //Convert time to milliseconds
		var sunriseDate = new Date(weatherJSON.daily.data[i].sunriseTime * 1000);
		var sunsetDate = new Date(weatherJSON.daily.data[i].sunsetTime * 1000);
		
		var sunriseTime = formatTime(sunriseDate);
		var sunsetTime = formatTime(sunsetDate);
		
		forecastArr[forecastIndex].dayArr.push(new Day(
			dayNamesArr[dayDate.getDay()] + ", " + monthNamesArr[dayDate.getMonth()] + " " + dayDate.getDate(),
			weatherJSON.daily.data[i].icon,
			weatherJSON.daily.data[i].summary,
			[weatherJSON.daily.data[i].temperatureMin, weatherJSON.daily.data[i].temperatureMax],
			[sunriseTime, sunsetTime],
			Math.round(weatherJSON.daily.data[i].precipProbability * 100)
		));
	
		//Add the current weather weather information to the first Day (today)
		if(i === 0){
			forecastArr[forecastIndex].dayArr[i].curIcon = weatherJSON.currently.icon;
			forecastArr[forecastIndex].dayArr[i].curWeather = weatherJSON.currently.summary + ", ";
			forecastArr[forecastIndex].dayArr[i].curTemp = weatherJSON.currently.temperature;
		}
		
		displayWeatherData(forecastArr[forecastIndex], i, false);
	}
}

//Display all relevant weather data
function displayWeatherData(forecast, dayIndex, convert){
	
	var selector = $("#dayDataGroup-" + dayIndex);
	var day = forecast.dayArr[dayIndex];
	
	if(dayIndex === 0){
		var curInfo = $("#city-region-country");
		curInfo.find("h2.curCondition").html(day.curWeather + roundTemp(day.curTemp, convert) + "&deg");
		curInfo.find("h2.location").html(forecast.location);
		selector.find("p.sunTimes").html("Sunrise: " + day.sunTimesArr[0]
										+ "<br>Sunset: " + day.sunTimesArr[1]);
		
		var skycon = new Skycons({"color": "#fff"});
	} else {
		var skycon = new Skycons({"color": "#0892D0"});
	}

	skycon.add("icon" + dayIndex, day.weatherIcon);
	skycon.play();

	selector.find("h4.date").html(day.date);
	selector.find("p.summary").html(day.summary);
	selector.find("h4.tempLow").html(roundTemp(day.tempArr[0], convert) + "&deg");
	selector.find("h4.tempHigh").html(roundTemp(day.tempArr[1], convert) + "&deg");
	selector.find("h4.precipChance").html(day.precipChance);
}

function roundTemp(num, shouldConvert){
	if(shouldConvert){
		return Math.round((num - 32) / 1.8);
	}
	return Math.round(num);
}

//Formats a Date object to 12-hour time format and returns the result
function formatTime(date){
	
	var time = "";
	
	if(date.getHours() >= 13){
		time += date.getHours() - 12;
	} else if(date.getHours() === 0){
		time += 12;
	} else {
		time += date.getHours();
	}

	if(date.getMinutes() <= 9){
		time += ":0" + date.getMinutes();
	} else {
		time += ":" + date.getMinutes();
	}

	if(date.getHours() >= 12){
		time += " PM";
	} else {
		time += " AM";
	}
	
	return time;
}