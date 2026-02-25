import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CityAlbum {
  'city' : string,
  'createdAt' : Time,
  'updatedAt' : Time,
  'socialMediaLinks' : Array<SocialMediaLink>,
  'mediaFiles' : Array<MediaFile>,
}
export interface CityRating {
  'city' : string,
  'createdAt' : Time,
  'comment' : string,
  'updatedAt' : Time,
  'rating' : number,
}
export interface FileReference { 'hash' : string, 'path' : string }
export interface GeonameCity {
  'region' : string,
  'latitude' : number,
  'country' : string,
  'name' : string,
  'longitude' : number,
  'population' : bigint,
  'featureCode' : string,
  'classification' : string,
}
export interface Journey {
  'endDate' : Time,
  'city' : string,
  'createdAt' : Time,
  'updatedAt' : Time,
  'startDate' : Time,
}
export interface LocationInfo {
  'photoPath' : [] | [string],
  'name' : string,
  'createdAt' : Time,
  'updatedAt' : Time,
  'coordinates' : [number, number],
}
export interface MapBookmark {
  'city' : string,
  'name' : string,
  'createdAt' : Time,
  'description' : string,
  'updatedAt' : Time,
  'coordinates' : [number, number],
}
export interface MediaFile {
  'path' : string,
  'mediaType' : MediaType,
  'uploadedAt' : Time,
  'format' : string,
}
export type MediaType = { 'audio' : null } |
  { 'video' : null } |
  { 'image' : null };
