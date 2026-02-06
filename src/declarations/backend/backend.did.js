export const idlFactory = ({ IDL }) => {
  const GeonameCity = IDL.Record({
    'region' : IDL.Text,
    'latitude' : IDL.Float64,
    'country' : IDL.Text,
    'name' : IDL.Text,
    'longitude' : IDL.Float64,
    'population' : IDL.Int,
    'featureCode' : IDL.Text,
    'classification' : IDL.Text,
  });
  const MediaType = IDL.Variant({
    'audio' : IDL.Null,
    'video' : IDL.Null,
    'image' : IDL.Null,
  });
  const Time = IDL.Int;
  const MediaFile = IDL.Record({
    'path' : IDL.Text,
    'mediaType' : MediaType,
    'uploadedAt' : Time,
    'format' : IDL.Text,
  });
  const SocialMediaLink = IDL.Record({
    'url' : IDL.Text,
    'platform' : IDL.Text,
    'addedAt' : Time,
  });
  const Song = IDL.Record({
    'title' : IDL.Opt(IDL.Text),
    'album' : IDL.Text,
    'filePath' : IDL.Text,
    'artist' : IDL.Opt(IDL.Text),
    'uploadedAt' : Time,
  });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const VibeItem = IDL.Record({
    'city' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : Time,
    'description' : IDL.Text,
    'updatedAt' : Time,
    'itemType' : IDL.Text,
    'coordinates' : IDL.Tuple(IDL.Float64, IDL.Float64),
  });
  const MapBookmark = IDL.Record({
    'city' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : Time,
    'description' : IDL.Text,
    'updatedAt' : Time,
    'coordinates' : IDL.Tuple(IDL.Float64, IDL.Float64),
  });
  const TravelSpot = IDL.Record({
    'city' : IDL.Text,
    'spotType' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : Time,
    'description' : IDL.Opt(IDL.Text),
    'updatedAt' : Time,
    'socialMediaLinks' : IDL.Vec(SocialMediaLink),
    'rating' : IDL.Float64,
    'mediaFiles' : IDL.Vec(MediaFile),
    'coordinates' : IDL.Tuple(IDL.Float64, IDL.Float64),
  });
  const CityAlbum = IDL.Record({
    'city' : IDL.Text,
    'createdAt' : Time,
    'updatedAt' : Time,
    'socialMediaLinks' : IDL.Vec(SocialMediaLink),
    'mediaFiles' : IDL.Vec(MediaFile),
  });
  const CityRating = IDL.Record({
    'city' : IDL.Text,
    'createdAt' : Time,
    'comment' : IDL.Text,
    'updatedAt' : Time,
    'rating' : IDL.Float64,
  });
  const Journey = IDL.Record({
    'endDate' : Time,
    'city' : IDL.Text,
    'createdAt' : Time,
    'updatedAt' : Time,
    'startDate' : Time,
  });
  const LocationInfo = IDL.Record({
    'photoPath' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'createdAt' : Time,
    'updatedAt' : Time,
    'coordinates' : IDL.Tuple(IDL.Float64, IDL.Float64),
  });
  const MusicAlbum = IDL.Record({
    'title' : IDL.Text,
    'createdAt' : Time,
    'description' : IDL.Text,
    'songs' : IDL.Vec(Song),
    'updatedAt' : Time,
  });
  const ScheduleItem = IDL.Record({
    'date' : Time,
    'createdAt' : Time,
    'time' : IDL.Text,
    'updatedAt' : Time,
    'location' : IDL.Text,
    'activity' : IDL.Text,
  });
  const WebsiteLayoutSettings = IDL.Record({
    'createdAt' : Time,
    'updatedAt' : Time,
    'mapZoomLevel' : IDL.Nat,
    'showAllTravelSpots' : IDL.Bool,
    'cityFontSize' : IDL.Float64,
    'showMusicPlayerBar' : IDL.Bool,
    'defaultSearchPlace' : IDL.Text,
    'rippleSize' : IDL.Float64,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  const FileReference = IDL.Record({ 'hash' : IDL.Text, 'path' : IDL.Text });
  return IDL.Service({
    'addCity' : IDL.Func([GeonameCity], [], []),
    'addCityAlbum' : IDL.Func(
        [IDL.Text, IDL.Vec(MediaFile), IDL.Vec(SocialMediaLink)],
        [],
        [],
      ),
    'addCityRating' : IDL.Func([IDL.Text, IDL.Float64, IDL.Text], [], []),
    'addJourney' : IDL.Func([IDL.Text, Time, Time], [], []),
    'addLocationInfo' : IDL.Func(
        [IDL.Text, IDL.Tuple(IDL.Float64, IDL.Float64), IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'addMapBookmark' : IDL.Func(
        [IDL.Tuple(IDL.Float64, IDL.Float64), IDL.Text, IDL.Text, IDL.Text],
        [],
        [],
      ),
    'addMediaToCityAlbum' : IDL.Func([IDL.Text, MediaFile], [IDL.Bool], []),
    'addMediaToTravelSpot' : IDL.Func(
        [IDL.Text, IDL.Text, MediaFile],
        [IDL.Bool],
        [],
      ),
    'addMusicAlbum' : IDL.Func([IDL.Text, IDL.Text, IDL.Vec(Song)], [], []),
    'addScheduleItem' : IDL.Func(
        [IDL.Text, Time, IDL.Text, IDL.Text, IDL.Text],
        [],
        [],
      ),
    'addSocialMediaLinkToCityAlbum' : IDL.Func(
        [IDL.Text, SocialMediaLink],
        [IDL.Bool],
        [],
      ),
    'addSocialMediaLinkToTravelSpot' : IDL.Func(
        [IDL.Text, IDL.Text, SocialMediaLink],
        [IDL.Bool],
        [],
      ),
    'addSongToMusicAlbum' : IDL.Func([IDL.Text, Song], [IDL.Bool], []),
    'addTravelSpot' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Tuple(IDL.Float64, IDL.Float64),
          IDL.Text,
          IDL.Float64,
        ],
        [],
        [],
      ),
    'addWebsiteLayoutSettings' : IDL.Func(
        [IDL.Bool, IDL.Text, IDL.Bool, IDL.Float64, IDL.Float64],
        [],
        [],
      ),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'deleteCity' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteCityAlbum' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteCityRating' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteJourney' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteLocationInfo' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteMapBookmark' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteMusicAlbum' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deleteScheduleItem' : IDL.Func([IDL.Text, Time, IDL.Text], [IDL.Bool], []),
    'deleteTravelSpot' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'deleteWebsiteLayoutSettings' : IDL.Func([], [IDL.Bool], []),
    'dropFileReference' : IDL.Func([IDL.Text], [], []),
    'getAllBookmarksAndTravelSpotsByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(VibeItem)))],
        ['query'],
      ),
    'getAllBookmarksByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(MapBookmark)))],
        ['query'],
      ),
    'getAllCities' : IDL.Func([], [IDL.Vec(GeonameCity)], ['query']),
    'getAllCitiesWithRatingsAndTravelSpots' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Tuple(IDL.Text, IDL.Opt(IDL.Float64), IDL.Vec(TravelSpot))
          ),
        ],
        ['query'],
      ),
    'getAllCityAlbums' : IDL.Func([], [IDL.Vec(CityAlbum)], ['query']),
    'getAllCityRatings' : IDL.Func([], [IDL.Vec(CityRating)], ['query']),
    'getAllJourneys' : IDL.Func([], [IDL.Vec(Journey)], ['query']),
    'getAllLocationInfo' : IDL.Func([], [IDL.Vec(LocationInfo)], ['query']),
    'getAllMapBookmarks' : IDL.Func([], [IDL.Vec(MapBookmark)], ['query']),
    'getAllMusicAlbums' : IDL.Func([], [IDL.Vec(MusicAlbum)], ['query']),
    'getAllScheduleItems' : IDL.Func([], [IDL.Vec(ScheduleItem)], ['query']),
    'getAllScheduleItemsWithCoordinates' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(ScheduleItem, IDL.Tuple(IDL.Float64, IDL.Float64)))],
        ['query'],
      ),
    'getAllTravelSpots' : IDL.Func([], [IDL.Vec(TravelSpot)], ['query']),
    'getAllTravelSpotsForMap' : IDL.Func([], [IDL.Vec(TravelSpot)], ['query']),
    'getAllVibes' : IDL.Func([], [IDL.Vec(VibeItem)], ['query']),
    'getAllWebsiteLayoutSettings' : IDL.Func(
        [],
        [IDL.Vec(WebsiteLayoutSettings)],
        ['query'],
      ),
    'getAverageCityRating' : IDL.Func([IDL.Text], [IDL.Float64], ['query']),
    'getBookmarkSummaryByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCitiesByCoordinates' : IDL.Func(
        [IDL.Float64, IDL.Float64, IDL.Float64, IDL.Float64],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountry' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryAndFeatureCode' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryAndRegion' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryFeatureCodeAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryRegionAndFeatureCode' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryRegionAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByCountryRegionFeatureCodeAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByFeatureCode' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByFeatureCodeAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByPopulation' : IDL.Func(
        [IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByRegion' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByRegionAndFeatureCode' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByRegionAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesByRegionFeatureCodeAndPopulation' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Int, IDL.Int],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCitiesPaginated' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'getCity' : IDL.Func([IDL.Text], [IDL.Opt(GeonameCity)], ['query']),
    'getCityAlbum' : IDL.Func([IDL.Text], [IDL.Opt(CityAlbum)], ['query']),
    'getCityAlbumForPopup' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(CityAlbum)],
        ['query'],
      ),
    'getCityComments' : IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
    'getCityFontSize' : IDL.Func([], [IDL.Float64], ['query']),
    'getCityMediaFiles' : IDL.Func([IDL.Text], [IDL.Vec(MediaFile)], ['query']),
    'getCityRating' : IDL.Func([IDL.Text], [IDL.Opt(CityRating)], ['query']),
    'getCityRatingForPopup' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Float64)],
        ['query'],
      ),
    'getCitySocialMediaLinks' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(SocialMediaLink)],
        ['query'],
      ),
    'getCombinedVibesSummaryByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat, IDL.Nat))],
        ['query'],
      ),
    'getCountryCoordinates' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Tuple(IDL.Float64, IDL.Float64))],
        ['query'],
      ),
    'getDisplaySettings' : IDL.Func([], [IDL.Opt(IDL.Bool)], ['query']),
    'getFileReference' : IDL.Func([IDL.Text], [FileReference], ['query']),
    'getJourney' : IDL.Func([IDL.Text], [IDL.Opt(Journey)], ['query']),
    'getJourneyScheduleWithDays' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(ScheduleItem)))],
        ['query'],
      ),
    'getLocationInfo' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(LocationInfo)],
        ['query'],
      ),
    'getMapBookmarkByCoordinates' : IDL.Func(
        [IDL.Tuple(IDL.Float64, IDL.Float64)],
        [IDL.Opt(MapBookmark)],
        ['query'],
      ),
    'getMapBookmarks' : IDL.Func([], [IDL.Vec(MapBookmark)], ['query']),
    'getMapBookmarksByCity' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(MapBookmark)],
        ['query'],
      ),
    'getMusicAlbum' : IDL.Func([IDL.Text], [IDL.Opt(MusicAlbum)], ['query']),
    'getMusicAlbumSongs' : IDL.Func([IDL.Text], [IDL.Vec(Song)], ['query']),
    'getPreviousJourneys' : IDL.Func([], [IDL.Vec(Journey)], ['query']),
    'getRippleSize' : IDL.Func([], [IDL.Float64], ['query']),
    'getScheduleItems' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(ScheduleItem)],
        ['query'],
      ),
    'getTravelSpotMediaFiles' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(MediaFile)],
        ['query'],
      ),
    'getTravelSpotSocialMediaLinks' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(SocialMediaLink)],
        ['query'],
      ),
    'getTravelSpotSummaryByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'getTravelSpotTypeBreakdown' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'getTravelSpotTypes' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'getTravelSpots' : IDL.Func([IDL.Text], [IDL.Vec(TravelSpot)], ['query']),
    'getTravelSpotsByCityAndType' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Vec(TravelSpot)],
        ['query'],
      ),
    'getUpcomingJourneys' : IDL.Func([], [IDL.Vec(Journey)], ['query']),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getVibesByCity' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(VibeItem)))],
        ['query'],
      ),
    'getWebsiteLayoutSettings' : IDL.Func(
        [],
        [IDL.Opt(WebsiteLayoutSettings)],
        ['query'],
      ),
    'importCities' : IDL.Func([IDL.Vec(GeonameCity)], [], []),
    'initializeAccessControl' : IDL.Func([], [], []),
    'initializeCoordinates' : IDL.Func([], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'listFileReferences' : IDL.Func([], [IDL.Vec(FileReference)], ['query']),
    'registerFileReference' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'removeMediaFromCityAlbum' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'removeMediaFromTravelSpot' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'removeSocialMediaLinkFromCityAlbum' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'removeSocialMediaLinkFromTravelSpot' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'removeSongFromMusicAlbum' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'reorderScheduleItems' : IDL.Func(
        [IDL.Text, IDL.Vec(ScheduleItem)],
        [IDL.Bool],
        [],
      ),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'searchCities' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Nat],
        [IDL.Vec(GeonameCity)],
        ['query'],
      ),
    'updateCity' : IDL.Func([IDL.Text, GeonameCity], [IDL.Bool], []),
    'updateCityAlbum' : IDL.Func(
        [IDL.Text, IDL.Vec(MediaFile), IDL.Vec(SocialMediaLink)],
        [IDL.Bool],
        [],
      ),
    'updateCityRating' : IDL.Func(
        [IDL.Text, IDL.Float64, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'updateDashboard' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat, IDL.Nat))],
        [],
      ),
    'updateJourney' : IDL.Func([IDL.Text, Time, Time], [IDL.Bool], []),
    'updateLocationInfo' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'updateMapBookmark' : IDL.Func(
        [IDL.Tuple(IDL.Float64, IDL.Float64), IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'updateMusicAlbum' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Vec(Song)],
        [IDL.Bool],
        [],
      ),
    'updateScheduleItem' : IDL.Func(
        [IDL.Text, Time, IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'updateTravelSpot' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Tuple(IDL.Float64, IDL.Float64),
          IDL.Text,
          IDL.Float64,
        ],
        [IDL.Bool],
        [],
      ),
    'updateWebsiteLayoutSettings' : IDL.Func(
        [IDL.Bool, IDL.Text, IDL.Bool, IDL.Float64, IDL.Float64],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
