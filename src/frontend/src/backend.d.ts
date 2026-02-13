import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface MediaFile {
    path: string;
    mediaType: MediaType;
    uploadedAt: Time;
    format: string;
}
export type Time = bigint;
export interface CityAlbum {
    city: string;
    createdAt: Time;
    updatedAt: Time;
    socialMediaLinks: Array<SocialMediaLink>;
    mediaFiles: Array<MediaFile>;
}
export interface VibeItem {
    city: string;
    name: string;
    createdAt: Time;
    description: string;
    updatedAt: Time;
    itemType: string;
    coordinates: [number, number];
}
export interface SocialMediaLink {
    url: string;
    platform: string;
    addedAt: Time;
}
export interface LocationInfo {
    photoPath?: string;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    coordinates: [number, number];
}
export interface GeonameCity {
    region: string;
    latitude: number;
    country: string;
    name: string;
    longitude: number;
    population: bigint;
    featureCode: string;
    classification: string;
}
export interface CityRating {
    city: string;
    createdAt: Time;
    comment: string;
    updatedAt: Time;
    rating: number;
}
export interface WebsiteLayoutSettings {
    createdAt: Time;
    updatedAt: Time;
    mapZoomLevel: bigint;
    showAllTravelSpots: boolean;
    cityFontSize: number;
    showMusicPlayerBar: boolean;
    defaultSearchPlace: string;
    rippleSize: number;
}
export interface ScheduleItem {
    date: Time;
    createdAt: Time;
    time: string;
    updatedAt: Time;
    journeyCity: string;
    location: string;
    activity: string;
}
export interface MusicAlbum {
    title: string;
    createdAt: Time;
    description: string;
    songs: Array<Song>;
    updatedAt: Time;
}
export interface Journey {
    endDate: Time;
    city: string;
    createdAt: Time;
    updatedAt: Time;
    startDate: Time;
}
export interface Song {
    title?: string;
    album: string;
    filePath: string;
    artist?: string;
    uploadedAt: Time;
}
export interface MapBookmark {
    city: string;
    name: string;
    createdAt: Time;
    description: string;
    updatedAt: Time;
    coordinates: [number, number];
}
export interface FileReference {
    hash: string;
    path: string;
}
export interface TravelSpot {
    city: string;
    spotType: string;
    name: string;
    createdAt: Time;
    description?: string;
    updatedAt: Time;
    socialMediaLinks: Array<SocialMediaLink>;
    rating: number;
    mediaFiles: Array<MediaFile>;
    coordinates: [number, number];
}
export enum MediaType {
    audio = "audio",
    video = "video",
    image = "image"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCity(city: GeonameCity): Promise<void>;
    addCityAlbum(city: string, mediaFiles: Array<MediaFile>, socialMediaLinks: Array<SocialMediaLink>): Promise<void>;
    addCityRating(city: string, rating: number, comment: string): Promise<void>;
    addJourney(city: string, startDate: Time, endDate: Time): Promise<void>;
    addLocationInfo(name: string, coordinates: [number, number], photoPath: string | null): Promise<void>;
    addMapBookmark(coordinates: [number, number], name: string, description: string, city: string): Promise<void>;
    addMediaToCityAlbum(city: string, mediaFile: MediaFile): Promise<boolean>;
    addMediaToTravelSpot(city: string, spotName: string, mediaFile: MediaFile): Promise<boolean>;
    addMusicAlbum(title: string, description: string, songs: Array<Song>): Promise<void>;
    addScheduleItem(journeyCity: string, date: Time, time: string, location: string, activity: string): Promise<void>;
    addSocialMediaLinkToCityAlbum(city: string, socialMediaLink: SocialMediaLink): Promise<boolean>;
    addSocialMediaLinkToTravelSpot(city: string, spotName: string, socialMediaLink: SocialMediaLink): Promise<boolean>;
    addSongToMusicAlbum(title: string, song: Song): Promise<boolean>;
    addTravelSpot(city: string, name: string, description: string | null, coordinates: [number, number], spotType: string, rating: number): Promise<void>;
    addWebsiteLayoutSettings(showMusicPlayerBar: boolean, defaultSearchPlace: string, showAllTravelSpots: boolean, rippleSize: number, cityFontSize: number): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCity(name: string): Promise<boolean>;
    deleteCityAlbum(city: string): Promise<boolean>;
    deleteCityRating(city: string): Promise<boolean>;
    deleteJourney(city: string): Promise<boolean>;
    deleteLocationInfo(name: string): Promise<boolean>;
    deleteMapBookmark(name: string): Promise<boolean>;
    deleteMusicAlbum(title: string): Promise<boolean>;
    deleteScheduleItem(journeyCity: string, date: Time, time: string): Promise<boolean>;
    deleteTravelSpot(city: string, name: string): Promise<boolean>;
    deleteWebsiteLayoutSettings(): Promise<boolean>;
    dropFileReference(path: string): Promise<void>;
    getAdmins(): Promise<Array<Principal>>;
    getAllBookmarksAndTravelSpotsByCity(): Promise<Array<[string, Array<VibeItem>]>>;
    getAllBookmarksByCity(): Promise<Array<[string, Array<MapBookmark>]>>;
    getAllCities(): Promise<Array<GeonameCity>>;
    getAllCitiesWithRatingsAndTravelSpots(): Promise<Array<[string, number | null, Array<TravelSpot>]>>;
    getAllCityAlbums(): Promise<Array<CityAlbum>>;
    getAllCityRatings(): Promise<Array<CityRating>>;
    getAllJourneys(): Promise<Array<Journey>>;
    getAllLocationInfo(): Promise<Array<LocationInfo>>;
    getAllMapBookmarks(): Promise<Array<MapBookmark>>;
    getAllMusicAlbums(): Promise<Array<MusicAlbum>>;
    getAllScheduleItems(): Promise<Array<ScheduleItem>>;
    getAllScheduleItemsWithCoordinates(): Promise<Array<[ScheduleItem, [number, number]]>>;
    getAllTravelSpots(): Promise<Array<TravelSpot>>;
    getAllTravelSpotsForMap(): Promise<Array<TravelSpot>>;
    getAllVibes(): Promise<Array<VibeItem>>;
    getAllWebsiteLayoutSettings(): Promise<Array<WebsiteLayoutSettings>>;
    getAverageCityRating(city: string): Promise<number>;
    getBookmarkSummaryByCity(): Promise<Array<[string, bigint]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCitiesByCoordinates(minLat: number, maxLat: number, minLon: number, maxLon: number): Promise<Array<GeonameCity>>;
    getCitiesByCountry(country: string): Promise<Array<GeonameCity>>;
    getCitiesByCountryAndRegion(country: string, region: string): Promise<Array<GeonameCity>>;
    getCitiesByFeatureCode(featureCode: string): Promise<Array<GeonameCity>>;
    getCitiesByPopulation(minPopulation: bigint, maxPopulation: bigint): Promise<Array<GeonameCity>>;
    getCitiesByRegion(region: string): Promise<Array<GeonameCity>>;
    getCitiesPaginated(page: bigint, pageSize: bigint): Promise<Array<GeonameCity>>;
    getCity(name: string): Promise<GeonameCity | null>;
    getCityAlbum(city: string): Promise<CityAlbum | null>;
    getCityAlbumForPopup(city: string): Promise<CityAlbum | null>;
    getCityComments(city: string): Promise<Array<string>>;
    getCityFontSize(): Promise<number>;
    getCityMediaFiles(city: string): Promise<Array<MediaFile>>;
    getCityRating(city: string): Promise<CityRating | null>;
    getCityRatingForPopup(city: string): Promise<number | null>;
    getCitySocialMediaLinks(city: string): Promise<Array<SocialMediaLink>>;
    getCombinedVibesSummaryByCity(): Promise<Array<[string, bigint, bigint]>>;
    getCountryCoordinates(countryName: string): Promise<[number, number] | null>;
    getDisplaySettings(): Promise<boolean | null>;
    getFileReference(path: string): Promise<FileReference>;
    getJourney(city: string): Promise<Journey | null>;
    getJourneyScheduleWithDays(journeyCity: string): Promise<Array<[string, Array<ScheduleItem>]>>;
    getLiveJourneys(): Promise<Array<Journey>>;
    getLocationInfo(name: string): Promise<LocationInfo | null>;
    getMapBookmarkByCoordinates(coordinates: [number, number]): Promise<MapBookmark | null>;
    getMapBookmarks(): Promise<Array<MapBookmark>>;
    getMapBookmarksByCity(city: string): Promise<Array<MapBookmark>>;
    getMusicAlbum(title: string): Promise<MusicAlbum | null>;
    getMusicAlbumSongs(title: string): Promise<Array<Song>>;
    getPreviousJourneys(): Promise<Array<Journey>>;
    getRippleSize(): Promise<number>;
    getScheduleItems(journeyCity: string): Promise<Array<ScheduleItem>>;
    getScheduleItemsWithCoordinatesByJourney(journeyCity: string): Promise<Array<[ScheduleItem, [number, number]]>>;
    getTimezoneGeoJson(): Promise<string>;
    getTravelSpotMediaFiles(city: string, spotName: string): Promise<Array<MediaFile>>;
    getTravelSpotSocialMediaLinks(city: string, spotName: string): Promise<Array<SocialMediaLink>>;
    getTravelSpotSummaryByCity(): Promise<Array<[string, bigint]>>;
    getTravelSpotTypeBreakdown(city: string): Promise<Array<[string, bigint]>>;
    getTravelSpotTypes(): Promise<Array<string>>;
    getTravelSpots(city: string): Promise<Array<TravelSpot>>;
    getTravelSpotsByCityAndType(city: string, spotType: string): Promise<Array<TravelSpot>>;
    getUpcomingJourneys(): Promise<Array<Journey>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVibesByCity(): Promise<Array<[string, Array<VibeItem>]>>;
    getWebsiteLayoutSettings(): Promise<WebsiteLayoutSettings | null>;
    importCities(cities: Array<GeonameCity>): Promise<void>;
    initializeAccessControl(): Promise<void>;
    initializeCoordinates(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listFileReferences(): Promise<Array<FileReference>>;
    registerFileReference(path: string, hash: string): Promise<void>;
    removeMediaFromCityAlbum(city: string, mediaPath: string): Promise<boolean>;
    removeMediaFromTravelSpot(city: string, spotName: string, mediaPath: string): Promise<boolean>;
    removeSocialMediaLinkFromCityAlbum(city: string, url: string): Promise<boolean>;
    removeSocialMediaLinkFromTravelSpot(city: string, spotName: string, url: string): Promise<boolean>;
    removeSongFromMusicAlbum(title: string, songTitle: string): Promise<boolean>;
    reorderScheduleItems(journeyCity: string, newOrder: Array<ScheduleItem>): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchCities(searchTerm: string, page: bigint, pageSize: bigint): Promise<Array<GeonameCity>>;
    setTimezoneGeoJson(json: string): Promise<void>;
    updateCity(name: string, city: GeonameCity): Promise<boolean>;
    updateCityAlbum(city: string, mediaFiles: Array<MediaFile>, socialMediaLinks: Array<SocialMediaLink>): Promise<boolean>;
    updateCityRating(city: string, rating: number, comment: string): Promise<boolean>;
    updateDashboard(): Promise<Array<[string, bigint, bigint]>>;
    updateJourney(city: string, startDate: Time, endDate: Time): Promise<boolean>;
    updateLocationInfo(name: string, photoPath: string | null): Promise<boolean>;
    updateMapBookmark(coordinates: [number, number], name: string, description: string, city: string): Promise<boolean>;
    updateMusicAlbum(title: string, description: string, songs: Array<Song>): Promise<boolean>;
    updateScheduleItem(journeyCity: string, date: Time, time: string, location: string, activity: string): Promise<boolean>;
    updateTravelSpot(city: string, name: string, description: string | null, coordinates: [number, number], spotType: string, rating: number): Promise<boolean>;
    updateWebsiteLayoutSettings(showMusicPlayerBar: boolean, defaultSearchPlace: string, showAllTravelSpots: boolean, rippleSize: number, cityFontSize: number): Promise<boolean>;
}