export interface MusicAlbum {
  'title' : string,
  'createdAt' : Time,
  'description' : string,
  'songs' : Array<Song>,
  'updatedAt' : Time,
}
export interface ScheduleItem {
  'date' : Time,
  'createdAt' : Time,
  'time' : string,
  'updatedAt' : Time,
  'location' : string,
  'activity' : string,
}
export interface SocialMediaLink {
  'url' : string,
  'platform' : string,
  'addedAt' : Time,
}
export interface Song {
  'title' : [] | [string],
  'album' : string,
  'filePath' : string,
  'artist' : [] | [string],
  'uploadedAt' : Time,
}
export type Time = bigint;
export interface TravelSpot {
  'city' : string,
  'spotType' : string,
  'name' : string,
  'createdAt' : Time,
  'description' : [] | [string],
  'updatedAt' : Time,
  'socialMediaLinks' : Array<SocialMediaLink>,
  'rating' : number,
  'mediaFiles' : Array<MediaFile>,
  'coordinates' : [number, number],
}
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface VibeItem {
  'city' : string,
  'name' : string,
  'createdAt' : Time,
  'description' : string,
  'updatedAt' : Time,
  'itemType' : string,
  'coordinates' : [number, number],
}
export interface WebsiteLayoutSettings {
  'createdAt' : Time,
  'updatedAt' : Time,
  'mapZoomLevel' : bigint,
  'showAllTravelSpots' : boolean,
  'cityFontSize' : number,
  'showMusicPlayerBar' : boolean,
  'defaultSearchPlace' : string,
  'rippleSize' : number,
}
export interface _SERVICE {
  'addCity' : ActorMethod<[GeonameCity], undefined>,
  'addCityAlbum' : ActorMethod<
    [string, Array<MediaFile>, Array<SocialMediaLink>],
    undefined
  >,
  'addCityRating' : ActorMethod<[string, number, string], undefined>,
  'addJourney' : ActorMethod<[string, Time, Time], undefined>,
  'addLocationInfo' : ActorMethod<
    [string, [number, number], [] | [string]],
    undefined
  >,
  'addMapBookmark' : ActorMethod<
    [[number, number], string, string, string],
    undefined
  >,
  'addMediaToCityAlbum' : ActorMethod<[string, MediaFile], boolean>,
  'addMediaToTravelSpot' : ActorMethod<[string, string, MediaFile], boolean>,
  'addMusicAlbum' : ActorMethod<[string, string, Array<Song>], undefined>,
  'addScheduleItem' : ActorMethod<
    [string, Time, string, string, string],
    undefined
  >,
  'addSocialMediaLinkToCityAlbum' : ActorMethod<
    [string, SocialMediaLink],
    boolean
  >,
  'addSocialMediaLinkToTravelSpot' : ActorMethod<
    [string, string, SocialMediaLink],
    boolean
  >,
  'addSongToMusicAlbum' : ActorMethod<[string, Song], boolean>,
  'addTravelSpot' : ActorMethod<
    [string, string, [] | [string], [number, number], string, number],
    undefined
  >,
  'addWebsiteLayoutSettings' : ActorMethod<
    [boolean, string, boolean, number, number],
    undefined
  >,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'deleteCity' : ActorMethod<[string], boolean>,
  'deleteCityAlbum' : ActorMethod<[string], boolean>,
  'deleteCityRating' : ActorMethod<[string], boolean>,
  'deleteJourney' : ActorMethod<[string], boolean>,
  'deleteLocationInfo' : ActorMethod<[string], boolean>,
  'deleteMapBookmark' : ActorMethod<[string], boolean>,
  'deleteMusicAlbum' : ActorMethod<[string], boolean>,
  'deleteScheduleItem' : ActorMethod<[string, Time, string], boolean>,
  'deleteTravelSpot' : ActorMethod<[string, string], boolean>,
  'deleteWebsiteLayoutSettings' : ActorMethod<[], boolean>,
  'dropFileReference' : ActorMethod<[string], undefined>,
  'getAllBookmarksAndTravelSpotsByCity' : ActorMethod<
    [],
    Array<[string, Array<VibeItem>]>
  >,
  'getAllBookmarksByCity' : ActorMethod<
    [],
    Array<[string, Array<MapBookmark>]>
  >,
  'getAllCities' : ActorMethod<[], Array<GeonameCity>>,
  'getAllCitiesWithRatingsAndTravelSpots' : ActorMethod<
    [],
    Array<[string, [] | [number], Array<TravelSpot>]>
  >,
  'getAllCityAlbums' : ActorMethod<[], Array<CityAlbum>>,
  'getAllCityRatings' : ActorMethod<[], Array<CityRating>>,
  'getAllJourneys' : ActorMethod<[], Array<Journey>>,
  'getAllLocationInfo' : ActorMethod<[], Array<LocationInfo>>,
  'getAllMapBookmarks' : ActorMethod<[], Array<MapBookmark>>,
  'getAllMusicAlbums' : ActorMethod<[], Array<MusicAlbum>>,
  'getAllScheduleItems' : ActorMethod<[], Array<ScheduleItem>>,
  'getAllScheduleItemsWithCoordinates' : ActorMethod<
    [],
    Array<[ScheduleItem, [number, number]]>
  >,
  'getAllTravelSpots' : ActorMethod<[], Array<TravelSpot>>,
  'getAllTravelSpotsForMap' : ActorMethod<[], Array<TravelSpot>>,
  'getAllVibes' : ActorMethod<[], Array<VibeItem>>,
  'getAllWebsiteLayoutSettings' : ActorMethod<[], Array<WebsiteLayoutSettings>>,
  'getAverageCityRating' : ActorMethod<[string], number>,
  'getBookmarkSummaryByCity' : ActorMethod<[], Array<[string, bigint]>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCitiesByCoordinates' : ActorMethod<
    [number, number, number, number],
    Array<GeonameCity>
  >,
  'getCitiesByCountry' : ActorMethod<[string], Array<GeonameCity>>,
  'getCitiesByCountryAndFeatureCode' : ActorMethod<
    [string, string],
    Array<GeonameCity>
  >,
  'getCitiesByCountryAndPopulation' : ActorMethod<
    [string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByCountryAndRegion' : ActorMethod<
    [string, string],
    Array<GeonameCity>
  >,
  'getCitiesByCountryFeatureCodeAndPopulation' : ActorMethod<
    [string, string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByCountryRegionAndFeatureCode' : ActorMethod<
    [string, string, string],
    Array<GeonameCity>
  >,
  'getCitiesByCountryRegionAndPopulation' : ActorMethod<
    [string, string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByCountryRegionFeatureCodeAndPopulation' : ActorMethod<
    [string, string, string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByFeatureCode' : ActorMethod<[string], Array<GeonameCity>>,
  'getCitiesByFeatureCodeAndPopulation' : ActorMethod<
    [string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByPopulation' : ActorMethod<[bigint, bigint], Array<GeonameCity>>,
  'getCitiesByRegion' : ActorMethod<[string], Array<GeonameCity>>,
  'getCitiesByRegionAndFeatureCode' : ActorMethod<
    [string, string],
    Array<GeonameCity>
  >,
  'getCitiesByRegionAndPopulation' : ActorMethod<
    [string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesByRegionFeatureCodeAndPopulation' : ActorMethod<
    [string, string, bigint, bigint],
    Array<GeonameCity>
  >,
  'getCitiesPaginated' : ActorMethod<[bigint, bigint], Array<GeonameCity>>,
  'getCity' : ActorMethod<[string], [] | [GeonameCity]>,
  'getCityAlbum' : ActorMethod<[string], [] | [CityAlbum]>,
  'getCityAlbumForPopup' : ActorMethod<[string], [] | [CityAlbum]>,
  'getCityComments' : ActorMethod<[string], Array<string>>,
  'getCityFontSize' : ActorMethod<[], number>,
  'getCityMediaFiles' : ActorMethod<[string], Array<MediaFile>>,
  'getCityRating' : ActorMethod<[string], [] | [CityRating]>,
  'getCityRatingForPopup' : ActorMethod<[string], [] | [number]>,
  'getCitySocialMediaLinks' : ActorMethod<[string], Array<SocialMediaLink>>,
  'getCombinedVibesSummaryByCity' : ActorMethod<
    [],
    Array<[string, bigint, bigint]>
  >,
  'getCountryCoordinates' : ActorMethod<[string], [] | [[number, number]]>,
  'getDisplaySettings' : ActorMethod<[], [] | [boolean]>,
  'getFileReference' : ActorMethod<[string], FileReference>,
  'getJourney' : ActorMethod<[string], [] | [Journey]>,
  'getJourneyScheduleWithDays' : ActorMethod<
    [string],
    Array<[string, Array<ScheduleItem>]>
  >,
  'getLocationInfo' : ActorMethod<[string], [] | [LocationInfo]>,
  'getMapBookmarkByCoordinates' : ActorMethod<
    [[number, number]],
    [] | [MapBookmark]
  >,
  'getMapBookmarks' : ActorMethod<[], Array<MapBookmark>>,
  'getMapBookmarksByCity' : ActorMethod<[string], Array<MapBookmark>>,
  'getMusicAlbum' : ActorMethod<[string], [] | [MusicAlbum]>,
  'getMusicAlbumSongs' : ActorMethod<[string], Array<Song>>,
  'getPreviousJourneys' : ActorMethod<[], Array<Journey>>,
  'getRippleSize' : ActorMethod<[], number>,
  'getScheduleItems' : ActorMethod<[string], Array<ScheduleItem>>,
  'getTravelSpotMediaFiles' : ActorMethod<[string, string], Array<MediaFile>>,
  'getTravelSpotSocialMediaLinks' : ActorMethod<
    [string, string],
    Array<SocialMediaLink>
  >,
  'getTravelSpotSummaryByCity' : ActorMethod<[], Array<[string, bigint]>>,
  'getTravelSpotTypeBreakdown' : ActorMethod<[string], Array<[string, bigint]>>,
  'getTravelSpotTypes' : ActorMethod<[], Array<string>>,
  'getTravelSpots' : ActorMethod<[string], Array<TravelSpot>>,
  'getTravelSpotsByCityAndType' : ActorMethod<
    [string, string],
    Array<TravelSpot>
  >,
  'getUpcomingJourneys' : ActorMethod<[], Array<Journey>>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getVibesByCity' : ActorMethod<[], Array<[string, Array<VibeItem>]>>,
  'getWebsiteLayoutSettings' : ActorMethod<[], [] | [WebsiteLayoutSettings]>,
  'importCities' : ActorMethod<[Array<GeonameCity>], undefined>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'initializeCoordinates' : ActorMethod<[], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'listFileReferences' : ActorMethod<[], Array<FileReference>>,
  'registerFileReference' : ActorMethod<[string, string], undefined>,
  'removeMediaFromCityAlbum' : ActorMethod<[string, string], boolean>,
  'removeMediaFromTravelSpot' : ActorMethod<[string, string, string], boolean>,
  'removeSocialMediaLinkFromCityAlbum' : ActorMethod<[string, string], boolean>,
  'removeSocialMediaLinkFromTravelSpot' : ActorMethod<
    [string, string, string],
    boolean
  >,
  'removeSongFromMusicAlbum' : ActorMethod<[string, string], boolean>,
  'reorderScheduleItems' : ActorMethod<[string, Array<ScheduleItem>], boolean>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'searchCities' : ActorMethod<[string, bigint, bigint], Array<GeonameCity>>,
  'updateCity' : ActorMethod<[string, GeonameCity], boolean>,
  'updateCityAlbum' : ActorMethod<
    [string, Array<MediaFile>, Array<SocialMediaLink>],
    boolean
  >,
  'updateCityRating' : ActorMethod<[string, number, string], boolean>,
  'updateDashboard' : ActorMethod<[], Array<[string, bigint, bigint]>>,
  'updateJourney' : ActorMethod<[string, Time, Time], boolean>,
  'updateLocationInfo' : ActorMethod<[string, [] | [string]], boolean>,
  'updateMapBookmark' : ActorMethod<
    [[number, number], string, string, string],
    boolean
  >,
  'updateMusicAlbum' : ActorMethod<[string, string, Array<Song>], boolean>,
  'updateScheduleItem' : ActorMethod<
    [string, Time, string, string, string],
    boolean
  >,
  'updateTravelSpot' : ActorMethod<
    [string, string, [] | [string], [number, number], string, number],
    boolean
  >,
  'updateWebsiteLayoutSettings' : ActorMethod<
    [boolean, string, boolean, number, number],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
