import OrderedMap "mo:base/OrderedMap";
import BlobStorage "blob-storage/Mixin";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Registry "blob-storage/registry";
import List "mo:base/List";
import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Int "mo:base/Int";

actor {
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  var countryCoordinates = textMap.empty<(Float, Float)>();
  var locationInfo = textMap.empty<LocationInfo>();
  var journeys = textMap.empty<Journey>();
  var userProfiles = principalMap.empty<UserProfile>();
  var cityRatings = textMap.empty<CityRating>();
  var cityAlbums = textMap.empty<CityAlbum>();
  var travelSpots = textMap.empty<[TravelSpot]>();
  var musicAlbums = textMap.empty<MusicAlbum>();
  var websiteLayoutSettings = textMap.empty<WebsiteLayoutSettings>();
  var journeySchedules = textMap.empty<[ScheduleItem]>();
  var mapBookmarks = textMap.empty<MapBookmark>();
  var geonameCities = textMap.empty<GeonameCity>();
  var timezoneGeoJson : Text = "";

  let registry = Registry.new();
  let accessControlState = AccessControl.initState();

  // Journey
  type Journey = {
    city : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Location Info
  type LocationInfo = {
    coordinates : (Float, Float);
    name : Text;
    photoPath : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // User Profile
  type UserProfile = {
    name : Text;
  };

  // City Rating
  type CityRating = {
    city : Text;
    rating : Float;
    comment : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Media Types
  type MediaType = {
    #image;
    #video;
    #audio;
  };

  type MediaFile = {
    path : Text;
    mediaType : MediaType;
    format : Text;
    uploadedAt : Time.Time;
  };

  type SocialMediaLink = {
    url : Text;
    platform : Text;
    addedAt : Time.Time;
  };

  // City Album
  type CityAlbum = {
    city : Text;
    mediaFiles : [MediaFile];
    socialMediaLinks : [SocialMediaLink];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Travel Spot
  type TravelSpot = {
    city : Text;
    name : Text;
    description : ?Text;
    coordinates : (Float, Float);
    spotType : Text;
    rating : Float;
    mediaFiles : [MediaFile];
    socialMediaLinks : [SocialMediaLink];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Music Album
  type MusicAlbum = {
    title : Text;
    description : Text;
    songs : [Song];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Song = {
    title : ?Text;
    artist : ?Text;
    album : Text;
    filePath : Text;
    uploadedAt : Time.Time;
  };

  // Website Layout
  type WebsiteLayoutSettings = {
    showMusicPlayerBar : Bool;
    defaultSearchPlace : Text;
    showAllTravelSpots : Bool;
    mapZoomLevel : Nat;
    rippleSize : Float;
    cityFontSize : Float;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Schedule Item
  type ScheduleItem = {
    date : Time.Time;
    time : Text;
    location : Text;
    activity : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Map Bookmark
  type MapBookmark = {
    coordinates : (Float, Float);
    name : Text;
    description : Text;
    city : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Vibe Item
  type VibeItem = {
    city : Text;
    name : Text;
    description : Text;
    itemType : Text;
    coordinates : (Float, Float);
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Geoname City
  type GeonameCity = {
    name : Text;
    country : Text;
    region : Text;
    latitude : Float;
    longitude : Float;
    population : Int;
    featureCode : Text;
    classification : Text;
  };

  // Access Control Functions
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Secure Admin Query Function - ADMIN ACCESS ONLY
  public query ({ caller }) func getAdmins() : async [Principal] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view the admin list");
    };
    [];
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Country Coordinates (Admin only for initialization, public for reading)
  public shared ({ caller }) func initializeCoordinates() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can initialize coordinates");
    };
    countryCoordinates := textMap.fromIter<(Float, Float)>(
      Iter.fromArray([
        ("United States", (37.0902, -95.7129)),
        ("Canada", (56.1304, -106.3468)),
        ("Brazil", (-14.235, -51.9253)),
        ("United Kingdom", (55.3781, -3.436)),
        ("France", (46.6034, 1.8883)),
        ("Germany", (51.1657, 10.4517)),
        ("India", (20.5937, 78.9629)),
        ("China", (35.8617, 104.1957)),
        ("Australia", (-25.2744, 133.7751)),
        ("Japan", (36.2048, 138.2529)),
      ])
    );
  };

  public query func getCountryCoordinates(countryName : Text) : async ?(Float, Float) {
    textMap.get(countryCoordinates, countryName);
  };

  // Location Info Management (Users only for modifications, public for reading)
  public shared ({ caller }) func addLocationInfo(name : Text, coordinates : (Float, Float), photoPath : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add location info");
    };
    let currentTime = Time.now();
    let info : LocationInfo = {
      coordinates;
      name;
      photoPath;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    locationInfo := textMap.put(locationInfo, name, info);
  };

  public shared ({ caller }) func updateLocationInfo(name : Text, photoPath : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update location info");
    };
    switch (textMap.get(locationInfo, name)) {
      case (null) { false };
      case (?existingInfo) {
        let updatedInfo : LocationInfo = {
          existingInfo with
          photoPath;
          updatedAt = Time.now();
        };
        locationInfo := textMap.put(locationInfo, name, updatedInfo);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteLocationInfo(name : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete location info");
    };
    let (newMap, removedValue) = textMap.remove(locationInfo, name);
    locationInfo := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query func getLocationInfo(name : Text) : async ?LocationInfo {
    textMap.get(locationInfo, name);
  };

  public query func getAllLocationInfo() : async [LocationInfo] {
    Iter.toArray(textMap.vals(locationInfo));
  };

  // File Reference Management (Users only)
  public shared ({ caller }) func registerFileReference(path : Text, hash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can register file references");
    };
    Registry.add(registry, path, hash);
  };

  public query ({ caller }) func getFileReference(path : Text) : async Registry.FileReference {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can get file references");
    };
    Registry.get(registry, path);
  };

  public query ({ caller }) func listFileReferences() : async [Registry.FileReference] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can list file references");
    };
    Registry.list(registry);
  };

  public shared ({ caller }) func dropFileReference(path : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can drop file references");
    };
    Registry.remove(registry, path);
  };

  // Timezone Data (Admin only for setting, public for reading)
  public shared ({ caller }) func setTimezoneGeoJson(json : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set timezone data");
    };
    timezoneGeoJson := json;
  };

  public query func getTimezoneGeoJson() : async Text {
    timezoneGeoJson;
  };

  // Journey Management (Users only)
  public shared ({ caller }) func addJourney(city : Text, startDate : Time.Time, endDate : Time.Time) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add journeys");
    };
    let currentTime = Time.now();
    let journey : Journey = {
      city;
      startDate;
      endDate;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    journeys := textMap.put(journeys, city, journey);
  };

  public shared ({ caller }) func updateJourney(city : Text, startDate : Time.Time, endDate : Time.Time) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update journeys");
    };
    switch (textMap.get(journeys, city)) {
      case (null) { false };
      case (?existingJourney) {
        let updatedJourney : Journey = {
          existingJourney with
          startDate;
          endDate;
          updatedAt = Time.now();
        };
        journeys := textMap.put(journeys, city, updatedJourney);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteJourney(city : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete journeys");
    };
    let (newMap, removedValue) = textMap.remove(journeys, city);
    journeys := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query func getJourney(city : Text) : async ?Journey {
    textMap.get(journeys, city);
  };

  public query func getAllJourneys() : async [Journey] {
    Iter.toArray(textMap.vals(journeys));
  };

  public query func getLiveJourneys() : async [Journey] {
    let currentTime = Time.now();
    var liveList = List.nil<Journey>();

    for (journey in textMap.vals(journeys)) {
      if (journey.startDate <= currentTime and currentTime <= journey.endDate) {
        liveList := List.push(journey, liveList);
      };
    };

    List.toArray(liveList);
  };

  public query func getUpcomingJourneys() : async [Journey] {
    let currentTime = Time.now();
    var upcomingList = List.nil<Journey>();

    for (journey in textMap.vals(journeys)) {
      if (journey.startDate > currentTime) {
        upcomingList := List.push(journey, upcomingList);
      };
    };

    List.toArray(upcomingList);
  };

  public query func getPreviousJourneys() : async [Journey] {
    let currentTime = Time.now();
    var previousList = List.nil<Journey>();

    for (journey in textMap.vals(journeys)) {
      if (journey.endDate < currentTime) {
        previousList := List.push(journey, previousList);
      };
    };

    List.toArray(previousList);
  };

  // City Rating System (Users only for modifications, public for reading)
  public shared ({ caller }) func addCityRating(city : Text, rating : Float, comment : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add city ratings");
    };
    let currentTime = Time.now();
    let roundedRating = Float.fromInt(Float.toInt(rating * 10.0)) / 10.0;
    let cityRating : CityRating = {
      city;
      rating = roundedRating;
      comment;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    cityRatings := textMap.put(cityRatings, city, cityRating);
  };

  public shared ({ caller }) func updateCityRating(city : Text, rating : Float, comment : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update city ratings");
    };
    switch (textMap.get(cityRatings, city)) {
      case (null) { false };
      case (?existingRating) {
        let roundedRating = Float.fromInt(Float.toInt(rating * 10.0)) / 10.0;
        let updatedRating : CityRating = {
          existingRating with
          rating = roundedRating;
          comment;
          updatedAt = Time.now();
        };
        cityRatings := textMap.put(cityRatings, city, updatedRating);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteCityRating(city : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete city ratings");
    };
    let (newMap, removedValue) = textMap.remove(cityRatings, city);
    cityRatings := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query func getCityRating(city : Text) : async ?CityRating {
    textMap.get(cityRatings, city);
  };

  public query func getAllCityRatings() : async [CityRating] {
    Iter.toArray(textMap.vals(cityRatings));
  };

  public query func getAverageCityRating(city : Text) : async Float {
    var totalRating : Float = 0.0;
    var count : Float = 0.0;

    for (rating in textMap.vals(cityRatings)) {
      if (rating.city == city) {
        totalRating += rating.rating;
        count += 1.0;
      };
    };

    if (count == 0.0) {
      return 0.0;
    };

    let average = totalRating / count;
    Float.fromInt(Float.toInt(average * 10.0)) / 10.0;
  };

  public query func getCityComments(city : Text) : async [Text] {
    var commentsList = List.nil<Text>();

    for (rating in textMap.vals(cityRatings)) {
      if (rating.city == city) {
        commentsList := List.push(rating.comment, commentsList);
      };
    };

    List.toArray(commentsList);
  };

  public query func getCityRatingForPopup(city : Text) : async ?Float {
    switch (textMap.get(cityRatings, city)) {
      case (null) { null };
      case (?rating) { ?rating.rating };
    };
  };

  // City Album Management (Users only for modifications, public for reading)
  public shared ({ caller }) func addCityAlbum(city : Text, mediaFiles : [MediaFile], socialMediaLinks : [SocialMediaLink]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add city albums");
    };
    let currentTime = Time.now();
    let album : CityAlbum = {
      city;
      mediaFiles;
      socialMediaLinks;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    cityAlbums := textMap.put(cityAlbums, city, album);
  };

  public shared ({ caller }) func updateCityAlbum(city : Text, mediaFiles : [MediaFile], socialMediaLinks : [SocialMediaLink]) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update city albums");
    };
    switch (textMap.get(cityAlbums, city)) {
      case (null) { false };
      case (?existingAlbum) {
        let updatedAlbum : CityAlbum = {
          existingAlbum with
          mediaFiles;
          socialMediaLinks;
          updatedAt = Time.now();
        };
        cityAlbums := textMap.put(cityAlbums, city, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteCityAlbum(city : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete city albums");
    };
    let (newMap, removedValue) = textMap.remove(cityAlbums, city);
    cityAlbums := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query func getCityAlbum(city : Text) : async ?CityAlbum {
    textMap.get(cityAlbums, city);
  };

  public query func getAllCityAlbums() : async [CityAlbum] {
    Iter.toArray(textMap.vals(cityAlbums));
  };

  public shared ({ caller }) func addMediaToCityAlbum(city : Text, mediaFile : MediaFile) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add media to city albums");
    };
    switch (textMap.get(cityAlbums, city)) {
      case (null) {
        let currentTime = Time.now();
        let album : CityAlbum = {
          city;
          mediaFiles = [mediaFile];
          socialMediaLinks = [];
          createdAt = currentTime;
          updatedAt = currentTime;
        };
        cityAlbums := textMap.put(cityAlbums, city, album);
        true;
      };
      case (?existingAlbum) {
        let updatedMediaFiles = Array.append(existingAlbum.mediaFiles, [mediaFile]);
        let updatedAlbum : CityAlbum = {
          existingAlbum with
          mediaFiles = updatedMediaFiles;
          updatedAt = Time.now();
        };
        cityAlbums := textMap.put(cityAlbums, city, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func removeMediaFromCityAlbum(city : Text, mediaPath : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove media from city albums");
    };
    switch (textMap.get(cityAlbums, city)) {
      case (null) { false };
      case (?existingAlbum) {
        let filteredMediaFiles = Array.filter<MediaFile>(
          existingAlbum.mediaFiles,
          func(file) { file.path != mediaPath },
        );
        let updatedAlbum : CityAlbum = {
          existingAlbum with
          mediaFiles = filteredMediaFiles;
          updatedAt = Time.now();
        };
        cityAlbums := textMap.put(cityAlbums, city, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func addSocialMediaLinkToCityAlbum(city : Text, socialMediaLink : SocialMediaLink) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add social media links to city albums");
    };
    switch (textMap.get(cityAlbums, city)) {
      case (null) {
        let currentTime = Time.now();
        let album : CityAlbum = {
          city;
          mediaFiles = [];
          socialMediaLinks = [socialMediaLink];
          createdAt = currentTime;
          updatedAt = currentTime;
        };
        cityAlbums := textMap.put(cityAlbums, city, album);
        true;
      };
      case (?existingAlbum) {
        let updatedSocialMediaLinks = Array.append(existingAlbum.socialMediaLinks, [socialMediaLink]);
        let updatedAlbum : CityAlbum = {
          existingAlbum with
          socialMediaLinks = updatedSocialMediaLinks;
          updatedAt = Time.now();
        };
        cityAlbums := textMap.put(cityAlbums, city, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func removeSocialMediaLinkFromCityAlbum(city : Text, url : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove social media links from city albums");
    };
    switch (textMap.get(cityAlbums, city)) {
      case (null) { false };
      case (?existingAlbum) {
        let filteredSocialMediaLinks = Array.filter<SocialMediaLink>(
          existingAlbum.socialMediaLinks,
          func(link) { link.url != url },
        );
        let updatedAlbum : CityAlbum = {
          existingAlbum with
          socialMediaLinks = filteredSocialMediaLinks;
          updatedAt = Time.now();
        };
        cityAlbums := textMap.put(cityAlbums, city, updatedAlbum);
        true;
      };
    };
  };

  public query func getCityAlbumForPopup(city : Text) : async ?CityAlbum {
    textMap.get(cityAlbums, city);
  };

  public query func getCityMediaFiles(city : Text) : async [MediaFile] {
    switch (textMap.get(cityAlbums, city)) {
      case (null) { [] };
      case (?album) { album.mediaFiles };
    };
  };

  public query func getCitySocialMediaLinks(city : Text) : async [SocialMediaLink] {
    switch (textMap.get(cityAlbums, city)) {
      case (null) { [] };
      case (?album) { album.socialMediaLinks };
    };
  };

  // Travel Spot Management (Users only for modifications, public for reading)
  public shared ({ caller }) func addTravelSpot(city : Text, name : Text, description : ?Text, coordinates : (Float, Float), spotType : Text, rating : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add travel spots");
    };
    let currentTime = Time.now();
    let travelSpot : TravelSpot = {
      city;
      name;
      description;
      coordinates;
      spotType;
      rating;
      mediaFiles = [];
      socialMediaLinks = [];
      createdAt = currentTime;
      updatedAt = currentTime;
    };

    let existingSpots = switch (textMap.get(travelSpots, city)) {
      case (null) { [] };
      case (?spots) { spots };
    };

    let updatedSpots = Array.append(existingSpots, [travelSpot]);
    travelSpots := textMap.put(travelSpots, city, updatedSpots);
  };

  public shared ({ caller }) func updateTravelSpot(city : Text, name : Text, description : ?Text, coordinates : (Float, Float), spotType : Text, rating : Float) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let updatedSpots = Array.map<TravelSpot, TravelSpot>(
          spots,
          func(spot) {
            if (spot.name == name) {
              {
                spot with
                description;
                coordinates;
                spotType;
                rating;
                updatedAt = Time.now();
              };
            } else {
              spot;
            };
          },
        );
        travelSpots := textMap.put(travelSpots, city, updatedSpots);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteTravelSpot(city : Text, name : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let filteredSpots = Array.filter<TravelSpot>(
          spots,
          func(spot) { spot.name != name },
        );
        travelSpots := textMap.put(travelSpots, city, filteredSpots);
        true;
      };
    };
  };

  public query func getTravelSpots(city : Text) : async [TravelSpot] {
    switch (textMap.get(travelSpots, city)) {
      case (null) { [] };
      case (?spots) { spots };
    };
  };

  public query func getAllTravelSpots() : async [TravelSpot] {
    var allSpots = List.nil<TravelSpot>();

    for (spots in textMap.vals(travelSpots)) {
      for (spot in Iter.fromArray(spots)) {
        allSpots := List.push(spot, allSpots);
      };
    };

    List.toArray(allSpots);
  };

  public query func getTravelSpotTypes() : async [Text] {
    ["City", "Hotel", "Restaurant", "Shopping", "Heritage", "Relax", "Beach", "Transport", "Airport", "Others"];
  };

  public shared ({ caller }) func addMediaToTravelSpot(city : Text, spotName : Text, mediaFile : MediaFile) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add media to travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let updatedSpots = Array.map<TravelSpot, TravelSpot>(
          spots,
          func(spot) {
            if (spot.name == spotName) {
              let updatedMediaFiles = Array.append(spot.mediaFiles, [mediaFile]);
              {
                spot with
                mediaFiles = updatedMediaFiles;
                updatedAt = Time.now();
              };
            } else {
              spot;
            };
          },
        );
        travelSpots := textMap.put(travelSpots, city, updatedSpots);
        true;
      };
    };
  };

  public shared ({ caller }) func removeMediaFromTravelSpot(city : Text, spotName : Text, mediaPath : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove media from travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let updatedSpots = Array.map<TravelSpot, TravelSpot>(
          spots,
          func(spot) {
            if (spot.name == spotName) {
              let filteredMediaFiles = Array.filter<MediaFile>(
                spot.mediaFiles,
                func(file) { file.path != mediaPath },
              );
              {
                spot with
                mediaFiles = filteredMediaFiles;
                updatedAt = Time.now();
              };
            } else {
              spot;
            };
          },
        );
        travelSpots := textMap.put(travelSpots, city, updatedSpots);
        true;
      };
    };
  };

  public query func getTravelSpotMediaFiles(city : Text, spotName : Text) : async [MediaFile] {
    switch (textMap.get(travelSpots, city)) {
      case (null) { [] };
      case (?spots) {
        switch (Array.find<TravelSpot>(spots, func(spot) { spot.name == spotName })) {
          case (null) { [] };
          case (?spot) { spot.mediaFiles };
        };
      };
    };
  };

  public shared ({ caller }) func addSocialMediaLinkToTravelSpot(city : Text, spotName : Text, socialMediaLink : SocialMediaLink) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add social media links to travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let updatedSpots = Array.map<TravelSpot, TravelSpot>(
          spots,
          func(spot) {
            if (spot.name == spotName) {
              let updatedSocialMediaLinks = Array.append(spot.socialMediaLinks, [socialMediaLink]);
              {
                spot with
                socialMediaLinks = updatedSocialMediaLinks;
                updatedAt = Time.now();
              };
            } else {
              spot;
            };
          },
        );
        travelSpots := textMap.put(travelSpots, city, updatedSpots);
        true;
      };
    };
  };

  public shared ({ caller }) func removeSocialMediaLinkFromTravelSpot(city : Text, spotName : Text, url : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove social media links from travel spots");
    };
    switch (textMap.get(travelSpots, city)) {
      case (null) { false };
      case (?spots) {
        let updatedSpots = Array.map<TravelSpot, TravelSpot>(
          spots,
          func(spot) {
            if (spot.name == spotName) {
              let filteredSocialMediaLinks = Array.filter<SocialMediaLink>(
                spot.socialMediaLinks,
                func(link) { link.url != url },
              );
              {
                spot with
                socialMediaLinks = filteredSocialMediaLinks;
                updatedAt = Time.now();
              };
            } else {
              spot;
            };
          },
        );
        travelSpots := textMap.put(travelSpots, city, updatedSpots);
        true;
      };
    };
  };

  public query func getTravelSpotSocialMediaLinks(city : Text, spotName : Text) : async [SocialMediaLink] {
    switch (textMap.get(travelSpots, city)) {
      case (null) { [] };
      case (?spots) {
        switch (Array.find<TravelSpot>(spots, func(spot) { spot.name == spotName })) {
          case (null) { [] };
          case (?spot) { spot.socialMediaLinks };
        };
      };
    };
  };

  // Music Album Management (Users only - authentication required)
  public shared ({ caller }) func addMusicAlbum(title : Text, description : Text, songs : [Song]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add music albums");
    };
    let currentTime = Time.now();
    let album : MusicAlbum = {
      title;
      description;
      songs;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    musicAlbums := textMap.put(musicAlbums, title, album);
  };

  public shared ({ caller }) func updateMusicAlbum(title : Text, description : Text, songs : [Song]) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update music albums");
    };
    switch (textMap.get(musicAlbums, title)) {
      case (null) { false };
      case (?album) {
        let updatedAlbum : MusicAlbum = {
          album with
          description;
          songs;
          updatedAt = Time.now();
        };
        musicAlbums := textMap.put(musicAlbums, title, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteMusicAlbum(title : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete music albums");
    };
    let (newMap, removedValue) = textMap.remove(musicAlbums, title);
    musicAlbums := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getMusicAlbum(title : Text) : async ?MusicAlbum {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view music albums");
    };
    textMap.get(musicAlbums, title);
  };

  public query ({ caller }) func getAllMusicAlbums() : async [MusicAlbum] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view all music albums");
    };
    Iter.toArray(textMap.vals(musicAlbums));
  };

  public shared ({ caller }) func addSongToMusicAlbum(title : Text, song : Song) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add songs to music albums");
    };
    switch (textMap.get(musicAlbums, title)) {
      case (null) { false };
      case (?album) {
        let updatedSongs = Array.append(album.songs, [song]);
        let updatedAlbum : MusicAlbum = {
          album with
          songs = updatedSongs;
          updatedAt = Time.now();
        };
        musicAlbums := textMap.put(musicAlbums, title, updatedAlbum);
        true;
      };
    };
  };

  public shared ({ caller }) func removeSongFromMusicAlbum(title : Text, songTitle : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove songs from music albums");
    };
    switch (textMap.get(musicAlbums, title)) {
      case (null) { false };
      case (?album) {
        let filteredSongs = Array.filter<Song>(
          album.songs,
          func(song) {
            switch (song.title) {
              case (null) { true };
              case (?title) { title != songTitle };
            };
          },
        );
        let updatedAlbum : MusicAlbum = {
          album with
          songs = filteredSongs;
          updatedAt = Time.now();
        };
        musicAlbums := textMap.put(musicAlbums, title, updatedAlbum);
        true;
      };
    };
  };

  public query ({ caller }) func getMusicAlbumSongs(title : Text) : async [Song] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view music album songs");
    };
    switch (textMap.get(musicAlbums, title)) {
      case (null) { [] };
      case (?album) { album.songs };
    };
  };

  // Website Layout Management (Users only)
  public shared ({ caller }) func addWebsiteLayoutSettings(showMusicPlayerBar : Bool, defaultSearchPlace : Text, showAllTravelSpots : Bool, rippleSize : Float, cityFontSize : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add website layout settings");
    };
    let currentTime = Time.now();
    let settings : WebsiteLayoutSettings = {
      showMusicPlayerBar;
      defaultSearchPlace;
      showAllTravelSpots;
      mapZoomLevel = 15;
      rippleSize;
      cityFontSize;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    websiteLayoutSettings := textMap.put(websiteLayoutSettings, "default", settings);
  };

  public shared ({ caller }) func updateWebsiteLayoutSettings(showMusicPlayerBar : Bool, defaultSearchPlace : Text, showAllTravelSpots : Bool, rippleSize : Float, cityFontSize : Float) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update website layout settings");
    };
    switch (textMap.get(websiteLayoutSettings, "default")) {
      case (null) { false };
      case (?existingSettings) {
        let updatedSettings : WebsiteLayoutSettings = {
          existingSettings with
          showMusicPlayerBar;
          defaultSearchPlace;
          showAllTravelSpots;
          mapZoomLevel = 15;
          rippleSize;
          cityFontSize;
          updatedAt = Time.now();
        };
        websiteLayoutSettings := textMap.put(websiteLayoutSettings, "default", updatedSettings);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteWebsiteLayoutSettings() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete website layout settings");
    };
    let (newMap, removedValue) = textMap.remove(websiteLayoutSettings, "default");
    websiteLayoutSettings := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getWebsiteLayoutSettings() : async ?WebsiteLayoutSettings {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view website layout settings");
    };
    textMap.get(websiteLayoutSettings, "default");
  };

  public query ({ caller }) func getAllWebsiteLayoutSettings() : async [WebsiteLayoutSettings] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view all website layout settings");
    };
    Iter.toArray(textMap.vals(websiteLayoutSettings));
  };

  public query func getRippleSize() : async Float {
    switch (textMap.get(websiteLayoutSettings, "default")) {
      case (null) { 0.5 };
      case (?settings) { settings.rippleSize };
    };
  };

  public query func getCityFontSize() : async Float {
    switch (textMap.get(websiteLayoutSettings, "default")) {
      case (null) { 8.0 };
      case (?settings) { settings.cityFontSize };
    };
  };

  // Schedule Management (Users only)
  public shared ({ caller }) func addScheduleItem(journeyCity : Text, date : Time.Time, time : Text, location : Text, activity : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add schedule items");
    };
    let currentTime = Time.now();
    let item : ScheduleItem = {
      date;
      time;
      location;
      activity;
      createdAt = currentTime;
      updatedAt = currentTime;
    };

    let existingItems = switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { [] };
      case (?items) { items };
    };

    let updatedItems = Array.append(existingItems, [item]);
    journeySchedules := textMap.put(journeySchedules, journeyCity, updatedItems);
  };

  public shared ({ caller }) func updateScheduleItem(journeyCity : Text, date : Time.Time, time : Text, location : Text, activity : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update schedule items");
    };
    switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { false };
      case (?items) {
        let updatedItems = Array.map<ScheduleItem, ScheduleItem>(
          items,
          func(item) {
            if (item.date == date and item.time == time) {
              {
                item with
                location;
                activity;
                updatedAt = Time.now();
              };
            } else {
              item;
            };
          },
        );
        journeySchedules := textMap.put(journeySchedules, journeyCity, updatedItems);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteScheduleItem(journeyCity : Text, date : Time.Time, time : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete schedule items");
    };
    switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { false };
      case (?items) {
        let filteredItems = Array.filter<ScheduleItem>(
          items,
          func(item) { item.date != date or item.time != time },
        );
        journeySchedules := textMap.put(journeySchedules, journeyCity, filteredItems);
        true;
      };
    };
  };

  public query ({ caller }) func getScheduleItems(journeyCity : Text) : async [ScheduleItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view schedule items");
    };
    switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { [] };
      case (?items) { items };
    };
  };

  public query ({ caller }) func getAllScheduleItems() : async [ScheduleItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view all schedule items");
    };
    var allItems = List.nil<ScheduleItem>();

    for (items in textMap.vals(journeySchedules)) {
      for (item in Iter.fromArray(items)) {
        allItems := List.push(item, allItems);
      };
    };

    List.toArray(allItems);
  };

  public query ({ caller }) func getJourneyScheduleWithDays(journeyCity : Text) : async [(Text, [ScheduleItem])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view journey schedules");
    };
    switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { [] };
      case (?items) {
        let sortedItems = Array.sort<ScheduleItem>(
          items,
          func(a, b) {
            if (a.date < b.date) { #less } else if (a.date > b.date) { #greater } else {
              #equal;
            };
          },
        );

        var result = List.nil<(Text, [ScheduleItem])>();
        var currentDay : ?Time.Time = null;
        var dayItems = List.nil<ScheduleItem>();
        var dayCounter = 1;

        for (item in Iter.fromArray(sortedItems)) {
          switch (currentDay) {
            case (null) {
              currentDay := ?item.date;
              dayItems := List.push(item, dayItems);
            };
            case (?day) {
              if (item.date == day) {
                dayItems := List.push(item, dayItems);
              } else {
                let dayLabel = "Day " # Int.toText(dayCounter);
                result := List.push((dayLabel, List.toArray(dayItems)), result);
                dayCounter += 1;
                currentDay := ?item.date;
                dayItems := List.nil();
                dayItems := List.push(item, dayItems);
              };
            };
          };
        };

        if (not List.isNil(dayItems)) {
          let dayLabel = "Day " # Int.toText(dayCounter);
          result := List.push((dayLabel, List.toArray(dayItems)), result);
        };

        List.toArray(List.reverse(result));
      };
    };
  };

  public shared ({ caller }) func reorderScheduleItems(journeyCity : Text, newOrder : [ScheduleItem]) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can reorder schedule items");
    };
    switch (textMap.get(journeySchedules, journeyCity)) {
      case (null) { false };
      case (?_) {
        journeySchedules := textMap.put(journeySchedules, journeyCity, newOrder);
        true;
      };
    };
  };

  public query ({ caller }) func getAllScheduleItemsWithCoordinates() : async [(ScheduleItem, (Float, Float))] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view schedule items with coordinates");
    };
    var result = List.nil<(ScheduleItem, (Float, Float))>();

    for (items in textMap.vals(journeySchedules)) {
      for (item in Iter.fromArray(items)) {
        switch (textMap.get(locationInfo, item.location)) {
          case (null) {};
          case (?info) {
            result := List.push((item, info.coordinates), result);
          };
        };
      };
    };

    List.toArray(result);
  };

  // Public query - guests can view cities with ratings and travel spots
  public query func getAllCitiesWithRatingsAndTravelSpots() : async [(Text, ?Float, [TravelSpot])] {
    var result = List.nil<(Text, ?Float, [TravelSpot])>();

    for ((city, _) in textMap.entries(cityRatings)) {
      let rating = switch (textMap.get(cityRatings, city)) {
        case (null) { null };
        case (?cityRating) { ?cityRating.rating };
      };

      let spots = switch (textMap.get(travelSpots, city)) {
        case (null) { [] };
        case (?citySpots) { citySpots };
      };

      result := List.push((city, rating, spots), result);
    };

    List.toArray(result);
  };

  // Public query - guests can view all travel spots for map
  public query func getAllTravelSpotsForMap() : async [TravelSpot] {
    var allSpots = List.nil<TravelSpot>();

    for (spots in textMap.vals(travelSpots)) {
      for (spot in Iter.fromArray(spots)) {
        allSpots := List.push(spot, allSpots);
      };
    };

    List.toArray(allSpots);
  };

  // Public query - guests can view display settings
  public query func getDisplaySettings() : async ?Bool {
    switch (textMap.get(websiteLayoutSettings, "default")) {
      case (null) { null };
      case (?settings) { ?settings.showAllTravelSpots };
    };
  };

  // Public query - guests can view travel spot summary
  public query func getTravelSpotSummaryByCity() : async [(Text, Nat)] {
    var result = List.nil<(Text, Nat)>();

    for ((city, spots) in textMap.entries(travelSpots)) {
      result := List.push((city, spots.size()), result);
    };

    List.toArray(result);
  };

  // Public query - guests can view travel spot type breakdown
  public query func getTravelSpotTypeBreakdown(city : Text) : async [(Text, Nat)] {
    var result = List.nil<(Text, Nat)>();

    switch (textMap.get(travelSpots, city)) {
      case (null) {};
      case (?spots) {
        let typeMap = OrderedMap.Make<Text>(Text.compare);
        var typeCounts = typeMap.empty<Nat>();

        for (spot in Iter.fromArray(spots)) {
          let currentCount = switch (typeMap.get(typeCounts, spot.spotType)) {
            case (null) { 0 };
            case (?count) { count };
          };
          typeCounts := typeMap.put(typeCounts, spot.spotType, currentCount + 1);
        };

        for ((spotType, count) in typeMap.entries(typeCounts)) {
          result := List.push((spotType, count), result);
        };
      };
    };

    List.toArray(result);
  };

  // Public query - guests can view travel spots by city and type
  public query func getTravelSpotsByCityAndType(city : Text, spotType : Text) : async [TravelSpot] {
    switch (textMap.get(travelSpots, city)) {
      case (null) { [] };
      case (?spots) {
        Array.filter<TravelSpot>(
          spots,
          func(spot) { spot.spotType == spotType },
        );
      };
    };
  };

  // Map Bookmark Management (Users only)
  public shared ({ caller }) func addMapBookmark(coordinates : (Float, Float), name : Text, description : Text, city : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add map bookmarks");
    };
    let currentTime = Time.now();
    let bookmark : MapBookmark = {
      coordinates;
      name;
      description;
      city;
      createdAt = currentTime;
      updatedAt = currentTime;
    };
    mapBookmarks := textMap.put(mapBookmarks, name, bookmark);
  };

  public shared ({ caller }) func updateMapBookmark(coordinates : (Float, Float), name : Text, description : Text, city : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update map bookmarks");
    };
    switch (textMap.get(mapBookmarks, name)) {
      case (null) { false };
      case (?bookmark) {
        let updatedBookmark : MapBookmark = {
          bookmark with
          coordinates;
          description;
          city;
          updatedAt = Time.now();
        };
        mapBookmarks := textMap.put(mapBookmarks, name, updatedBookmark);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteMapBookmark(name : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete map bookmarks");
    };
    let (newMap, removedValue) = textMap.remove(mapBookmarks, name);
    mapBookmarks := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getMapBookmarks() : async [MapBookmark] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view map bookmarks");
    };
    Iter.toArray(textMap.vals(mapBookmarks));
  };

  public query func getMapBookmarkByCoordinates(coordinates : (Float, Float)) : async ?MapBookmark {
    Array.find<MapBookmark>(
      Iter.toArray(textMap.vals(mapBookmarks)),
      func(bookmark) { bookmark.coordinates == coordinates },
    );
  };

  public query ({ caller }) func getAllMapBookmarks() : async [MapBookmark] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view all map bookmarks");
    };
    Iter.toArray(textMap.vals(mapBookmarks));
  };

  public query func getMapBookmarksByCity(city : Text) : async [MapBookmark] {
    Array.filter<MapBookmark>(
      Iter.toArray(textMap.vals(mapBookmarks)),
      func(bookmark) { bookmark.city == city },
    );
  };

  public query func getVibesByCity() : async [(Text, [VibeItem])] {
    var result = List.nil<(Text, [VibeItem])>();

    for ((city, spots) in textMap.entries(travelSpots)) {
      let vibeItems = Array.map<TravelSpot, VibeItem>(
        spots,
        func(spot) {
          {
            city = spot.city;
            name = spot.name;
            description = switch (spot.description) {
              case (null) { "" };
              case (?desc) { desc };
            };
            itemType = spot.spotType;
            coordinates = spot.coordinates;
            createdAt = spot.createdAt;
            updatedAt = spot.updatedAt;
          };
        },
      );
      result := List.push((city, vibeItems), result);
    };

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      let cityMap = OrderedMap.Make<Text>(Text.compare);
      var cityVibes = cityMap.empty<[VibeItem]>();

      for (bookmark in Iter.fromArray(bookmarks)) {
        let vibeItem : VibeItem = {
          city = bookmark.city;
          name = bookmark.name;
          description = bookmark.description;
          itemType = "Bookmark";
          coordinates = bookmark.coordinates;
          createdAt = bookmark.createdAt;
          updatedAt = bookmark.updatedAt;
        };

        let existingVibes = switch (cityMap.get(cityVibes, bookmark.city)) {
          case (null) { [] };
          case (?vibes) { vibes };
        };

        let updatedVibes = Array.append(existingVibes, [vibeItem]);
        cityVibes := cityMap.put(cityVibes, bookmark.city, updatedVibes);
      };

      for ((city, vibes) in cityMap.entries(cityVibes)) {
        result := List.push((city, vibes), result);
      };
    };

    List.toArray(result);
  };

  public query func getBookmarkSummaryByCity() : async [(Text, Nat)] {
    let cityMap = OrderedMap.Make<Text>(Text.compare);
    var cityCounts = cityMap.empty<Nat>();

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      for (bookmark in Iter.fromArray(bookmarks)) {
        let currentCount = switch (cityMap.get(cityCounts, bookmark.city)) {
          case (null) { 0 };
          case (?count) { count };
        };
        cityCounts := cityMap.put(cityCounts, bookmark.city, currentCount + 1);
      };
    };

    var result = List.nil<(Text, Nat)>();
    for ((city, count) in cityMap.entries(cityCounts)) {
      result := List.push((city, count), result);
    };

    List.toArray(result);
  };

  public query func getCombinedVibesSummaryByCity() : async [(Text, Nat, Nat)] {
    let cityMap = OrderedMap.Make<Text>(Text.compare);
    var travelSpotCounts = cityMap.empty<Nat>();
    var bookmarkCounts = cityMap.empty<Nat>();

    for ((city, spots) in textMap.entries(travelSpots)) {
      travelSpotCounts := cityMap.put(travelSpotCounts, city, spots.size());
    };

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      for (bookmark in Iter.fromArray(bookmarks)) {
        let currentCount = switch (cityMap.get(bookmarkCounts, bookmark.city)) {
          case (null) { 0 };
          case (?count) { count };
        };
        bookmarkCounts := cityMap.put(bookmarkCounts, bookmark.city, currentCount + 1);
      };
    };

    var result = List.nil<(Text, Nat, Nat)>();
    for ((city, travelSpotCount) in cityMap.entries(travelSpotCounts)) {
      let bookmarkCount = switch (cityMap.get(bookmarkCounts, city)) {
        case (null) { 0 };
        case (?count) { count };
      };
      result := List.push((city, travelSpotCount, bookmarkCount), result);
    };

    List.toArray(result);
  };

  public query ({ caller }) func updateDashboard() : async [(Text, Nat, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update dashboard");
    };
    let cityMap = OrderedMap.Make<Text>(Text.compare);
    var travelSpotCounts = cityMap.empty<Nat>();
    var bookmarkCounts = cityMap.empty<Nat>();

    for ((city, spots) in textMap.entries(travelSpots)) {
      travelSpotCounts := cityMap.put(travelSpotCounts, city, spots.size());
    };

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      for (bookmark in Iter.fromArray(bookmarks)) {
        let currentCount = switch (cityMap.get(bookmarkCounts, bookmark.city)) {
          case (null) { 0 };
          case (?count) { count };
        };
        bookmarkCounts := cityMap.put(bookmarkCounts, bookmark.city, currentCount + 1);
      };
    };

    var result = List.nil<(Text, Nat, Nat)>();
    for ((city, travelSpotCount) in cityMap.entries(travelSpotCounts)) {
      let bookmarkCount = switch (cityMap.get(bookmarkCounts, city)) {
        case (null) { 0 };
        case (?count) { count };
      };
      result := List.push((city, travelSpotCount, bookmarkCount), result);
    };

    List.toArray(result);
  };

  public query func getAllVibes() : async [VibeItem] {
    var allVibes = List.nil<VibeItem>();

    for (spots in textMap.vals(travelSpots)) {
      for (spot in Iter.fromArray(spots)) {
        let vibeItem : VibeItem = {
          city = spot.city;
          name = spot.name;
          description = switch (spot.description) {
            case (null) { "" };
            case (?desc) { desc };
          };
          itemType = spot.spotType;
          coordinates = spot.coordinates;
          createdAt = spot.createdAt;
          updatedAt = spot.updatedAt;
        };
        allVibes := List.push(vibeItem, allVibes);
      };
    };

    for (bookmark in textMap.vals(mapBookmarks)) {
      let vibeItem : VibeItem = {
        city = bookmark.city;
        name = bookmark.name;
        description = bookmark.description;
        itemType = "Bookmark";
        coordinates = bookmark.coordinates;
        createdAt = bookmark.createdAt;
        updatedAt = bookmark.updatedAt;
      };
      allVibes := List.push(vibeItem, allVibes);
    };

    List.toArray(allVibes);
  };

  public query func getAllBookmarksAndTravelSpotsByCity() : async [(Text, [VibeItem])] {
    let cityMap = OrderedMap.Make<Text>(Text.compare);
    var cityVibes = cityMap.empty<[VibeItem]>();

    for ((city, spots) in textMap.entries(travelSpots)) {
      let vibeItems = Array.map<TravelSpot, VibeItem>(
        spots,
        func(spot) {
          {
            city = spot.city;
            name = spot.name;
            description = switch (spot.description) {
              case (null) { "" };
              case (?desc) { desc };
            };
            itemType = spot.spotType;
            coordinates = spot.coordinates;
            createdAt = spot.createdAt;
            updatedAt = spot.updatedAt;
          };
        },
      );

      let existingVibes = switch (cityMap.get(cityVibes, city)) {
        case (null) { [] };
        case (?vibes) { vibes };
      };

      let updatedVibes = Array.append(existingVibes, vibeItems);
      cityVibes := cityMap.put(cityVibes, city, updatedVibes);
    };

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      for (bookmark in Iter.fromArray(bookmarks)) {
        let vibeItem : VibeItem = {
          city = bookmark.city;
          name = bookmark.name;
          description = bookmark.description;
          itemType = "Bookmark";
          coordinates = bookmark.coordinates;
          createdAt = bookmark.createdAt;
          updatedAt = bookmark.updatedAt;
        };

        let existingVibes = switch (cityMap.get(cityVibes, bookmark.city)) {
          case (null) { [] };
          case (?vibes) { vibes };
        };

        let updatedVibes = Array.append(existingVibes, [vibeItem]);
        cityVibes := cityMap.put(cityVibes, bookmark.city, updatedVibes);
      };
    };

    var result = List.nil<(Text, [VibeItem])>();
    for ((city, vibes) in cityMap.entries(cityVibes)) {
      result := List.push((city, vibes), result);
    };

    List.toArray(result);
  };

  public query func getAllBookmarksByCity() : async [(Text, [MapBookmark])] {
    let cityMap = OrderedMap.Make<Text>(Text.compare);
    var cityBookmarks = cityMap.empty<[MapBookmark]>();

    let bookmarks = Iter.toArray(textMap.vals(mapBookmarks));
    if (bookmarks.size() > 0) {
      for (bookmark in Iter.fromArray(bookmarks)) {
        let existingBookmarks = switch (cityMap.get(cityBookmarks, bookmark.city)) {
          case (null) { [] };
          case (?bookmarks) { bookmarks };
        };

        let updatedBookmarks = Array.append(existingBookmarks, [bookmark]);
        cityBookmarks := cityMap.put(cityBookmarks, bookmark.city, updatedBookmarks);
      };
    };

    var result = List.nil<(Text, [MapBookmark])>();
    for ((city, bookmarks) in cityMap.entries(cityBookmarks)) {
      result := List.push((city, bookmarks), result);
    };

    List.toArray(result);
  };

  // Geoname City Management (Admin only for modifications, public for reading)
  public shared ({ caller }) func importCities(cities : [GeonameCity]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can import cities");
    };
    for (city in cities.vals()) {
      let classification = classifyCity(city.featureCode);
      let updatedCity : GeonameCity = {
        city with
        classification;
      };
      geonameCities := textMap.put(geonameCities, city.name, updatedCity);
    };
  };

  public shared ({ caller }) func addCity(city : GeonameCity) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add cities");
    };
    let classification = classifyCity(city.featureCode);
    let updatedCity : GeonameCity = {
      city with
      classification;
    };
    geonameCities := textMap.put(geonameCities, city.name, updatedCity);
  };

  public shared ({ caller }) func updateCity(name : Text, city : GeonameCity) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update cities");
    };
    switch (textMap.get(geonameCities, name)) {
      case (null) { false };
      case (?_) {
        let classification = classifyCity(city.featureCode);
        let updatedCity : GeonameCity = {
          city with
          classification;
        };
        geonameCities := textMap.put(geonameCities, name, updatedCity);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteCity(name : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can delete cities");
    };
    let (newMap, removedValue) = textMap.remove(geonameCities, name);
    geonameCities := newMap;
    switch (removedValue) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query func getCity(name : Text) : async ?GeonameCity {
    textMap.get(geonameCities, name);
  };

  public query func getAllCities() : async [GeonameCity] {
    Iter.toArray(textMap.vals(geonameCities));
  };

  public query func searchCities(searchTerm : Text, page : Nat, pageSize : Nat) : async [GeonameCity] {
    let lowerSearchTerm = Text.toLowercase(searchTerm);
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (
        Text.contains(Text.toLowercase(city.name), #text lowerSearchTerm) or
        Text.contains(Text.toLowercase(city.country), #text lowerSearchTerm) or
        Text.contains(Text.toLowercase(city.region), #text lowerSearchTerm) or
        Text.contains(Text.toLowercase(city.classification), #text lowerSearchTerm)
      ) {
        matches := List.push(city, matches);
      };
    };

    let matchesArray = List.toArray(matches);
    let start = page * pageSize;
    let end = start + pageSize;

    if (start >= matchesArray.size()) {
      return [];
    };

    Array.tabulate<GeonameCity>(
      if (end > matchesArray.size()) { matchesArray.size() - start } else {
        pageSize;
      },
      func(i) { matchesArray[start + i] },
    );
  };

  public query func getCitiesPaginated(page : Nat, pageSize : Nat) : async [GeonameCity] {
    let allCities = Iter.toArray(textMap.vals(geonameCities));
    let start = page * pageSize;
    let end = start + pageSize;

    if (start >= allCities.size()) {
      return [];
    };

    Array.tabulate<GeonameCity>(
      if (end > allCities.size()) { allCities.size() - start } else {
        pageSize;
      },
      func(i) { allCities[start + i] },
    );
  };

  public query func getCitiesByCountry(country : Text) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (city.country == country) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  public query func getCitiesByRegion(region : Text) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (city.region == region) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  public query func getCitiesByFeatureCode(featureCode : Text) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (city.featureCode == featureCode) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  public query func getCitiesByPopulation(minPopulation : Int, maxPopulation : Int) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (city.population >= minPopulation and city.population <= maxPopulation) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  public query func getCitiesByCoordinates(minLat : Float, maxLat : Float, minLon : Float, maxLon : Float) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (
        city.latitude >= minLat and city.latitude <= maxLat and
        city.longitude >= minLon and city.longitude <= maxLon
      ) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  public query func getCitiesByCountryAndRegion(country : Text, region : Text) : async [GeonameCity] {
    var matches = List.nil<GeonameCity>();

    for (city in textMap.vals(geonameCities)) {
      if (city.country == country and city.region == region) {
        matches := List.push(city, matches);
      };
    };

    List.toArray(matches);
  };

  func classifyCity(featureCode : Text) : Text {
    switch (featureCode) {
      case ("PPLC") { "Capital" };
      case ("G") { "Global City" };
      case ("M") { "Major City" };
      case ("R") { "Regional City" };
      case ("S") { "Sub-regional City" };
      case ("T") { "Town" };
      case (_) { "other" };
    };
  };

  include BlobStorage(registry);
};

