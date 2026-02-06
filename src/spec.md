# Chill Travel Around the Globe

## Overview
Prepare your next trip and note down your precious travel memories

A web application that allows users to search for countries, cities, and towns by name, displays an interactive map of the selected location with fixed-size plain red text visualization, and shows media from the Travel Album when clicking on location pins. The application includes an admin control panel for managing trip journeys, travel spot features for managing travel spots within cities with their own media galleries and social media videos, a music album feature for uploading and organizing personal music collections, and website layout controls including map settings. Users must authenticate via Internet Identity to access certain features. The application features a horizontal music player bar at the bottom of the website for playing uploaded songs, with elegant display of all song details and user-controlled visibility. Before searching, users are presented with a fullscreen, ultra-clear 3D interactive globe using Three.js with high-resolution textures and vector overlays. Users can switch between 3D globe and 2D map views at any time using toggle buttons positioned within the search bar. A dedicated Music icon in the upper right corner provides quick access to the music library and song selection. The 2D map includes a click-to-bookmark feature that creates star-shaped bookmark markers at any location where the user clicks on the map, with a modern, minimal "+ Bookmark" button that appears with a visually appealing design featuring subtle shadows, rounded corners, a color scheme that matches the app's overall aesthetic, and a pointer cursor when hovered to clearly indicate it is clickable and interactive. The search bar includes a grey magnifier icon positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative. The search bar is positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance. Below the search bar, three buttons (City, Show Time Zones, and World) are positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment. The City button includes a collapsible "World Travel Hotspot" panel that appears when users hover or click the button, but the panel is repositioned to the bottom of the UI page along the lower edge. The "Show Time Zones" button displays a time logo icon and opens a "UTC Offset" panel when activated, with the panel positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance. The "World" button opens a collapsible panel that contains the "3D Rotation Speed" and "3D Country Font Size" sliders, but these slider panels are repositioned to the bottom of the UI page along the lower edge. All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning. The application includes Day/Night Terminator and Day/Night Visualization panels repositioned to the bottom of the UI page along the lower edge with simplified appearance achieved by removing the outer container layer and keeping only the inner content layer visible while preserving all functionality and styles.

## Core Features

### 3D Interactive Globe
- Fullscreen 3D interactive globe displayed before any search is performed using Three.js
- Ultra-clear visualization with high-resolution raster textures and vector tile overlays
- Hybrid raster-and-vector approach:
  - 4K+ diffuse map and bump map for the base globe surface
  - Vector tiles overlay (from MapLibre GL or similar) for borders, coastlines, and city/country labels
  - Perfect sharpness at all zoom levels with crisp, legible labels
- Level of Detail (LOD) system that displays more detailed vector tiles and labels as users zoom in
- Smooth orbit controls allowing users to rotate and zoom the globe
- Anti-aliasing enabled for polished, professional appearance
- Interactive experience with smooth navigation and responsive controls
- Seamless transition from 3D globe to regular map explorer view when search is performed
- Globe disappears and is replaced by the map view after successful search submission
- Globe reappears when the page is refreshed or when no search has been performed
- "3D Rotation Speed" and "3D Country Font Size" sliders accessible through the "World" button, but the slider panels are repositioned to the bottom of the UI page along the lower edge
- Both sliders maintain their original functionality, styles, and interactive bindings to control 3D globe behavior
- All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
- Sliders preserve all existing behavior and maintain full operational integrity

### Bottom Control Panels
- Day/Night Terminator and Day/Night Visualization panels repositioned to the bottom of the UI page along the lower edge with simplified appearance
- Both panels maintain their alignment, functionality, and styles exactly as before with simplified appearance
- Simplified appearance achieved by removing the outer container layer and keeping only the inner content layer visible while preserving all functionality
- Day/Night Terminator panel maintains all existing functionality including:
  - Yellow "Terminator" button with current styles, interactions, and functionality for toggling day/night visualization on the 3D globe
  - Purple "Twilight" button with current styles, interactions, and functionality for toggling day/night visualization on the 3D globe
  - "Real" button (renamed from "Real Time") with current styles, interactions, and functionality for real-time day/night visualization on the 3D globe
  - All terminator and twilight functionality remains fully operational for 3D globe day/night visualization
  - 3D globe rendering, lighting behavior, and all related time or terminator features remain unaffected
  - All existing visual styling, color schemes, and interactive behaviors are preserved
- Day/Night Visualization panel maintains all existing functionality and controls
- Both panels are positioned at the bottom of the UI page to minimize visual obstruction of the 3D globe
- Bottom positioning ensures panels do not interfere with other UI elements
- Panels remain accessible and functional throughout the application experience

### View Toggle Controls
- Two small toggle buttons labeled "3D" and "2D" positioned within the search bar
- Toggle buttons are visually integrated into the search bar design for easy access and user-friendly interface
- Toggle buttons allow users to switch between the 3D interactive globe and the 2D map view at any time
- UI updates instantly when toggling between 3D and 2D modes for seamless user experience
- Toggle state is maintained independently of search functionality
- Users can switch to 3D mode to view the interactive globe even after performing searches
- When the "2D" button is clicked, automatically performs a search for Zurich and displays the 2D map view centered on that location
- Toggle buttons remain accessible and functional throughout the application experience
- Clear visual indication of which mode is currently active (3D or 2D)
- Smooth transitions between 3D globe and 2D map views when toggling
- Search bar and toggle buttons maintain visual integration and user-friendly design
- 3D button includes tooltip/help information accessible via hover or focus displaying: "Interactive 3D Globe with Personalized Travel Map" followed by "Drag to rotate • Scroll to zoom • Click country to highlight • Click ocean to deselect Animated arcs from zurich to your traveled cities Watch for start city labels, ripple effects, and arrival city labels when arcs animate!"
- 2D button includes tooltip/help information accessible via hover or focus displaying relevant 2D map functionality and search capabilities
- Toggle buttons have grey color styling for visual distinction from the white search bar background

### Search Bar and Control Buttons
- Search bar positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
- Grey magnifier icon positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative
- Search description and details accessible through the toggle button tooltips for contextual help
- Submit functionality triggered by pressing Enter key only
- Three buttons positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment: City, Show Time Zones, and World
- City button features collapsible "World Travel Hotspot" panel functionality, but the panel is repositioned to the bottom of the UI page along the lower edge
- "World Travel Hotspot" panel appears at the bottom of the UI page when the City button is activated
- "World Travel Hotspot" panel maintains all existing functionality including:
  - Capitals toggle for displaying capital cities on the 3D globe
  - Global Cities toggle for displaying major global cities on the 3D globe
  - Major Cities toggle for displaying major cities on the 3D globe
  - All toggle controls preserve their original behavior and city display functionality
- "World Travel Hotspot" panel positioning at the bottom ensures it does not interfere with other UI elements
- "World Travel Hotspot" panel can be collapsed by clicking elsewhere or re-clicking the City button
- City button preserves all current functionality without changing its layout or behavior
- 3D globe rendering, initialization, and city display layers remain completely unaffected and fully functional
- "Show Time Zones" button positioned below the City button with consistent sizing and vertical alignment
- "Show Time Zones" button displays a time logo icon while maintaining its current size and layout
- "Show Time Zones" button maintains its click functionality and preserves all current behavior
- "UTC Offset" panel appears when the "Show Time Zones" button is activated, positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance
- "UTC Offset" panel maintains its current design, alignment, and interactivity consistent with the existing layout
- "UTC Offset" panel positioning ensures it does not interfere with other UI elements
- "UTC Offset" panel can be collapsed by clicking elsewhere or re-clicking the "Show Time Zones" button
- "World" button positioned below the "Show Time Zones" button with consistent sizing and vertical alignment
- World collapsible panel contains the "3D Rotation Speed" and "3D Country Font Size" sliders, but these slider panels are repositioned to the bottom of the UI page along the lower edge
- World collapsible slider panels appear at the bottom of the UI page when the World button is activated
- World collapsible slider panels positioning ensures they do not interfere with other UI elements
- World collapsible slider panels can be collapsed by clicking elsewhere or re-clicking the "World" button
- "3D Rotation Speed" and "3D Country Font Size" sliders within the repositioned panels maintain all existing functionality and event handling
- Visual consistency is preserved for the sliders within the repositioned panels
- Layout integration ensures proper visual hierarchy while maintaining operational integrity
- All slider controls and functionality work exactly as before, just relocated to the bottom positioning
- All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
- Layout preserves current design and maintains responsiveness across all screen sizes
- Support for location name input in English
- Robust location name matching that handles variations in spelling and formatting
- Support for common alternative names and abbreviations for cities and towns
- Clear error messaging when a location is not found or recognized
- Search validation to ensure proper location identification
- 3D globe displayed in fullscreen before any search is performed
- Map view appears directly after successful search, replacing the 3D globe without any placeholder content
- Search functionality works in both 3D and 2D modes
- Automatic search for Zurich when "2D" toggle button is clicked, displaying 2D map view centered on that location

### Authentication System
- Internet Identity integration for user authentication
- Authentication button positioned directly below the Website Layout button in the upper right corner vertical button stack
- Authentication button maintains the same style, interaction, and functionality as before
- Authentication button positioning preserves the visual consistency and even spacing of the vertical button stack
- Clear authentication status indicators showing whether user is logged in or not
- Login prompts and feedback messages for authentication process
- Secure session management across browser sessions
- Authentication required for uploading content to Travel Spot media, travel spot social media videos, and Music Album
- Guest users can browse and search locations but cannot upload media, music, or social media content

### Click-to-Bookmark Feature
- Click-to-bookmark functionality available on the 2D map view
- Map click event handler using Leaflet's map.on('click', ...) method
- Event handler receives the click event object and extracts e.latlng coordinates
- Creates a new star-shaped bookmark marker at the exact clicked location
- Marker is added to the map using .addTo(map) method
- Modern, minimal "+ Bookmark" button appears when user left-clicks on the map to add a bookmark
- "+ Bookmark" button features visually appealing design with:
  - Subtle shadow for depth and visual separation from map background
  - Rounded corners for modern, friendly appearance
  - Light blue or ivory color scheme that matches the app's overall aesthetic
  - Soft border for refined appearance
  - Star or bookmark icon to clearly indicate functionality
  - Modern typography and minimal design approach
  - Easy clickability with appropriate button size and hover states
  - Pointer cursor (cursor: pointer) when hovered to clearly indicate it is clickable and interactive
  - Clear visual distinction from other map elements including travel spot pins and search location text
- Popup is bound to the marker displaying the coordinates or custom message
- Popup opens immediately after marker placement
- Star-shaped bookmark markers are visually distinct from travel spot pins and search location text
- Click-to-bookmark feature works anywhere on the map surface
- Multiple bookmark markers can be placed by clicking different locations
- Bookmark markers persist until the page is refreshed or map is reset

### Interactive Map Display
- Display interactive map of the searched location
- Map automatically centers on the selected location with zoom level 15 for every search
- Every search result always sets the map zoom level to 15, regardless of previous or subsequent searches
- Map preserves user's manual zoom and pan adjustments without automatic re-centering until a new search is performed
- User zoom and pan actions are never interrupted by automatic map adjustments
- Map remains at the user's chosen view and zoom level until a new search is performed
- Unlimited zoom in and zoom out controls with no restrictions on zoom levels
- Map remains fully interactive for panning and zooming at all times after a search
- Users can freely zoom beyond the initially preset zoom level after searching for a place
- High-resolution map rendering
- Map updates when a new location is searched
- Proper geographic boundaries and positioning for all supported locations
- Zoom level 15 is consistently applied for all location types (countries, cities, and towns) to provide a closer view of the searched location
- Fixed-size plain red text visualization for searched places:
  - Searched place name displayed as plain red text positioned directly at the searched location coordinates
  - Text maintains consistent visual size regardless of current map zoom level
  - Text size remains completely fixed and does not scale with map zoom operations
  - Text appears at the same visual size whether zooming in to level 20 or zooming out to level 5
  - Text size is locked to a fixed pixel size that never changes based on map zoom level
  - Text is clearly visible and styled for clarity with red color
  - Text appears at the exact searched coordinates without any background, rectangle, or connection line
  - Only the plain red text is used for displaying the searched location name
  - Text replaces any previous icon, label, rectangle, or line overlays for the searched place
  - Text is non-interactive and does not respond to clicks or hover events
  - Fixed-size behavior applies only to the red text label for searched locations and does not affect other map elements
- Display additional travel spot pins for the searched city using the original travel spot visualization system:
  - Travel spot pins positioned at the exact real-world geographic coordinates of each specific travel spot location
  - Travel spot pins use geocoding to determine precise coordinates based on the travel spot name and city, matching the same accuracy as when searching for that location directly
  - Travel spot pins are clickable and display popup information about the specific travel spot
  - Travel spot pins use the original pin/marker style, not the plain red text visualization
  - Travel spot pins remain at their original size (not enlarged)

### Left-Side Info Box Display
- Left-side info box appears after performing a search
- Info box displays only the world logo and the searched location name
- Info box does not display the type of search (country, city, town, etc.)
- Info box maintains clean, minimal appearance focused on the location name
- Info box positioning and styling remain consistent with the overall application design
- Info box functionality does not affect any other map or search display features

### Interactive Pin Popups with Travel Album Media Display
- Travel spot pins display popups when clicked, showing travel spot specific information
- Travel spot popups are sized to match standard popup dimensions for consistent appearance
- Travel spot popups display the travel spot name as the main title, immediately followed by the travel spot type positioned to the right of the place name
- Travel spot popups display the travel spot description if provided below the name and type
- Travel spot popups display media gallery showing all photos, videos, and social media videos uploaded specifically for that travel spot with guaranteed reliable loading and proper display
- Travel spot media gallery is organized into three distinct tabs positioned side by side in horizontal order:
  - "Social Media" tab displaying embedded YouTube and Instagram videos uploaded for that specific travel spot with proper embedding and playable functionality directly within the popup
  - "Photos" tab displaying all images (JPEG, PNG, WebP, AVIF) uploaded for that specific travel spot with reliable loading and proper display
  - "Videos" tab displaying all videos (MP4, MOV) uploaded for that specific travel spot with reliable loading and proper display
  - Tab interface allows easy switching between social media, photos, and videos content without scrolling
  - Clear visual separation between social media, photos, and videos tabs with intuitive tab navigation
- Travel spot media files are displayed without showing file format information
- Travel spot media gallery shows all images, videos, and social media content associated with the specific travel spot with correct URLs and reliable loading
- Travel spot photos and videos display correctly with proper aspect ratios and are fully visible without being blacked out, corrupted, or stuck in loading state
- Travel spot social media videos are embedded and displayed properly within the Social Media tab with reliable loading and proper playback functionality directly within the popup
- Travel spot social media videos can be played directly within the popup without leaving the application
- Travel spot videos are fully interactive with audio enabled by default, ensuring proper playback functionality when clicked
- Travel spot video elements are not muted or blocked, allowing for complete audio-visual experience
- Travel spot media display supports both portrait and landscape orientations with correct aspect ratio preservation
- Travel spot popup automatically updates to reflect any new media or social media videos added to that travel spot
- Travel spot media gallery reliably handles loading states and successfully transitions from loading to displaying actual media content
- When a user clicks on an image within the travel spot popup, the image opens in a "lovely album" style fullscreen viewer showing only that travel spot's photos
- When a user clicks on a video within the travel spot popup, the video plays correctly with full audio and interactive controls enabled
- When a user clicks on a social media video within the travel spot popup, the video expands to a larger view for immersive playback similar to the photo gallery experience
- Travel spot popups include a tiny "X" close button for manual closure
- Travel spot popups appear to the right of the pin with proper positioning and alignment

### Music Panel Access
- Music icon positioned in the upper right corner of the application at the same level as the admin control panel and authentication button
- Music icon provides quick access to the music library without needing to navigate through the admin panel
- When clicked, the Music icon opens a dedicated music panel that displays the user's music albums and songs
- Music panel shows all uploaded music albums organized in a clear, accessible format
- Music panel displays songs within each album with song titles, artist information (if available), and album association
- Users can click on any song in the music panel to immediately change the currently playing song in the bottom music player bar with smooth and responsive playback
- Song selection from the music panel updates the bottom music player bar to play the selected song immediately and responsively
- Music panel provides an alternative way to browse and select music without accessing the full admin control panel
- Music panel maintains the same authentication requirements as the Music Album section in the admin panel
- Non-authenticated users see appropriate messaging when attempting to access the music panel
- Music panel integrates seamlessly with the existing music playback system and bottom music player bar

### Bottom Music Player Bar
- Horizontal, ultra-slim music player bar positioned at the bottom of the website with height reduced by approximately 3 times from the original design, making it as thin as possible while maintaining usability
- Music player bar remains visible and accessible at all times while browsing the application
- Music player bar displays above all other content with proper z-index layering
- Music player bar plays songs uploaded to the Music Album panel
- Music player bar visibility can be controlled by users through the Website Layout panel in the admin control
- Music player bar features light blue color scheme for a more visually appealing look with cozy, inviting design elements:
  - Light blue color palette with complementary tones for a fresh, appealing appearance
  - Rounded corners throughout the interface for a gentle, welcoming appearance
  - Minimalist icons with clean, simple designs
  - Smooth gradients and subtle shadows for depth
  - Typography that feels warm and approachable
  - Overall design that evokes a pleasant, modern aesthetic with light blue theming
- Music player controls include:
  - Play/pause button for current song playback control with minimalist light blue-themed icon
  - Skip forward button to advance to the next song in the current album or playlist with elegant rounded design
  - Skip backward button to go to the previous song in the current album or playlist with elegant rounded design
  - Volume control slider for adjusting playback volume with soft, rounded styling in light blue theme
  - Progress bar showing current playback position and allowing users to seek to different positions in the song with smooth, light blue-inspired design
- Music player display shows all song details elegantly in a clean and attractive light blue-themed layout:
  - Current song title if available from uploaded metadata, displayed with readable typography
  - Current song artist if available from uploaded metadata, displayed with complementary styling
  - Album name if the song is part of an album, integrated seamlessly into the design
  - Playback time display showing current time and total duration with clean, minimalist formatting
  - All song information displayed in an elegant, well-organized format that maintains the light blue aesthetic and visual appeal
  - Visual balance between song details and controls for optimal user experience
- Music player automatically loads and plays songs from the user's Music Album collection
- Music player supports continuous playback through albums and playlists
- Music player maintains playback state across different pages and sections of the application
- Music player provides visual feedback for current playback status (playing, paused, loading) with light blue-themed indicators
- Music player handles audio file loading and buffering smoothly
- Music player supports all uploaded audio formats (MP3, WAV, FLAC, AAC)
- Music player integrates seamlessly with the Music Album management system and the dedicated Music panel
- Music player allows users to control music playback without needing to access the admin panel
- Music player bar design matches the overall application aesthetic while incorporating the light blue theme
- Music player bar is responsive and adapts to different screen sizes while maintaining its ultra-slim profile
- Music player functionality is only available when user has uploaded songs to their Music Album
- Music player updates immediately when a song is selected from the dedicated Music panel with smooth and responsive playback

### Admin Control Panel
- Admin control panel positioned in the upper right corner of the website with a horizontal lines icon (Menu/Align Justify style) for a minimal look
- Panel must always appear above the map and remain fully accessible, regardless of map interactions or overlays
- Panel includes main sections arranged in a vertical accordion-style menu: "Trip Management", "Travel Spot", and "Music Album"
- Each panel expands only when clicked, creating an accordion-style interface
- Only one panel can be expanded at a time, with others collapsing when a new one is selected

#### Trip Management
- Trip Management section allows users to manage travel journeys
- Journey management includes:
  - Add new journey entries with a fully functional "+Journey" button that consistently and reliably opens the journey creation dialog every time it is clicked
  - Edit existing journey entries
  - Delete journey entries
- The "+Journey" button must be completely responsive and unblocked by any UI state or component interference
- Journey creation dialog must open immediately when the "+Journey" button is clicked without any delays or failures
- Dialog must be properly positioned and visible above all other UI elements
- Each journey entry contains:
  - City name
  - Travel period with start date and end date
- Journey creation allows users to add both upcoming and previous journeys by:
  - Allowing start and end dates to be set in the past or future
  - Automatically categorizing journeys based on their dates
- Journey display organized into two sections:
  - "Upcoming" journeys (journeys with start dates in the future)
  - "Previous" journeys (journeys with end dates in the past)
- Automatic categorization of journeys based on dates:
  - Journeys with start dates in the future are categorized as "Upcoming"
  - Journeys with end dates in the past are categorized as "Previous"
- Clear list format for displaying all journeys
- Journey data persists across sessions

#### Travel Spot Management
- Travel Spot section within the admin panel
- City selection interface that includes:
  - "Existing Cities" button list displaying all cities that have been previously used in the system
  - "Enter City Name" input field for typing in new city names
- Interface for adding new travel spots within the selected city including:
  - Travel spot type input field (required field) for entering the travel spot type as free text
  - Travel spot type input field includes placeholder text or description specifying the recommended types: "Hotel, Restaurant, Shopping, Heritage, Relax, Others"
  - Travel spot name (required field)
  - Travel spot description (optional field)
  - Media upload functionality for travel spots allowing authenticated users to upload photos and videos specifically for each travel spot
  - Social media videos functionality for travel spots allowing authenticated users to add YouTube and Instagram video links specifically for each travel spot
  - Save functionality to store the travel spot associated with the selected city
- Travel spot media upload functionality including:
  - Reliable upload functionality for multiple media files for each travel spot including images in JPEG, PNG, WebP, and AVIF formats and videos in MP4 and MOV formats
  - Robust file upload process that handles media files smoothly without errors for authenticated users
  - Proper file validation that accepts valid JPEG, PNG, WebP, AVIF, MP4, and MOV files and provides clear error messages for invalid files
  - Upload progress indicators and success/error feedback for media file uploads
  - Media files are correctly associated with the specific travel spot and user identity
  - Support for multiple media files per travel spot with reliable storage and retrieval
  - Media files are persistently stored in the backend and associated with the specific travel spot
- Travel spot social media videos functionality including:
  - Clear and prominent social media link input area positioned below the Travel Spot Media field with dedicated interface for adding YouTube and Instagram video links
  - Separate input field specifically for YouTube video URLs with clear labeling
  - Separate input field specifically for Instagram video URLs with clear labeling
  - "Add YouTube Link" button with proper validation and feedback
  - "Add Instagram Link" button with proper validation and feedback
  - URL validation that ensures only valid YouTube and Instagram video links are accepted
  - Clear success messages when social media links are successfully added
  - Clear error messages for invalid URLs or unsupported social media platforms
  - Visual confirmation showing the added social media links in the interface
  - Real-time URL validation and clear feedback
  - Social media link management functionality for adding, viewing, editing, and removing social media links with clear visual distinction between platforms
  - Social media links are correctly associated with the specific travel spot and user identity
  - Support for multiple social media links per travel spot with reliable storage and retrieval
  - Social media links are persistently stored in the backend and associated with the specific travel spot
- Travel spot type input field is positioned above the spot name input field in the "Add New Travel Spot" form
- Travel spot type input field is always enabled and accepts any text input for the travel spot type
- Interface for viewing all travel spots associated with the selected city in a list format showing type, name, description, media count, and social media video count
- Travel spot media gallery view displaying all uploaded media and social media videos for each travel spot with reliable photo and video display
- Interface for editing existing travel spots including:
  - Modify travel spot type using the same text input field with placeholder text showing recommended types
  - Modify travel spot name
  - Modify travel spot description
  - Manage travel spot media (view, upload additional, delete individual files)
  - Manage travel spot social media videos (view, add additional, edit, delete individual links)
  - Save changes functionality
- Interface for deleting travel spots with confirmation dialog
- Travel spot data including type, media, and social media videos persists across sessions and is properly saved and displayed
- Travel spots are associated with their respective cities
- Clear list display showing all travel spots for the selected city with type, name, description, media information, and social media video information
- Form validation to ensure travel spot name and type are provided
- Success and error feedback for travel spot operations (add, edit, delete, media upload, social media video management)
- Travel spot pins appear on the map at the exact real-world geographic coordinates of each specific travel spot location using geocoding
- Travel spot pins are positioned with the same accuracy as when searching for that specific location directly in the main search
- Selected travel spot type is properly saved to the backend and displayed in the travel spot list and on map popups
- Travel spot media management functionality including:
  - View uploaded images, videos, and social media videos in a comprehensive layout that properly displays both portrait and landscape orientations
  - Delete individual media files and social media videos from travel spots
  - Replace existing media files with new uploads
  - Edit or update existing social media links
  - Clear visual distinction between images, videos, and social media videos in the travel spot gallery
- Uploaded media files and social media videos are visible both in the admin panel travel spot gallery and in the map popup for that travel spot
- Travel spot media and social media videos are persistently stored and retrieved from the backend with reliable URL generation

#### Music Album
- Music Album section as a main panel at the same level as Trip Management and Travel Spot
- Authentication required: only logged-in users can upload songs and manage music albums
- Allow authenticated users to create and manage personal music albums
- Music upload functionality including:
  - Support for common audio formats (MP3, WAV, FLAC, AAC)
  - Reliable upload process for multiple music files
  - Batch upload support allowing users to upload multiple music files at once to a music album
  - Proper file validation for supported audio formats
  - Upload progress indicators and success/error feedback
- Music album organization features:
  - Create custom album collections with a fully functional "+ Create Album" button that responds reliably and consistently opens the album creation dialog every time it is clicked
  - Add album titles and descriptions
  - Organize songs into different albums
  - Album cover image upload functionality
- Album creation dialog must open immediately when the "+ Create Album" button is clicked without any delays or failures
- Dialog must be properly positioned and visible above all other UI elements
- The "+ Create Album" button must be completely responsive and unblocked by any UI state or component interference
- Music metadata management:
  - Song title field (optional) for uploaded music files
  - Artist field (optional) for uploaded music files
  - Album association for organizing songs
  - Automatic metadata extraction from uploaded files when available
- Music playback functionality:
  - Built-in audio player for uploaded songs within the admin panel
  - Play, pause, skip controls
  - Volume control
  - Track progress display
  - Integration with bottom music player bar for continuous playback
- Music management features:
  - View all uploaded songs in a comprehensive library
  - Edit song metadata (title, artist, album) with optional fields
  - Delete individual songs or entire albums
  - Search and filter functionality for music library
  - Display all uploaded songs within each album
- Song upload functionality that allows users to upload songs to albums without errors
- Batch song upload functionality that allows users to select and upload multiple songs simultaneously to an album
- Smooth upload and management of songs with clear feedback on success or failure
- Reliable song upload process with proper error handling and recovery mechanisms
- Clear success and error messages for song upload operations
- Music data persistence:
  - All uploaded songs and album data persist across sessions
  - User-specific music collections
  - Reliable storage and retrieval of audio files
  - Optional metadata storage for song titles and artists
- Clear messaging for non-authenticated users attempting to access music upload functionality
- Music album integration with bottom music player bar for seamless playback experience
- Music album integration with the dedicated Music panel for quick song selection

### User Interface
- Clean, simple interface with search bar positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
- Grey magnifier icon positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative
- Search bar with contextual help accessible through toggle button tooltips
- Two small toggle buttons labeled "3D" and "2D" positioned within the search bar with grey color styling for visual distinction from the white search bar background
- Three buttons positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment: City, Show Time Zones, and World
- City button features collapsible "World Travel Hotspot" panel, but the panel is repositioned to the bottom of the UI page along the lower edge
- "World Travel Hotspot" panel appears at the bottom of the UI page when the City button is activated
- "World Travel Hotspot" panel maintains all existing functionality including Capitals, Global Cities, and Major Cities toggles
- "World Travel Hotspot" panel positioning at the bottom ensures it does not interfere with other UI elements
- "World Travel Hotspot" panel can be collapsed by clicking elsewhere or re-clicking the City button
- City button preserves all current functionality without changing its layout or behavior
- "Show Time Zones" button positioned below the City button with consistent sizing and vertical alignment
- "Show Time Zones" button displays a time logo icon while maintaining its current size and layout
- "Show Time Zones" button maintains its click functionality and preserves all current behavior
- "UTC Offset" panel appears when the "Show Time Zones" button is activated, positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance
- "UTC Offset" panel maintains its current design, alignment, and interactivity consistent with the existing layout
- "UTC Offset" panel positioning ensures it does not interfere with other UI elements
- "UTC Offset" panel can be collapsed by clicking elsewhere or re-clicking the "Show Time Zones" button
- "World" button positioned below the "Show Time Zones" button with consistent sizing and vertical alignment
- World collapsible panel contains the "3D Rotation Speed" and "3D Country Font Size" sliders, but these slider panels are repositioned to the bottom of the UI page along the lower edge
- World collapsible slider panels appear at the bottom of the UI page when the World button is activated
- World collapsible slider panels positioning ensures they do not interfere with other UI elements
- World collapsible slider panels can be collapsed by clicking elsewhere or re-clicking the "World" button
- All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
- Layout preserves current design and maintains responsiveness across all screen sizes
- Toggle buttons are visually integrated into the search bar design for easy access and user-friendly interface
- Toggle buttons allow instant switching between 3D interactive globe and 2D map view
- Clear visual indication of which mode is currently active (3D or 2D)
- Smooth transitions between 3D globe and 2D map views when toggling
- Toggle buttons remain accessible and functional throughout the application experience
- Automatic search for Zurich when "2D" toggle button is clicked, displaying 2D map view centered on that location
- Search bar and toggle buttons maintain visual integration and user-friendly design
- 3D button tooltip displays: "Interactive 3D Globe with Personalized Travel Map" followed by "Drag to rotate • Scroll to zoom • Click country to highlight • Click ocean to deselect Animated arcs from zurich to your traveled cities Watch for start city labels, ripple effects, and arrival city labels when arcs animate!"
- 2D button tooltip displays relevant 2D map functionality and search capabilities
- Click-to-bookmark interface accessible on the 2D map
- Map click event handling that creates star-shaped bookmark markers at clicked locations
- Modern, minimal "+ Bookmark" button that appears when user left-clicks on the map with visually appealing design featuring:
  - Subtle shadow for depth and visual separation from map background
  - Rounded corners for modern, friendly appearance
  - Light blue or ivory color scheme that matches the app's overall aesthetic
  - Soft border for refined appearance
  - Star or bookmark icon to clearly indicate functionality
  - Modern typography and minimal design approach
  - Easy clickability with appropriate button size and hover states
  - Pointer cursor (cursor: pointer) when hovered to clearly indicate it is clickable and interactive
  - Clear visual distinction from other map elements including travel spot pins and search location text
- Star-shaped bookmark markers visually distinct from travel spot pins and search location text
- Fullscreen 3D interactive globe displayed before any search is performed using Three.js
- 3D globe component that takes up the main display area before search
- Map component that takes up main display area after search is performed
- Seamless transition from 3D globe to map view when search is submitted
- Map view appears directly after successful search, replacing the 3D globe without any placeholder content or "Ready to Explore" messaging
- Left-side info box that appears after searching displays only the world logo and the searched location name, without showing the type of search (country, city, town, etc.)
- Left-side info box maintains clean, minimal appearance focused on the location name
- Left-side info box positioning and styling remain consistent with the overall application design
- Bottom control panels containing Day/Night Terminator and Day/Night Visualization panels repositioned to the bottom of the UI page along the lower edge with simplified appearance
- Day/Night Terminator and Day/Night Visualization panels maintain their alignment, functionality, and styles exactly as before with simplified appearance
- Simplified appearance achieved by removing the outer container layer and keeping only the inner content layer visible while preserving all functionality
- Day/Night Terminator panel includes "Real" button (renamed from "Real Time") with all existing functionality
- Bottom positioning does not interfere with other UI elements or panels
- Authentication button positioned directly below the Website Layout button in the upper right corner vertical button stack
- Authentication button maintains the same style, interaction, and functionality as before
- Authentication button positioning preserves the visual consistency and even spacing of the vertical button stack
- Admin control panel positioned in upper right corner with horizontal lines icon for minimal aesthetic
- Music icon positioned in upper right corner at the same level as the admin control panel and authentication button for quick music access
- Admin control panel must always appear above the map with proper z-index layering to ensure full accessibility
- Admin control panel organized into main sections arranged in a vertical accordion-style menu: "Trip Management", "Travel Spot", and "Music Album"
- Each panel expands only when clicked, creating an accordion-style interface where only one panel can be expanded at a time
- Clear visual separation between Trip Management, Travel Spot, and Music Album sections
- Music panel interface that opens when the Music icon is clicked, displaying music albums and songs in an organized format
- Music panel song selection interface that allows users to click on any song to change the currently playing song in the music player with smooth and responsive playback
- Music panel integration with the bottom music player bar for immediate song switching
- Bottom music player bar positioned at the bottom of the website with proper z-index layering
- Music player bar remains visible and accessible at all times while browsing the application (when enabled)
- Music player bar can be shown or hidden based on user preference set in the Display Settings section of the Website Layout panel
- Ultra-slim music player bar design with height reduced by approximately 3 times from the original, making it as thin as possible while maintaining usability
- Music player bar features light blue color scheme for a more visually appealing look with cozy, inviting design elements:
  - Light blue color palette with complementary tones for a fresh, appealing appearance
  - Rounded corners throughout the interface for a gentle, welcoming appearance
  - Minimalist icons with clean, simple designs that complement the light blue theme
  - Smooth gradients and subtle shadows for visual depth
  - Typography that feels modern and approachable, matching the light blue aesthetics
  - Overall design that creates a pleasant, modern aesthetic with light blue theming
- Music player bar displays all song details (title, artist, album) elegantly in a clean and attractive light blue-themed layout with visual balance between song information and controls
- Music player bar is responsive to different screen sizes while maintaining its ultra-slim profile and light blue aesthetic
- Responsive design for different screen sizes
- User feedback messages for search results (success/error states)
- Loading indicators during map updates
- Authentication status display showing login/logout state
- Login prompts and feedback for authentication process
- Travel spot popups that appear when travel spot pins are clicked with clear, visible styling
- Travel spot popup positioning to the right of pins with dynamic adjustment to ensure proper alignment
- Travel spot popup interface displaying travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below, and travel spot media gallery with social media, photos, and videos tabs in horizontal order
- Tab interface for travel spot media gallery allowing easy switching between social media, photos, and videos content without scrolling
- Social media tab displaying embedded YouTube and Instagram videos with proper embedding and playable functionality directly within the popup that updates automatically when new social media links are added
- Embedded video players in the Social Media tab that allow direct playback without leaving the application
- Travel spot video elements that are fully interactive with audio enabled by default, not muted or blocked
- Clickable images within travel spot popup that open in lovely album style fullscreen viewer for immersive photo browsing
- Clickable social media videos within travel spot popup that expand to a larger view for immersive playback similar to the photo/video gallery experience
- Clickable videos within travel spot popup that play correctly with full audio and interactive controls enabled
- Lovely album style fullscreen viewer with clean, immersive design and elegant navigation between all photos
- Social media video expansion interface with larger view display, proper video controls, and full embedded video player functionality
- Fullscreen album viewer with smooth transitions and visually appealing layout focused on photo viewing experience
- Adaptive aspect ratio fullscreen viewer that displays all images in the album using the same aspect ratio mode (portrait or landscape) as the initially clicked photo for consistent viewing experience
- Travel Spot interface with city selection including "Existing Cities" button list and "Enter City Name" input and travel spot management functionality
- Travel spot form interface for adding and editing travel spots with type input field, name and description fields, media upload functionality, and social media videos functionality
- Travel spot social media videos input interface positioned below the Travel Spot Media field with dedicated YouTube and Instagram URL input fields, validation, and feedback
- Travel spot media upload interface for adding photos and videos to specific travel spots with proper validation and error handling
- Travel spot social media videos management interface for adding, viewing, editing, and removing social media links with clear visual distinction between platforms
- Travel spot type input field positioned above the spot name input in the "Add New Travel Spot" form
- Travel spot type input field that accepts free text input with placeholder text specifying recommended types: "Hotel, Restaurant, Shopping, Heritage, Relax, Others"
- Travel spot list display showing all travel spots for the selected city with type, name, description, media information, and social media video information
- Travel spot media gallery interface displaying uploaded photos, videos, and social media videos for each travel spot with reliable rendering
- Travel spot management controls for editing and deleting travel spots and managing their media and social media videos
- Form validation and user feedback for travel spot operations including media uploads and social media video management
- Music Album interface with authentication-gated access to upload functionality
- Music upload interface supporting multiple audio file selection with proper validation and error handling for authenticated users
- Batch music upload interface allowing users to select and upload multiple music files simultaneously to an album
- Music album creation and management interface for organizing songs into custom collections with a fully functional "+ Create Album" button that responds reliably and consistently opens the album creation dialog
- Album creation dialog that opens immediately and reliably when the "+ Create Album" button is clicked
- Song upload functionality that allows users to upload songs to albums without errors with batch upload support
- Music metadata interface with optional song title and artist fields for uploaded music files
- Music playback interface with built-in audio player and standard controls within the admin panel
- Music library interface displaying all uploaded songs with search and filter functionality
- Music management controls for editing metadata, deleting songs, and managing albums
- Bottom music player bar interface with ultra-slim profile and light blue aesthetic featuring:
  - Play/pause button for current song playback control with minimalist light blue-themed icon
  - Skip forward and backward buttons for navigation between songs with elegant rounded design in light blue theme
  - Volume control slider for adjusting playback volume with soft, rounded styling in light blue theme
  - Progress bar for showing playback position and seeking with smooth, light blue-inspired design
  - Elegant display area for all song details (title, artist, album) in a clean and attractive light blue-themed layout with readable typography
  - Playback time display showing current time and total duration with clean, minimalist formatting
  - Visual feedback for current playback status with light blue-themed indicators
  - Visual balance between song details and controls for optimal user experience
  - Light blue color palette with complementary tones for a fresh, appealing appearance
  - Rounded corners throughout the interface for a gentle, welcoming appearance
  - Smooth gradients and subtle shadows for visual depth
  - Overall design that creates a pleasant, modern aesthetic with light blue theming
- Fixed-size plain red text visualization for searched places:
  - Searched place name displayed as plain red text positioned directly at the searched location coordinates
  - Text maintains consistent visual size regardless of current map zoom level
  - Text size remains completely fixed and does not scale with map zoom operations
  - Text appears at the same visual size whether zooming in to level 20 or zooming out to level 5
  - Text size is locked to a fixed pixel size that never changes based on map zoom level
  - Text is clearly visible and styled for clarity with red color
  - Text appears at the exact searched coordinates without any background, rectangle, or connection line
  - Only the plain red text is used for displaying the searched location name
  - Text replaces any previous icon, label, rectangle, or line overlays for the searched place
  - Text is non-interactive and does not respond to clicks or hover events
  - Fixed-size behavior applies only to the red text label for searched locations and does not affect other map elements
- Travel spot pins on the map using the original pin/marker style, not the plain red text visualization
- Travel spot pins positioned at exact real-world geographic coordinates of each specific travel spot location using geocoding
- Star-shaped bookmark markers visually distinct from both travel spot pins and search location text
- Bookmark marker popups displaying coordinate information or custom messages
- All application content displayed in English
- Main interface elements (search bar, admin controls, authentication button, music icon) are fully transparent and overlay correctly on top of the map
- All UI elements are visible and interactive while the map (both 2D and 3D) remains visible in the background
- Proper transparency and layering ensures the app loads and displays as expected with all interface components accessible

## Technical Requirements

### Frontend
- React-based user interface
- Three.js integration for 3D interactive globe display
- 3D globe component with high-resolution raster textures (4K+ diffuse map and bump map)
- Vector tile overlay system (MapLibre GL or similar) for borders, coastlines, and city/country labels
- Level of Detail (LOD) system for progressive detail enhancement as users zoom in
- Smooth orbit controls for 3D globe navigation
- Anti-aliasing enabled for polished 3D globe rendering
- Seamless transition system from 3D globe to map view upon search submission
- 3D globe visibility management (show before search, hide after search)
- "3D Rotation Speed" and "3D Country Font Size" slider components accessible through the "World" button, but the slider panels are repositioned to the bottom of the UI page along the lower edge
- Both slider components maintain their original functionality, styles, and interactive bindings to control 3D globe behavior
- All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
- Slider components preserve all existing behavior and maintain full operational integrity
- World collapsible slider panels component that appears at the bottom of the UI page when the World button is activated
- World collapsible slider panels component that contains the "3D Rotation Speed" and "3D Country Font Size" sliders with all existing functionality preserved
- World collapsible slider panels positioning system that ensures they do not interfere with other UI elements
- World collapsible slider panels collapse functionality that can be triggered by clicking elsewhere or re-clicking the "World" button
- "3D Rotation Speed" and "3D Country Font Size" slider components within the repositioned panels that maintain all existing functionality and event handling
- Visual consistency preservation for the sliders within the repositioned panels
- Layout integration system that ensures proper visual hierarchy while maintaining operational integrity
- All slider controls and functionality work exactly as before, just relocated to the bottom positioning
- Bottom control panels component system for Day/Night Terminator and Day/Night Visualization panels repositioned to the bottom of the UI page along the lower edge with simplified appearance
- Day/Night Terminator and Day/Night Visualization panel components that maintain their alignment, functionality, and styles exactly as before with simplified appearance
- Simplified appearance achieved by removing the outer container layer and keeping only the inner content layer visible while preserving all functionality
- Day/Night Terminator panel component that maintains all interactive behavior and features
- Day/Night Terminator panel component includes:
  - Yellow "Terminator" button component with current styles, interactions, and functionality for toggling day/night visualization on the 3D globe
  - Purple "Twilight" button component with current styles, interactions, and functionality for toggling day/night visualization on the 3D globe
  - "Real" button component (renamed from "Real Time") with current styles, interactions, and functionality for real-time day/night visualization on the 3D globe
  - All terminator and twilight functionality preservation for 3D globe day/night visualization
  - 3D globe rendering, lighting behavior, and all related time or terminator features remain unaffected by positioning changes
  - All existing visual styling, color schemes, and interactive behaviors are preserved
- Day/Night Visualization panel component that maintains all existing functionality and controls
- Bottom positioning system for both panels that ensures they do not interfere with other UI elements or panels
- Both panels positioned at the bottom of the UI page to minimize visual obstruction of the 3D globe while remaining accessible and functional throughout the application experience
- Three button components positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment: City, Show Time Zones, and World
- City button component with collapsible "World Travel Hotspot" panel functionality, but the panel is repositioned to the bottom of the UI page along the lower edge
- "World Travel Hotspot" panel component that appears at the bottom of the UI page when users hover or click the City button
- "World Travel Hotspot" panel component that maintains all existing functionality including:
  - Capitals toggle component for displaying capital cities on the 3D globe
  - Global Cities toggle component for displaying major global cities on the 3D globe
  - Major Cities toggle component for displaying major cities on the 3D globe
  - All toggle controls preserve their original behavior and city display functionality
- "World Travel Hotspot" panel positioning system at the bottom that ensures it does not interfere with other UI elements
- "World Travel Hotspot" panel collapse functionality that can be triggered by clicking elsewhere or re-clicking the City button
- City button component that preserves all current functionality without changing its layout or behavior
- 3D globe rendering, initialization, and city display layers remain completely unaffected and fully functional
- "Show Time Zones" button component positioned below the City button with consistent sizing and vertical alignment
- "Show Time Zones" button component displays a time logo icon while maintaining its current size and layout
- "Show Time Zones" button component that maintains its click functionality and preserves all current behavior
- "UTC Offset" panel component that appears when the "Show Time Zones" button is activated, positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance
- "UTC Offset" panel component that maintains its current design, alignment, and interactivity consistent with the existing layout
- "UTC Offset" panel positioning system that ensures it does not interfere with other UI elements
- "UTC Offset" panel collapse functionality that can be triggered by clicking elsewhere or re-clicking the "Show Time Zones" button
- "World" button component positioned below the "Show Time Zones" button with consistent sizing and vertical alignment
- Layout system that preserves current design and maintains responsiveness across all screen sizes
- Toggle button components labeled "3D" and "2D" positioned within the search bar with grey color styling for visual distinction from the white search bar background
- Toggle buttons visually integrated into the search bar design for easy access and user-friendly interface
- Toggle functionality that allows instant switching between 3D globe and 2D map views
- Toggle state management that maintains current view mode independently of search functionality
- Visual indicators showing which mode is currently active (3D or 2D)
- Smooth transition animations between 3D globe and 2D map views when toggling
- Toggle button accessibility and functionality throughout the application experience
- Automatic search functionality for Zurich when "2D" toggle button is clicked
- Search bar and toggle button integration that maintains visual cohesion and user-friendly design
- Search bar component positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
- Grey magnifier icon component positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative
- Search input field with integrated magnifier icon for visual enhancement only
- Tooltip functionality for toggle buttons:
  - 3D button tooltip displaying: "Interactive 3D Globe with Personalized Travel Map" followed by "Drag to rotate • Scroll to zoom • Click country to highlight • Click ocean to deselect Animated arcs from zurich to your traveled cities Watch for start city labels, ripple effects, and arrival city labels when arcs animate!"
  - 2D button tooltip displaying relevant 2D map functionality and search capabilities
- Tooltip components that appear on hover or focus of the respective toggle buttons
- Click-to-bookmark functionality for 2D map view
- Map click event handler using Leaflet's map.on('click', ...) method
- Event handler function that receives the click event object and extracts e.latlng coordinates
- Marker creation and placement functionality using L.marker([lat, lng]).addTo(map) for clicked coordinates
- Modern, minimal "+ Bookmark" button component that appears when user left-clicks on the map with visually appealing design featuring:
  - Subtle shadow styling for depth and visual separation from map background
  - Rounded corners styling for modern, friendly appearance
  - Light blue or ivory color scheme implementation that matches the app's overall aesthetic
  - Soft border styling for refined appearance
  - Star or bookmark icon integration to clearly indicate functionality
  - Modern typography and minimal design approach
  - Easy clickability with appropriate button size and hover state styling
  - Pointer cursor styling (cursor: pointer) when hovered to clearly indicate it is clickable and interactive
  - Clear visual distinction from other map elements including travel spot pins and search location text
- Popup binding and display functionality using .bindPopup() and .openPopup() for coordinate display on bookmark markers
- Star-shaped bookmark marker creation at exact clicked locations
- Single action workflow combining click detection, coordinate extraction, marker creation, and popup display
- Visual distinction system for star-shaped bookmark markers compared to travel spot pins and search text
- Global map variable accessibility for event listener attachment
- Event listener attachment after map initialization
- Internet Identity integration for user authentication
- Authentication state management across components
- Login/logout functionality with proper session handling
- Authentication status indicators and user feedback
- Authentication button component positioned directly below the Website Layout button in the upper right corner vertical button stack
- Authentication button component that maintains the same style, interaction, and functionality as before
- Authentication button positioning system that preserves the visual consistency and even spacing of the vertical button stack
- Integration with mapping library (Leaflet or Mapbox GL JS)
- Map component with unlimited zoom capabilities and no restrictions on zoom levels
- Map component that maintains full interactivity for panning and zooming after search operations
- Map component that centers on location with zoom level 15 for every search and always sets the map zoom level to 15 regardless of previous or subsequent searches
- Map component that preserves all user manual adjustments without interference from automatic centering until a new search is performed
- Map component that maintains user's chosen view and zoom level until a new search is performed
- Search input component with form submission and validation
- Search bar component positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
- Interactive map component with unrestricted zoom controls
- 3D globe display component before any search is performed
- Map view component that appears directly after successful search, replacing the 3D globe
- Left-side info box component that displays only the world logo and the searched location name after performing a search
- Left-side info box component that does not display the type of search (country, city, town, etc.)
- Left-side info box component with clean, minimal appearance focused on the location name
- Left-side info box positioning and styling that remain consistent with the overall application design
- Fixed-size plain red text visualization component for searched places:
  - Fixed-size plain red text rendering positioned directly at the searched location coordinates
  - Text sizing system that maintains consistent visual size regardless of current map zoom level
  - Text scaling prevention that ensures text size remains completely fixed and does not scale with map zoom operations
  - Text size locking system that maintains a fixed pixel size that never changes based on map zoom level
  - Text appears at the same visual size whether zooming in to level 20 or zooming out to level 5
  - Text styling for clear visibility and clarity with red color
  - Text positioning at the exact searched coordinates without any background, rectangle, or connection line
  - Only the plain red text used for displaying the searched location name
  - Text that replaces any previous icon, label, rectangle, or line overlays for the searched place
  - Non-interactive text component that does not respond to clicks or hover events
  - Fixed-size behavior applies only to the red text label for searched locations and does not affect other map elements
- Enhanced map component that displays travel spot pins for the searched city using the original pin/marker style
- Travel spot pin rendering system that uses the original pin/marker visualization, not the plain red text system
- Travel spot pin positioning at exact real-world geographic coordinates of each specific travel spot location using geocoding API integration
- Geocoding integration for travel spot coordinates that determines precise location based on travel spot name and city name
- Travel spot coordinate accuracy matching the same precision as when searching for that specific location directly
- Authentication button component positioned directly below the Website Layout button in the upper right corner vertical button stack
- Authentication button component that maintains the same style, interaction, and functionality as before
- Authentication button positioning system that preserves the visual consistency and even spacing of the vertical button stack
- Admin control panel component positioned in upper right corner with horizontal lines icon (Menu/Align Justify style)
- Music icon component positioned in upper right corner at the same level as the admin control panel and authentication button
- Music panel component that opens when the Music icon is clicked, displaying music albums and songs
- Music panel song selection functionality that allows users to click on any song to change the currently playing song with smooth and responsive playback
- Music panel integration with bottom music player bar for immediate song switching
- Proper z-index management to ensure admin control panel, authentication button, and music icon always appear above map and remain fully accessible
- Admin control panel organized into main sections arranged in a vertical accordion-style menu: "Trip Management", "Travel Spot", and "Music Album"
- Accordion-style interface where each panel expands only when clicked and only one panel can be expanded at a time
- Trip Management interface within admin panel
- Travel Spot interface within admin panel with authentication checks
- Music Album interface within admin panel with authentication checks
- Bottom music player bar component positioned at the bottom of the website with proper z-index layering
- Ultra-slim music player bar component with height reduced by approximately 3 times from the original design, making it as thin as possible while maintaining usability
- Music player bar component that remains visible and accessible at all times while browsing the application (when enabled by user preference)
- Music player bar visibility control based on user settings from Display Settings section of Website Layout panel
- Music player bar component featuring light blue color scheme for a more visually appealing look with cozy, inviting design elements:
  - Light blue color palette implementation with complementary tones for fresh, appealing appearance
  - Rounded corners styling throughout the interface for gentle, welcoming appearance
  - Minimalist icon design with clean, simple aesthetics that complement the light blue theme
  - Smooth gradients and subtle shadows implementation for visual depth
  - Typography styling that feels modern and approachable, matching light blue aesthetics
  - Overall design implementation that creates a pleasant, modern aesthetic with light blue theming
- Music player controls components including:
  - Play/pause button component for current song playback control with minimalist light blue-themed icon design
  - Skip forward and backward button components for navigation between songs with elegant rounded design in light blue theme
  - Volume control slider component for adjusting playback volume with soft, rounded styling in light blue theme
  - Progress bar component for showing playback position and allowing seeking with smooth, light blue-inspired design
  - Elegant song information display component for title, artist, and album in a clean and attractive light blue-themed layout with readable typography
  - Playback time display component showing current time and total duration with clean, minimalist formatting
  - Visual balance implementation between song details and controls for optimal user experience
- Music player state management for maintaining playback across different pages and sections
- Music player audio handling for loading, buffering, and playing uploaded audio files
- Music player integration with Music Album management system and dedicated Music panel
- Music player responsive design that adapts to different screen sizes while maintaining ultra-slim profile and light blue aesthetic
- Music player update functionality that immediately changes the playing song when a song is selected from the Music panel with smooth and responsive playback
- Travel Spot interface within admin panel with authentication checks for media uploads and social media video management
- Journey management forms for adding, editing, and deleting travel entries with a completely reliable "+Journey" button that always opens the journey creation dialog
- Proper event handling and state management to ensure the "+Journey" button is never blocked or unresponsive
- Journey creation dialog that opens immediately and consistently when the "+Journey" button is clicked
- Dialog component with proper z-index and positioning to ensure visibility above all other UI elements
- Journey creation form that allows users to set dates in the past or future
- Automatic journey categorization logic based on current date comparison with journey dates
- Journey list display with automatic separation between upcoming and previous journeys based on dates
- Date picker components for journey start and end dates that support both past and future dates
- Travel Spot components including:
  - City selection interface with both "Existing Cities" button list and "Enter City Name" input field
  - Travel spot form component for adding new travel spots with type input field, name and description fields, media upload functionality, and social media videos functionality
  - Travel spot media upload component supporting JPEG, PNG, WebP, AVIF, MP4, and MOV formats with reliable error handling for authenticated users
  - Travel spot social media videos component positioned below the Travel Spot Media field with dedicated interface for YouTube and Instagram video URLs including:
    - Separate input field for YouTube video URLs with clear labeling and validation
    - Separate input field for Instagram video URLs with clear labeling and validation
    - "Add YouTube Link" button with proper validation and success/error feedback
    - "Add Instagram Link" button with proper validation and success/error feedback
    - Real-time URL validation and clear feedback
    - Visual confirmation of successfully added social media links
    - Clear error messaging for invalid URLs or unsupported platforms
  - Travel spot social media videos management interface for adding, viewing, editing, and removing social media links with clear visual distinction between platforms
  - Travel spot type input field component that accepts free text input with placeholder text specifying recommended types: "Hotel, Restaurant, Shopping, Heritage, Relax, Others"
  - Travel spot type input field positioned above the spot name input field in the "Add New Travel Spot" form
  - Travel spot list component displaying all travel spots for the selected city with type, name, description, media information, and social media video information
  - Travel spot media gallery component displaying uploaded photos, videos, and social media videos for each travel spot with reliable rendering
  - Travel spot editing interface for modifying existing travel spots including type input field with placeholder text, media management, and social media videos management
  - Travel spot deletion functionality with confirmation dialog
  - Form validation for required travel spot name and type fields
  - Success and error feedback for travel spot operations including media uploads and social media video management
- Music Album components including:
  - Authentication-gated access to upload functionality
  - Multi-file audio upload component supporting MP3, WAV, FLAC, and AAC formats with reliable error handling for authenticated users
  - Batch upload component allowing users to select and upload multiple music files simultaneously to an album
  - Music album creation and management interface for organizing songs into custom collections with a fully functional "+ Create Album" button that responds reliably and consistently opens the album creation dialog every time it is clicked
  - Album creation dialog component that opens immediately and reliably when the "+ Create Album" button is clicked without delays or failures
  - Dialog component with proper z-index and positioning to ensure visibility above all other UI elements for album creation
  - Proper event handling and state management to ensure the "+ Create Album" button is never blocked or unresponsive
  - Song upload functionality that allows users to upload songs to albums without errors with smooth upload process and clear success/failure feedback
  - Batch song upload functionality that handles multiple file selection and upload simultaneously
  - Reliable song upload process with proper error handling and recovery mechanisms
  - Music metadata components with optional song title and artist input fields
  - Built-in audio player component with standard playback controls (play, pause, skip, volume, progress) within the admin panel
  - Music library component displaying all uploaded songs with search and filter functionality
  - Music metadata editing interface for updating song information (title, artist, album) with optional fields
  - Music management controls for deleting songs and managing albums
  - Album cover image upload functionality
  - Comprehensive file validation for supported audio formats with clear error messages
  - Upload progress indicators and success/error feedback for music file uploads with clear success and error messages for song upload operations
  - Clear messaging for non-authenticated users attempting to access music upload functionality
- Travel spot popup components that display travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below, and travel spot media gallery with social media, photos, and videos tabs in horizontal order
- Travel spot popup components sized to match standard popup dimensions for consistent appearance
- Travel spot popup positioning system that places popups to the right of pins with dynamic adjustment to ensure proper alignment and no overlap with the pins or map controls
- Travel spot popup interface displaying travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below, and travel spot media gallery with social media, photos, and videos tabs in horizontal order
- Enhanced media gallery component within travel spot popups that displays travel spot specific media organized into separate social media, photos, and videos tabs positioned side by side with clear tab navigation in horizontal order
- Tab interface component for travel spot media gallery that allows easy switching between "Social Media", "Photos", and "Videos" tabs without scrolling
- Social media tab component that displays embedded YouTube and Instagram videos with proper embedding and playable functionality directly within the popup that automatically updates when new social media links are added through the admin panel
- Embedded video player components for YouTube and Instagram videos within the Social Media tab that allow direct playback without leaving the application
- Travel spot video components that are fully interactive with audio enabled by default, not muted or blocked, ensuring proper playback functionality when clicked
- Travel spot popup media gallery that shows all images, videos, and social media content in separate tabs (social media, photos, videos) in a clean format with correct URLs and reliable loading mechanisms that successfully transition from loading state to actual content display
- Media gallery tabs that clearly separate social media content (YouTube, Instagram) from photos (JPEG, PNG, WebP, AVIF) from videos (MP4, MOV) with intuitive tab navigation and visual grouping
- Social media video embedding component that properly displays YouTube and Instagram videos within the Social Media tab with automatic updates when new links are added and direct playback functionality
- Media gallery that does not display file format information for individual media items
- Media gallery that automatically updates to reflect new uploads and social media links added to the travel spot media for that location
- Reliable retrieval and display of travel spot media and social media content when travel spot pins are clicked with correct aspect ratios and full visibility
- Media files and social media videos displayed without being blacked out, corrupted, or stuck in loading state, ensuring robust file handling and rendering that guarantees successful media loading
- Enhanced useFileUrl hook or equivalent mechanism that correctly handles media URL generation and loading state transitions from loading to actual media content with comprehensive error handling and retry logic
- Social media video embedding system that handles YouTube and Instagram video URLs and displays them properly within the popup with automatic updates and direct playback functionality
- Comprehensive error handling for media files and social media content that fail to load with appropriate fallback display and retry mechanisms
- Gallery rendering logic that successfully and reliably transitions from loading state to displaying actual media content for JPEG, PNG, WebP, AVIF, MP4, and MOV files and social media videos without endless loading or stuck states
- Enhanced photo display reliability system that ensures uploaded photos load properly in both admin panel gallery and popup media gallery without loading issues
- Clickable image functionality within travel spot popup media gallery that opens images in lovely album style fullscreen viewer
- Clickable social media video functionality within travel spot popup that expands videos to a larger view for immersive playback similar to the photo/video gallery experience
- Clickable video functionality within travel spot popup that plays videos correctly with full audio and interactive controls enabled
- Social media video expansion component with:
  - Larger view display for better viewing experience and immersive playbook
  - Proper video controls and playback functionality for both YouTube and Instagram videos
  - Clean interface focused on video viewing experience
  - Easy navigation between social media videos if multiple are available
  - Maintains video quality and aspect ratio during expansion
  - Full embedded video player functionality in the expanded view
  - Seamless playback experience without leaving the application
- Lovely album style fullscreen viewer component with:
  - Clean, immersive design focused entirely on photo viewing experience
  - Main image display area showing selected photo prominently
  - Elegant navigation system for switching between all photos (carousel or thumbnail strip)
  - Smooth transitions between images for polished viewing experience
  - Visually appealing layout that enhances photo viewing
  - No close button or photo details to maintain clean, immersive experience
  - Easy and elegant image switching with intuitive navigation controls
  - Display only photos from travel spot media, excluding videos
  - Adaptive aspect ratio functionality that determines the aspect ratio of the initially clicked photo and displays all images in the album using that same aspect ratio mode (portrait or landscape) for consistent viewing experience
  - Aspect ratio detection logic that analyzes the first clicked photo and sets the display mode for the entire album session
  - Portrait mode display when the initially clicked photo is portrait orientation
  - Landscape mode display when the initially clicked photo is landscape orientation
  - Consistent aspect ratio mode maintained throughout the entire viewing session
- Enhanced fullscreen album viewer with proper z-index layering above all other UI elements
- Enhanced fullscreen image viewer that displays images with intelligent scaling:
  - For landscape images: scales width to be close to the length of the search bar while maintaining aspect ratio
  - For portrait images: scales height to be similar to the height of the map window while maintaining aspect ratio
  - Proper aspect ratio preservation for both orientations during scaling operations
- Tiny "X" close button component positioned at the upper right corner of the travel spot popup for easy closure
- Close button that is small and unobtrusive while remaining easily clickable
- Close button functionality that allows manual popup closure at any time
- Close button styling that matches the popup design and remains always visible
- Close button positioning that does not interfere with other popup content or actions
- Reliable geocoding API integration for location name to geographic coordinates mapping
- Enhanced geocoding integration for travel spot coordinate determination using travel spot name and city name
- Travel spot geocoding that provides the same accuracy as when searching for that specific location directly
- Support for worldwide cities and towns through geocoding service
- Error handling for invalid or unrecognized location names
- Comprehensive location database or geocoding service integration
- Clear visual styling for popup elements that matches the site's chill aesthetic
- Implement proper API calls to backend for authentication verification
- Implement proper API calls to backend for saving journey data, travel spot data with type and travel spot media data, travel spot social media videos, music album data with user authentication, and map settings
- Implement proper API calls to backend for retrieving travel spot data with type, media, and social media videos for map display with coordinates
- Enhanced API calls to backend for retrieving travel spot media data and social media videos for popup display with robust URL generation and file handling that ensures media loads properly and reliably
- Enhanced API calls to backend for saving and retrieving social media links with proper validation and error handling
- Enhanced API calls to backend for saving and retrieving travel spot media and social media videos with proper validation and error handling
- API calls to backend for saving and retrieving music album data with proper validation and error handling
- Enhanced API calls to backend for music album creation and song upload operations with proper error handling and recovery mechanisms
- API calls to backend for batch music upload operations with proper validation and error handling
- API calls to backend for retrieving music files for bottom music player bar playback and Music panel display
- API calls to backend for saving and retrieving map settings with user authentication
- Implement reliable data retrieval to display travel spot media and social media videos for selected travel spots in both admin panel and map popups with robust media rendering that never shows blacked-out content or endless loading
- Enhanced data retrieval system for photos that ensures reliable loading and display in both admin panel and popup galleries
- Implement data retrieval to display travel spots with type, media, and social media videos for selected cities in admin panel and as pins on the map with accurate coordinates
- Implement data retrieval to display music albums and songs for authenticated users in both admin panel and Music panel
- Implement data retrieval for bottom music player bar to access uploaded songs and metadata
- Implement data retrieval for Music panel to display music albums and songs for song selection
- Implement data retrieval for map settings to control default search place
- Enhanced retrieval system for music albums and songs with improved reliability and error handling
- Enhanced system to ensure travel spot media and social media links can be reliably retrieved and displayed by travel spot ID for both admin panel and popup display with robust URL generation that allows frontend to load media successfully without failures or endless loading
- Enhanced system to ensure music files can be reliably retrieved and played in the music library, Music panel, and bottom music player bar with robust URL generation that allows frontend to load audio successfully without failures
- Enhanced system to ensure map settings can be reliably retrieved and applied to control user interface elements
- Enhanced photo retrieval system that ensures reliable photo loading in both admin panel and popup galleries
- Travel spot social media link retrieval system that ensures reliable display in travel spot popup Social Media tabs with automatic updates
- Travel spot media retrieval system that ensures reliable display in travel spot popup media galleries
- Music file retrieval system that ensures reliable audio playback and library management
- Enhanced music file retrieval system with improved reliability for song playback, library management, Music panel display, and bottom music player bar functionality
- Map settings retrieval system that ensures reliable settings application and user interface control
- Comprehensive file format validation and reliable storage for travel spot media files and music files with authentication checks
- Enhanced social media URL validation and reliable storage for YouTube and Instagram video links with authentication checks and improved error handling
- Travel spot social media URL validation and reliable storage for YouTube and Instagram video links with authentication checks and improved error handling
- Map settings validation and reliable storage for display settings with authentication checks
- Robust error handling and recovery mechanisms for media file operations, travel spot operations, travel spot media operations, travel spot social media link operations, music file operations, and map settings operations
- Enhanced error handling and recovery mechanisms for music album creation and song upload operations
- Enhanced error handling and recovery mechanisms for batch music upload operations
- Enhanced error handling and recovery mechanisms for map settings operations
- User identity verification for protected data operations
- Enhanced URL generation for media files to ensure reliable loading and display in frontend components without loading issues, blacked-out content, or endless loading states
- Enhanced photo URL generation system that ensures reliable photo loading across all components
- Robust media serving system that allows frontend to successfully access and display uploaded media files without loading issues, failures, or endless loading states
- Travel spot social media link serving system that provides validated URLs for embedding YouTube and Instagram videos with automatic updates
- Travel spot media serving system that ensures reliable media loading and display for travel spot galleries
- Music file serving system that ensures reliable audio loading and playback for music libraries, Music panel, and bottom music player bar
- Enhanced music file serving system with improved reliability for song playback, album management, Music panel functionality, and bottom music player bar functionality
- Map settings serving system that ensures reliable settings retrieval and application to user interface elements
- Travel spot data validation ensuring required fields including type are provided and proper association with cities and users
- Travel spot coordinate storage and retrieval with geocoding integration for accurate pin placement
- Travel spot media validation ensuring proper file formats and user authentication
- Travel spot social media link validation ensuring proper URL formats and user authentication
- Music album data validation ensuring required fields are provided and proper association with users
- Music file validation ensuring proper audio formats and user authentication
- Enhanced music album and song validation with improved error handling and feedback
- Batch music upload validation ensuring proper audio formats and user authentication for multiple files
- Map settings validation ensuring proper settings format and user authentication
- Geocoding service integration for determining precise travel spot coordinates based on travel spot name and city name
- Travel spot type field storage and retrieval that accepts and stores any text input from the user for the travel spot type
- Travel spot type validation to ensure the type field is not empty and is properly saved and returned to the frontend
- Music metadata storage and retrieval with optional song title and artist fields
- Map settings metadata storage and retrieval with user-specific settings
- Robust error handling and recovery mechanisms for file upload operations, travel spot media management, travel spot social media link management, music file management, and map settings management to ensure users can upload files, add social media links, and update settings without errors
- Enhanced backend reliability for travel spot save operations, travel spot media operations, travel spot social media link operations, music album operations, and map settings operations to ensure users can save travel spots, upload media, add social media links, and update settings without errors
- Enhanced backend reliability for music album creation and song upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for batch music upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for map settings operations with improved error handling and recovery mechanisms
- Comprehensive backend validation and error recovery mechanisms for all save operations including travel spot media, travel spot social media links, music files, and map settings to prevent data corruption and ensure successful persistence
- Enhanced backend validation and error recovery for music album creation and song upload operations
- Enhanced backend validation and error recovery for batch music upload operations
- Enhanced backend validation and error recovery for map settings operations
- Enhanced social media link validation system with improved error handling and user feedback
- Travel spot social media link validation system with improved error handling and user feedback
- Robust social media link storage and retrieval system that ensures reliable display in popup Social Media tabs
- Travel spot social media link storage and retrieval system that ensures reliable display in travel spot popup Social Media tabs
- Travel spot media storage and retrieval system that ensures reliable display in travel spot popup media galleries
- Music album storage and retrieval system that ensures reliable audio playback and library management
- Enhanced music album storage and retrieval system with improved reliability for album creation and song upload operations
- Enhanced music album storage and retrieval system with support for batch music uploads, Music panel functionality, and bottom music player bar functionality
- Map settings storage and retrieval system that ensures reliable settings management and application

### Backend
- Internet Identity authentication integration
- User identity management and session handling
- Authentication verification for protected endpoints
- Store travel journey information persistently
- Save and retrieve journey data including city names, start dates, and end dates
- Store travel spot information persistently
- Save and retrieve travel spot data including:
  - City name association
  - User identity association
  - Travel spot type (as free text input from user)
  - Travel spot name
  - Travel spot description (optional)
  - Travel spot coordinates (latitude and longitude) obtained through geocoding
  - Travel spot media file data (images and videos) with robust storage mechanisms and enhanced URL generation that ensures frontend can load media properly and reliably
  - Travel spot social media links (YouTube and Instagram video URLs) with proper validation and storage
  - Travel spot media file metadata (filename, format, upload timestamp)
  - Travel spot social media link metadata (URL, platform type, addition timestamp)
  - Creation and modification timestamps
- Store music album information persistently
- Save and retrieve music album data including:
  - User identity association
  - Album titles and descriptions
  - Song metadata with optional title and artist fields
  - Audio file data with robust storage mechanisms and enhanced URL generation
  - Album cover images
  - Audio file metadata (filename, format, duration, upload timestamp)
  - Support for MP3, WAV, FLAC, and AAC formats with proper validation
  - Creation and modification timestamps
  - Support for batch music uploads with multiple files per album
- Enhanced music album creation and song upload functionality with improved reliability and error handling
- Robust music album creation process that handles album creation requests smoothly without errors
- Reliable song upload process that handles audio files smoothly without errors for authenticated users
- Batch music upload processing that handles multiple audio files simultaneously for a single album
- Enhanced error handling and recovery mechanisms for music album operations and song uploads
- Store map settings persistently
- Save and retrieve map settings including:
  - User identity association
  - Display settings and toggles
  - Map preference metadata (creation and modification timestamps)
- Handle media file storage and retrieval for travel spots and music albums with guaranteed reliability and authentication checks
- Handle social media link storage and retrieval for travel spots with enhanced URL validation, authentication checks, and proper error handling
- Handle map settings storage and retrieval with authentication checks and proper validation
- Enhanced media URL generation system that produces reliable, accessible URLs for media files to ensure correct loading and display in frontend components without endless loading states or failures
- Enhanced photo URL generation and serving system that ensures reliable photo loading in both admin panel and popup galleries
- Social media link validation system that ensures only valid YouTube and Instagram video URLs are accepted and stored with enhanced error handling and feedback
- Travel spot social media link validation system that ensures only valid YouTube and Instagram video URLs are accepted and stored for travel spots with enhanced error handling and feedback
- Map settings validation system that ensures proper settings are stored and retrieved
- Associate media files and social media links with correct travel spot identities and user identities
- Associate travel spots with correct city names, user identities, types, media files, and social media links
- Associate music albums and songs with correct user identities
- Associate map settings with correct user identities
- Support multiple travel spots per city with proper data management, type storage, coordinate storage, media storage, and social media link storage
- Support multiple music albums and songs per user with reliable concurrent upload handling
- Support multiple media files and social media links per travel spot with reliable concurrent upload handling
- Support batch music uploads with multiple files per album upload operation
- Provide endpoints for user authentication and identity verification
- Provide endpoints for creating, reading, updating, and deleting journey information
- Provide robust endpoints for creating, reading, updating, and deleting travel spot information with type field, authentication requirements, coordinate handling, media management, and social media link management
- Provide robust endpoints for creating, reading, updating, and deleting travel spot media and social media links with proper error handling and authentication requirements
- Provide endpoints for creating, reading, updating, and deleting music album information with authentication requirements
- Provide robust endpoints for creating, reading, updating, and deleting music files with proper error handling and authentication requirements
- Provide endpoints for batch music upload operations with proper validation and error handling
- Enhanced endpoints for music album creation and song upload operations with improved reliability and error handling
- Provide endpoints for creating, reading, updating, and deleting map settings with authentication requirements
- Provide endpoint for retrieving travel spot data with type, media, and social media videos by city name for map display including coordinates
- Enhanced endpoint for retrieving travel spot media and social media links by travel spot ID for popup display with robust URL generation that ensures media loads reliably in frontend without failures or endless loading
- Enhanced endpoint for retrieving photos with improved reliability that ensures photos load properly in both admin panel and popup galleries
- Travel spot social media link retrieval endpoint that returns validated YouTube and Instagram video URLs for travel spots with automatic updates
- Travel spot media retrieval endpoint that returns media files for specific travel spots with reliable URL generation
- Music album retrieval endpoint that returns music files and album data for authenticated users with reliable URL generation
- Enhanced music album and song retrieval endpoints with improved reliability and error handling
- Music file retrieval endpoint for bottom music player bar with reliable URL generation and metadata
- Music file retrieval endpoint for Music panel with reliable URL generation and metadata for song selection
- Map settings retrieval endpoint that returns user-specific display settings
- Robust media URL generation system that produces consistently accessible URLs for uploaded media files that frontend can successfully fetch without loading issues
- Enhanced file serving mechanism that allows frontend to successfully fetch and display media content without getting stuck in loading state or showing blacked-out content
- Enhanced photo serving system that ensures reliable photo loading and display across all components
- Comprehensive media retrieval endpoint that handles JPEG, PNG, WebP, AVIF, MP4, and MOV files and social media links correctly without causing perpetual loading states, blacked-out media, or display failures
- Travel spot media serving system that ensures reliable media loading and display for travel spot galleries
- Travel spot social media link serving system that ensures reliable social media video loading and display for travel spot galleries
- Music file serving system that ensures reliable audio loading and playback for music albums, bottom music player bar, and Music panel
- Enhanced music file serving system with improved reliability and error handling for song playback
- Map settings serving system that ensures reliable settings retrieval and application
- Data persistence across user sessions with guaranteed reliability
- Proper validation and error handling for save operations including travel spot validation with type field, travel spot media validation, travel spot social media link validation, music file validation, and map settings validation
- Enhanced validation and error handling for music album creation and song upload operations
- Batch music upload validation and error handling for multiple file operations
- Map settings validation and error handling for display settings
- Authentication middleware for protected endpoints including travel spot media management, travel spot social media link management, music album management, and map settings management
- Ensure reliable storage and retrieval of journey data, travel spot data with type, travel spot media data, travel spot social media links, music album data, and map settings with user association and coordinates
- Enhanced reliability for music album creation and song upload operations with proper error handling
- Enhanced reliability for batch music upload operations with proper error handling
- Enhanced reliability for map settings operations with proper error handling
- Confirm successful save operations and return appropriate responses to frontend
- Handle concurrent save operations and data integrity
- Ensure save endpoint properly stores journey data, travel spot data with type and coordinates, travel spot media data, travel spot social media links, music album data, and map settings in persistent storage with user authentication
- Enhanced save endpoint reliability for music album creation and song upload operations
- Enhanced save endpoint reliability for batch music upload operations
- Enhanced save endpoint reliability for map settings operations
- Return proper success/error responses for save operations with detailed error information for travel spot operations, travel spot media uploads, travel spot social media link management, music file uploads, and map settings updates
- Enhanced success/error responses for music album creation and song upload operations with clear feedback
- Enhanced success/error responses for batch music upload operations with clear feedback
- Enhanced success/error responses for map settings operations with clear feedback
- Ensure retrieve endpoint returns saved journey data with proper date filtering
- Ensure retrieve endpoint returns saved travel spot data with type, media, and social media links organized by city with coordinates
- Ensure retrieve endpoint returns saved music album data organized by user for both admin panel and Music panel
- Enhanced retrieve endpoint reliability for music album and song data with proper error handling
- Ensure retrieve endpoint returns saved map settings organized by user
- Ensure travel spot lookup endpoint returns travel spot data with type, coordinates, media, and social media links for any given city name
- Enhanced travel spot media endpoint that reliably returns media files and social media links associated with specific travel spots for both admin panel and popup display with robust URL generation that allows frontend to load media successfully without failures
- Enhanced photo retrieval endpoint that ensures reliable photo loading across all components and interfaces
- Travel spot social media link lookup endpoint that returns validated YouTube and Instagram video URLs for any given travel spot with automatic updates when new links are added
- Travel spot media lookup endpoint that returns media files for any given travel spot with reliable URL generation
- Music album lookup endpoint that returns music files and album data for any given user with reliable URL generation for both admin panel and Music panel
- Enhanced music album and song lookup endpoints with improved reliability and error handling
- Music file lookup endpoint for bottom music player bar that returns audio files with metadata and reliable URL generation
- Music file lookup endpoint for Music panel that returns audio files with metadata and reliable URL generation for song selection
- Map settings lookup endpoint that returns display settings for any given user
- Comprehensive file format validation for travel spot media and music files (JPEG, PNG, WebP, AVIF, MP4, MOV, MP3, WAV, FLAC, AAC) with proper error responses
- Enhanced social media URL validation for YouTube and Instagram video links with improved error responses for invalid URLs and better feedback
- Travel spot social media URL validation for YouTube and Instagram video links with improved error responses for invalid URLs and better feedback
- Map settings validation for display settings with proper error responses
- Robust file upload processing that handles various file sizes and formats without corruption for travel spots and music albums
- Enhanced music file upload processing with improved reliability and error handling
- Batch music file upload processing that handles multiple files simultaneously without corruption
- Map settings processing that handles settings updates without errors
- Enhanced handling of media file metadata and storage optimization with reliable URL generation for frontend access that prevents loading issues and ensures consistent media display
- Enhanced photo processing and storage system that ensures reliable photo loading and display
- Social media link processing that validates URLs and stores metadata for reliable retrieval with enhanced error handling
- Travel spot social media link processing that validates URLs and stores metadata for reliable retrieval with enhanced error handling
- Travel spot media processing that handles file uploads and stores metadata for reliable retrieval
- Music file processing that handles audio uploads and stores metadata for reliable retrieval and playback
- Enhanced music file processing with improved reliability and error handling for song uploads
- Batch music file processing that handles multiple audio uploads simultaneously with proper metadata storage
- Map settings processing that handles settings storage and retrieval with proper validation
- Travel spot data validation ensuring required fields including type are provided
- Travel spot coordinate storage and retrieval with geocoding integration
- Travel spot media validation ensuring proper file formats and user authentication
- Travel spot social media link validation ensuring proper URL formats and user authentication
- Music album data validation ensuring required fields are provided
- Music file validation ensuring proper audio formats and user authentication
- Enhanced music album and song validation with improved error handling and feedback
- Batch music upload validation ensuring proper audio formats and user authentication for multiple files
- Map settings validation ensuring proper settings format and user authentication
- User authentication verification for upload operations, travel spot management, travel spot media management, travel spot social media link management, music album management, and map settings management
- Geocoding service integration for determining travel spot coordinates based on travel spot name and city name
- Coordinate accuracy validation to ensure travel spot pins are placed at correct real-world locations
- Travel spot type field storage and retrieval that accepts and stores any text input from the user for the travel spot type
- Travel spot type validation to ensure the type field is not empty and is properly saved and returned to the frontend
- Music metadata storage and retrieval with optional song title and artist fields
- Map settings metadata storage and retrieval with user-specific settings
- Robust error handling and recovery mechanisms for file upload operations, travel spot media management, travel spot social media link management, music file management, and map settings management to ensure users can upload files, add social media links, and update settings without errors
- Enhanced backend reliability for travel spot save operations, travel spot media operations, travel spot social media link operations, music album operations, and map settings operations to ensure users can save travel spots, upload media, add social media links, and update settings without errors
- Enhanced backend reliability for music album creation and song upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for batch music upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for map settings operations with improved error handling and recovery mechanisms
- Comprehensive backend validation and error recovery mechanisms for all save operations including travel spot media, travel spot social media links, music files, and map settings to prevent data corruption and ensure successful persistence
- Enhanced backend validation and error recovery for music album creation and song upload operations
- Enhanced backend validation and error recovery for batch music upload operations
- Enhanced backend validation and error recovery for map settings operations
- Enhanced social media link validation system with improved error handling and user feedback
- Travel spot social media link validation system with improved error handling and user feedback
- Robust social media link storage and retrieval system that ensures reliable display in popup Social Media tabs
- Travel spot social media link storage and retrieval system that ensures reliable display in travel spot popup Social Media tabs
- Travel spot media storage and retrieval system that ensures reliable display in travel spot popup media galleries
- Music album storage and retrieval system that ensures reliable audio playback and library management
- Enhanced music album storage and retrieval system with improved reliability for album creation and song upload operations
- Enhanced music album storage and retrieval system with support for batch music uploads
- Map settings storage and retrieval system that ensures reliable settings management and application

## User Flow
1. User opens the application
2. User sees a fullscreen, ultra-clear 3D interactive globe using Three.js with high-resolution raster textures and vector tile overlays
3. User can interact with the 3D globe using smooth orbit controls to rotate and zoom
4. User can see crisp, legible labels and borders on the globe with Level of Detail (LOD) system showing more detail as they zoom in
5. User can see authentication status and authentication button positioned directly below the Website Layout button in the upper right corner vertical button stack
6. User can see Music icon in the upper right corner at the same level as the admin control panel and authentication button
7. User can see Day/Night Terminator and Day/Night Visualization panels repositioned to the bottom of the UI page along the lower edge with simplified appearance
8. User can interact with the bottom Day/Night Terminator panel including Yellow "Terminator" button, Purple "Twilight" button, and "Real" button (renamed from "Real Time")
9. User can interact with the bottom Day/Night Visualization panel with all existing functionality and controls
10. Day/Night Terminator and Day/Night Visualization panels maintain their alignment, functionality, and styles exactly as before while being positioned at the bottom of the UI page
11. Day/Night Terminator and Day/Night Visualization panels have simplified appearance achieved by removing the outer container layer and keeping only the inner content layer visible while preserving all functionality
12. User can choose to browse as guest or authenticate via Internet Identity for full functionality
13. User sees two small toggle buttons labeled "3D" and "2D" positioned within the search bar with grey color styling for visual distinction from the white search bar background
14. User sees search bar positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
15. User sees grey magnifier icon positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative
16. User sees three buttons positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment: City, Show Time Zones, and World
17. User can hover over or click the City button to reveal the collapsible "World Travel Hotspot" panel that appears at the bottom of the UI page along the lower edge
18. "World Travel Hotspot" panel displays all existing functionality including Capitals, Global Cities, and Major Cities toggles with preserved behavior
19. User can interact with the Capitals, Global Cities, and Major Cities toggles in the "World Travel Hotspot" panel to control city display on the 3D globe
20. User can collapse the "World Travel Hotspot" panel by clicking elsewhere or re-clicking the City button
21. 3D globe rendering, initialization, and city display layers remain completely unaffected and fully functional
22. User can click the "Show Time Zones" button which maintains its click functionality and preserves all current behavior
23. "UTC Offset" panel appears when the "Show Time Zones" button is activated, positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance
24. "UTC Offset" panel maintains its current design, alignment, and interactivity consistent with the existing layout
25. User can interact with the "UTC Offset" panel controls and functionality
26. "UTC Offset" panel positioning ensures it does not interfere with other UI elements
27. User can collapse the "UTC Offset" panel by clicking elsewhere or re-clicking the "Show Time Zones" button
28. User can click the "World" button to open the collapsible World panel that contains the "3D Rotation Speed" and "3D Country Font Size" sliders, but these slider panels are repositioned to the bottom of the UI page along the lower edge
29. World collapsible slider panels appear at the bottom of the UI page when the World button is activated
30. User can interact with the "3D Rotation Speed" and "3D Country Font Size" sliders within the repositioned panels, maintaining all existing functionality and event handling
31. World collapsible slider panels positioning ensures they do not interfere with other UI elements
32. User can collapse the World collapsible slider panels by clicking elsewhere or re-clicking the "World" button
33. Visual consistency is preserved for the sliders within the repositioned panels
34. Layout integration ensures proper visual hierarchy while maintaining operational integrity
35. All slider controls and functionality work exactly as before, just relocated to the bottom positioning
36. All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
37. User can click the "3D" or "2D" toggle buttons to instantly switch between the 3D interactive globe and 2D map view at any time
38. When user clicks the "2D" button, the application automatically performs a search for Zurich and displays the 2D map view centered on that location
39. UI updates instantly when toggling between 3D and 2D modes with smooth transitions and seamless user experience
40. Toggle buttons show clear visual indication of which mode is currently active (3D or 2D)
41. Toggle buttons are visually integrated into the search bar design for easy access and user-friendly interface
42. User can hover over or focus on the "3D" toggle button to see a tooltip displaying: "Interactive 3D Globe with Personalized Travel Map" followed by "Drag to rotate • Scroll to zoom • Click country to highlight • Click ocean to deselect Animated arcs from zurich to your traveled cities Watch for start city labels, ripple effects, and arrival city labels when arcs animate!"
43. User can hover over or focus on the "2D" toggle button to see a tooltip displaying relevant 2D map functionality and search capabilities
44. User sees a search bar positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
45. User types a location name (country, city, or town) in the search bar
46. User submits the search by pressing Enter key only
47. Application validates the location name using geocoding API and provides feedback
48. If location is found: 3D globe seamlessly transitions to interactive map centered on the specified location with zoom level 15 for every search (or map view appears if already in 2D mode)
49. Every search result always sets the map zoom level to 15, regardless of previous or subsequent searches
50. If location is not found: Application displays clear error message with suggestions while maintaining the current view (3D globe or 2D map)
51. User can continue to use the 3D/2D toggle buttons to switch views even after performing searches
52. User can zoom in/out freely with no restrictions and explore the map with full interactivity
53. User can pan and zoom the map beyond the initially preset zoom level after searching
54. Map preserves user's manual zoom and pan adjustments without automatic re-centering on the red text until a new search is performed
55. Map remains at the user's chosen view and zoom level until a new search is performed
56. Map displays fixed-size plain red text visualization for searched places:
    - Searched place name displayed as plain red text positioned directly at the searched location coordinates
    - Text maintains consistent visual size regardless of current map zoom level
    - Text size remains completely fixed and does not scale with map zoom operations
    - Text appears at the same visual size whether zooming in to level 20 or zooming out to level 5
    - Text size is locked to a fixed pixel size that never changes based on map zoom level
    - Text is clearly visible and styled for clarity with red color
    - Text appears at the exact searched coordinates without any background, rectangle, or connection line
    - Only the plain red text is used for displaying the searched location name
    - Text replaces any previous icon, label, rectangle, or line overlays for the searched place
    - Text is non-interactive and does not respond to clicks or hover events
    - Fixed-size behavior applies only to the red text label for searched locations and does not affect other map elements
57. Map displays travel spot pins for the searched city using the original pin/marker style (not enlarged)
58. Travel spot pins are positioned at the exact real-world geographic coordinates of each specific travel spot location using geocoding
59. Left-side info box appears after performing a search displaying only the world logo and the searched location name
60. Left-side info box does not display the type of search (country, city, town, etc.)
61. Left-side info box maintains clean, minimal appearance focused on the location name
62. User can click anywhere on the 2D map to create a star-shaped bookmark marker at that exact location
63. Map click event handler detects the click and extracts the coordinates from e.latlng
64. Modern, minimal "+ Bookmark" button appears when user left-clicks on the map with visually appealing design featuring:
    - Subtle shadow for depth and visual separation from map background
    - Rounded corners for modern, friendly appearance
    - Light blue or ivory color scheme that matches the app's overall aesthetic
    - Soft border for refined appearance
    - Star or bookmark icon to clearly indicate functionality
    - Modern typography and minimal design approach
    - Easy clickability with appropriate button size and hover states
    - Pointer cursor (cursor: pointer) when hovered to clearly indicate it is clickable and interactive
    - Clear visual distinction from other map elements including travel spot pins and search location text
65. Application creates a new star-shaped bookmark marker at the clicked coordinates
66. Application adds the marker to the map and binds a popup displaying the coordinates or custom message
67. Application opens the popup immediately after marker placement
68. Star-shaped bookmark markers are visually distinct from travel spot pins and search location text
69. User can create multiple bookmark markers by clicking different locations on the map
70. Bookmark markers persist until the page is refreshed or map is reset
71. User clicks on a travel spot pin to open a travel spot popup displaying the travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below, and travel spot media gallery
72. Travel spot popup appears to the right of the pin with dynamic positioning that ensures proper alignment and no overlap with the pin or map controls
73. Travel spot popup displays at standard popup size for consistent appearance
74. Travel spot popup displays the travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below if provided
75. Travel spot popup displays media gallery organized into three distinct tabs positioned side by side in horizontal order:
    - "Social Media" tab showing embedded YouTube and Instagram videos uploaded for that specific travel spot with proper embedding and direct playable functionality within the popup
    - "Photos" tab showing all images (JPEG, PNG, WebP, AVIF) uploaded for that specific travel spot with reliable loading and proper display
    - "Videos" tab showing all videos (MP4, MOV) uploaded for that specific travel spot with reliable loading and proper display, with audio enabled by default and full interactivity
    - Tab interface allows easy switching between social media, photos, and videos content without scrolling
76. User can easily switch between "Social Media", "Photos", and "Videos" tabs using the side-by-side tab interface in travel spot popups
77. Social Media tab displays embedded YouTube and Instagram videos with proper embedding and direct playable functionality within the popup that automatically updates when new social media links are added
78. User can play YouTube and Instagram videos directly within the Social Media tab without leaving the application
79. Embedded video players in the Social Media tab are fully functional and allow direct playback
80. Travel spot media files display correctly with reliable URLs, correct aspect ratios, and are fully visible without being blacked out, corrupted, or stuck in loading state
81. Travel spot social media videos display correctly with proper embedding and are fully functional within the Social Media tab with direct playback capability
82. Travel spot videos are fully interactive with audio enabled by default, not muted or blocked, ensuring proper playback functionality when clicked
83. Travel spot media gallery successfully transitions from loading state to displaying actual uploaded media files and social media videos
84. Media gallery handles loading and error states gracefully with appropriate fallback displays and retry mechanisms
85. Travel spot media gallery automatically reflects any new uploads and social media videos made to that travel spot
86. User can click on any image within the travel spot popup to open it in lovely album style fullscreen viewer showing only that travel spot's photos
87. User can click on any social media video within the travel spot popup to expand it to a larger view for immersive playback similar to the photo/video gallery experience
88. User can click on any video within the travel spot popup to play it correctly with full audio and interactive controls enabled
89. Lovely album style fullscreen viewer opens with:
    - Clean, immersive design focused entirely on photo viewing experience
    - Main image display showing the selected photo prominently
    - Elegant navigation system allowing switching between all photos in the album (carousel or thumbnail strip)
    - Smooth transitions between images for polished viewing experience
    - Visually appealing layout that enhances photo viewing
    - No close button or photo details to maintain clean, immersive experience
    - Easy and elegant image switching with intuitive navigation controls
    - Display only photos from travel spot media, excluding videos
    - Adaptive aspect ratio display that determines the aspect ratio of the initially clicked photo and displays all images in the album using that same aspect ratio mode (portrait or landscape) for consistent viewing experience throughout the session
90. Social media video expansion opens with:
    - Larger view display for better viewing experience and immersive playback
    - Proper video controls and playback functionality for both YouTube and Instagram videos
    - Clean interface focused on video viewing experience
    - Easy navigation between social media videos if multiple are available
    - Maintains video quality and aspect ratio during expansion
    - Full embedded video player functionality in the expanded view
    - Seamless playback experience without leaving the application
91. When user clicks on a portrait photo, all images in the album are displayed in portrait mode for the entire viewing session
92. When user clicks on a landscape photo, all images in the album are displayed in landscape mode for the entire viewing session
93. Enhanced fullscreen album viewer displays images with intelligent scaling:
    - For landscape images: scales width to be close to the length of the search bar while maintaining aspect ratio
    - For portrait images: scales height to be similar to the height of the map window while maintaining aspect ratio
94. Fullscreen album viewer is properly layered above all UI elements with proper aspect ratio preservation
95. User can navigate elegantly between all photos in the album using the navigation system while maintaining the consistent aspect ratio mode
96. User can close any popup at any time by clicking the tiny "X" close button positioned at the upper right corner of the popup
97. User can search for a different location to update the map display, and travel spot pins will reflect the new search term
98. User can click on the Music icon in the upper right corner to open the dedicated Music panel
99. Music panel opens displaying the user's music albums and songs in an organized format
100. User can browse through music albums and songs in the Music panel without needing to access the full admin control panel
101. User can click on any song in the Music panel to immediately change the currently playing song in the bottom music player bar with smooth and responsive playback
102. Song selection from the Music panel updates the bottom music player bar to play the selected song immediately and responsively
103. Music panel provides quick access to music library and song selection functionality
104. Non-authenticated users see appropriate messaging when attempting to access the Music panel
105. User can access the admin control panel in the upper right corner by clicking the horizontal lines icon, which always appears above the map
106. User can navigate between main sections arranged in a vertical accordion-style menu: "Trip Management", "Travel Spot", and "Music Album"
107. Each panel expands only when clicked, creating an accordion-style interface where only one panel can be expanded at a time
108. User can navigate to the Trip Management section within the admin panel
109. User can add new journeys by clicking the fully functional "+Journey" button which immediately and reliably opens the journey creation dialog every time
110. User can set journey dates in the past or future when creating a new journey
111. Application automatically categorizes journeys as "Upcoming" or "Previous" based on their dates
112. User can edit or delete existing journey entries
113. User can view all journeys organized into "Upcoming" and "Previous" sections with automatic categorization
114. User can navigate to the Travel Spot section within the admin panel
115. User can select a city using the interface that includes:
    - "Existing Cities" button list displaying all cities that have been previously used in the system
    - "Enter City Name" input field for typing in new city names
116. User can add new travel spots by providing:
    - Travel spot type (required) as free text input with placeholder text showing recommended types: "Hotel, Restaurant, Shopping, Heritage, Relax, Others"
    - Travel spot name (required)
    - Optional description
    - Media files (photos and videos) for the travel spot
    - Social media videos (YouTube and Instagram links) for the travel spot
117. Travel spot type input field appears above the spot name input field in the "Add New Travel Spot" form
118. Travel spot type input field accepts any text input and includes placeholder text specifying the recommended types
119. User can enter any travel spot type as free text when adding or editing a travel spot
120. Authenticated users can reliably upload multiple images (JPEG, PNG, WebP, AVIF) and videos (MP4, MOV) for each travel spot with smooth upload process and proper validation
121. Authenticated users can add YouTube and Instagram video links for each travel spot using the social media videos input area positioned below the Travel Spot Media field including:
    - Separate input field for YouTube video URLs with clear labeling
    - Separate input field for Instagram video URLs with clear labeling
    - "Add YouTube Link" button with proper validation and feedback
    - "Add Instagram Link" button with proper validation and feedback
    - Real-time URL validation and clear feedback
    - Clear success messages when social media links are successfully added
    - Clear error messages for invalid URLs or unsupported platforms
    - Visual confirmation showing the added social media links in the interface
122. Authenticated users can manage (add, edit, remove) social media links for each travel spot with clear visual distinction between YouTube and Instagram links
123. User can view all travel spots associated with the selected city in a list format showing type, name, description, media count, and social media video count
124. User can edit existing travel spots to modify type, name, description, manage media files, and manage social media videos
125. Travel spot type input field in edit mode accepts any text input with placeholder text showing recommended types
126. User can delete travel spots with confirmation dialog
127. User receives success and error feedback for travel spot operations including media uploads and social media video management
128. Entered travel spot type is properly saved and displayed in the travel spot list and on map popups
129. Users can view uploaded media and social media videos for each travel spot in a comprehensive gallery format with layout that properly displays both portrait and landscape orientations
130. Travel spot photos, videos, and social media videos display reliably in the gallery without loading issues, corruption, or endless loading states
131. Users can delete individual media files and social media videos from travel spots
132. Users can replace existing media files with new uploads for travel spots
133. Users can edit or update existing social media links for travel spots
134. User can navigate to the Music Album section within the admin panel
135. Authenticated users can create and manage personal music albums
136. Authenticated users can create new albums using the fully functional "+ Create Album" button that responds reliably and consistently opens the album creation dialog every time it is clicked
137. Album creation dialog opens immediately and reliably when the "+ Create Album" button is clicked without any delays or failures
138. Authenticated users can reliably upload multiple audio files (MP3, WAV, FLAC, AAC) with smooth upload process and proper validation
139. Authenticated users can upload multiple music files at once to a music album using batch upload functionality
140. Users can upload songs to albums without errors with clear feedback on success or failure
141. Song upload and management works smoothly with reliable error handling and recovery mechanisms
142. Batch music upload works smoothly with reliable error handling and recovery mechanisms for multiple files
143. Authenticated users can create custom album collections with titles and descriptions
144. Authenticated users can organize songs into different albums
145. Authenticated users can upload album cover images
146. Users can provide optional song title and artist information when uploading music files
147. Users can edit song metadata including optional title and artist fields after upload
148. Users can play uploaded songs using the built-in audio player with standard controls (play, pause, skip, volume, progress) within the admin panel
149. Users can view all uploaded songs in a comprehensive library with search and filter functionality
150. Users can view all uploaded songs within each album
151. Users can delete individual songs or entire albums
152. Non-authenticated users see clear messaging about needing to log in to access music upload functionality
153. Bottom music player bar appears at the bottom of the website with ultra-slim profile (height reduced by approximately 3 times from original) and remains visible at all times while browsing (when enabled by user preference)
154. Bottom music player bar displays all song details (title, artist, album) elegantly in a clean and attractive light blue-themed layout with readable typography and visual balance between song information and controls
155. Bottom music player bar features light blue color scheme for a more visually appealing look with cozy, inviting design elements:
    - Light blue color palette with complementary tones for a fresh, appealing appearance
    - Rounded corners throughout the interface for a gentle, welcoming appearance
    - Minimalist icons with clean, simple designs that complement the light blue theme
    - Smooth gradients and subtle shadows for visual depth
    - Typography that feels modern and approachable, matching light blue aesthetics
    - Overall design that creates a pleasant, modern aesthetic with light blue theming
156. Bottom music player bar provides playback controls including:
    - Play/pause button for current song playback control with minimalist light blue-themed icon
    - Skip forward and backward buttons for navigation between songs with elegant rounded design in light blue theme
    - Volume control slider for adjusting playback volume with soft, rounded styling in light blue theme
    - Progress bar for showing playback position and seeking with smooth, light blue-inspired design
157. Bottom music player bar shows playback time display with current time and total duration using clean, minimalist formatting
158. Bottom music player bar allows users to control music playback without accessing the admin panel
159. Bottom music player bar plays songs from the user's uploaded Music Album collection
160. Bottom music player bar supports continuous playback through albums and maintains playback state across different pages
161. Bottom music player bar provides visual feedback for current playback status (playing, paused, loading) with light blue-themed indicators
162. Bottom music player bar handles audio file loading and buffering smoothly for all supported formats
163. Bottom music player bar integrates seamlessly with the Music Album management system and Music panel
164. Bottom music player bar functionality is only available when user has uploaded songs to their Music Album
165. Bottom music player bar is responsive to different screen sizes while maintaining its ultra-slim profile and light blue aesthetic
166. Bottom music player bar updates immediately when a song is selected from the Music panel with smooth and responsive playbook
167. Journey data, travel spot data with type, travel spot media data, travel spot social media videos, music album data, and map settings persist across sessions with guaranteed reliability
168. When user searches for a city, travel spot pins appear on the map for all travel spots associated with that city
169. Travel spot pins are positioned at the exact real-world geographic coordinates of each specific travel spot location using geocoding
170. When user clicks on a travel spot pin, a popup displays the travel spot name as main title with travel spot type positioned immediately to the right of the place name, followed by description below, and travel spot media gallery with social media, photos, and videos tabs in horizontal order
171. Uploaded travel spot media files and social media content in travel spot popup gallery display correctly and reliably without remaining in loading state, showing actual JPEG, PNG, WebP, AVIF, MP4, and MOV content and embedded social media videos that transition properly and consistently from loading to displaying media in separate social media, photos, and videos tabs
172. Travel spot media in the popup gallery load reliably and display properly without loading issues
173. Travel spot social media videos in the popup Social Media tab display correctly with proper embedding, direct playback functionality, and automatic updates when new links are added
174. Travel spot videos in the popup gallery are fully interactive with audio enabled by default and play correctly when clicked
175. User can click on images within the travel spot popup to view them in lovely album style fullscreen viewer with elegant navigation between all travel spot photos and adaptive aspect ratio display
176. User can click on social media videos within the travel spot popup to expand them to a larger view for immersive playback with proper video controls and full embedded video player functionality
177. User can click on videos within the travel spot popup to play them correctly with full audio and interactive controls enabled
178. Journey data, travel spot data with type, travel spot media data, travel spot social media videos, music album data, and map settings persist across sessions
179. User authentication state persists across browser sessions
180. Travel spot pins are positioned with the same accuracy as when searching for that specific location directly in the main search
181. Users can upload files, add social media links, save travel spots, upload travel spot media, add travel spot social media videos, create music albums, upload music files, and update map settings without errors due to improved backend reliability and error handling
182. Users can upload multiple music files at once to albums using batch upload functionality without errors
183. File upload operations, social media link additions, travel spot media uploads, travel spot social media video additions, music album creation, music file uploads, and map settings updates complete successfully with proper error recovery mechanisms
184. Batch music upload operations complete successfully with proper error recovery mechanisms
185. Music album creation and song upload operations work reliably with clear feedback on success or failure
186. Map settings updates work reliably with immediate visual feedback
187. Social media link additions provide clear feedback and validation with enhanced error handling
188. Travel spot social media video additions provide clear feedback and validation with enhanced error handling
189. Travel spot save operations, travel spot media uploads, travel spot social media video operations, music album operations, and map settings operations complete successfully with enhanced backend stability
190. Social media link validation ensures only valid YouTube and Instagram video URLs are accepted and stored with improved error handling
191. Travel spot social media link validation ensures only valid YouTube and Instagram video URLs are accepted and stored with improved error handling
192. Social media videos display properly in the Social Media tab with reliable embedding, direct playback functionality, and automatic updates
193. Travel spot social media videos display properly in the Social Media tab with reliable embedding, direct playback functionality, and automatic updates
194. Travel spot media uploads, travel spot social media video management, music file uploads, and map settings updates provide clear feedback and validation with proper error handling
195. Added travel spot social media links appear immediately in the travel spot popup Social Media tab after being added through the admin panel with embedded video players
196. Uploaded travel spot media appears immediately in the travel spot popup media gallery after being uploaded through the admin panel
197. Uploaded music files appear immediately in the music library, Music panel, and are available for playback in the bottom music player bar after being uploaded through the admin panel
198. Map settings changes take immediate effect in the user interface after being updated through the admin panel
199. Travel spot social media video expansion functionality works properly when clicking on social media videos in the travel spot popup, providing immersive playback experience
200. Travel spot video playback functionality works properly when clicking on videos in the travel spot popup, providing full audio and interactive controls
201. Music playback functionality works properly with built-in audio player controls and standard functionality within the admin panel
202. Bottom music player bar playback functionality works properly with continuous playback and standard controls in ultra-slim profile with light blue aesthetic
203. Music panel song selection functionality works properly with immediate song switching in the bottom music player bar with smooth and responsive playback
204. User can play travel spot social media videos directly within both the travel spot popup Social Media tab and the expanded view without leaving the application
205. User can play travel spot videos directly within the travel spot popup with full audio and interactive controls enabled
206. User can play music files directly within the music library with full audio controls and functionality
207. User can play music files directly through the bottom music player bar with full audio controls and functionality in the ultra-slim, light blue-styled interface
208. User can select songs from the Music panel to immediately change the currently playing song in the bottom music player bar with smooth and responsive playback
209. User can create new music albums using the fully functional "+ Create Album" button that responds reliably and opens the album creation dialog consistently
210. User can upload songs to created albums without errors with smooth upload process and clear success/failure feedback
211. User can upload multiple songs at once to albums using batch upload functionality with smooth process and clear feedback
212. Main search displays fixed-size plain red text at the searched location coordinates without any background, rectangle, or connection line
213. Red text maintains consistent visual size regardless of current map zoom level
214. Red text size remains completely fixed and does not scale with map zoom operations
215. Red text appears at the same visual size whether zooming in to level 20 or zooming out to level 5
216. Red text size is locked to a fixed pixel size that never changes based on map zoom level
217. Red text is non-interactive and does not respond to clicks or hover events
218. Fixed-size behavior applies only to the red text label for searched locations and does not affect other map elements
219. Travel spot pins display using the original pin/marker style for clear distinction from the main search red text
220. Star-shaped bookmark markers display using a visually distinct style from both travel spot pins and search location text
221. Bottom music player bar maintains playback state and continues playing music while user navigates between different sections of the application (when enabled) with ultra-slim profile and light blue aesthetic
222. Bottom music player bar displays with ultra-slim height (reduced by approximately 3 times from original) while maintaining all functionality and light blue-styled aesthetic with cozy, inviting design elements
223. 3D globe reappears when the page is refreshed or when no search has been performed, providing the initial interactive experience
224. User can use the 3D/2D toggle buttons positioned within the search bar to switch between views at any time, maintaining the toggle state independently of search functionality
225. Toggle buttons remain accessible and functional throughout the application experience with clear visual indication of active mode
226. Smooth transitions between 3D globe and 2D map views when toggling with visually integrated search bar design
227. Search bar and toggle buttons maintain visual integration and user-friendly design throughout the application experience
228. When user clicks "2D" toggle button, the application automatically searches for Zurich instead of a hardcoded location
229. Main interface elements (search bar, admin controls, authentication button, music icon) are fully transparent and overlay correctly on top of the map
230. All UI elements are visible and interactive while the map (both 2D and 3D) remains visible in the background
231. App loads and displays as expected with all interface components accessible and properly layered
232. User can hover over the "+ Bookmark" button to see a pointer cursor (cursor: pointer) that clearly indicates the button is clickable and interactive
233. The "+ Bookmark" button retains its modern, minimal, and visually appealing style while providing better user experience with the pointer cursor

## Search Requirements
- Support for common location name variations and alternate spellings
- Support for city and town abbreviations and alternative names
- Case-insensitive search functionality
- Proper handling of locations with multiple names or official designations
- Clear feedback mechanism for unsuccessful searches
- Consistent map positioning with zoom level 15 for all location types and every search result
- Every search result always sets the map zoom level to 15, regardless of previous or subsequent searches
- Worldwide coverage for cities and towns through reliable geocoding service
- Search bar positioned at the very top of the UI, aligned horizontally at the same height level as the City button and the Admin Control Panel button for consistency, with white background color for better visual contrast and reduced width by 50% from its original length for a more compact appearance
- Grey magnifier icon positioned at the start inside the search input field (similar to Google's search icon) that is non-clickable and decorative
- Search functionality triggered by pressing Enter key only
- Contextual help accessible through toggle button tooltips for 3D and 2D functionality
- Fullscreen 3D interactive globe displayed before any search is performed
- Seamless transition from 3D globe to map view upon successful search
- Search functionality works in both 3D and 2D modes
- Toggle buttons for switching between 3D globe and 2D map views positioned within the search bar with grey color styling for visual distinction from the white search bar background
- Three buttons positioned vertically stacked at the upper left corner of the UI page with proper vertical spacing and alignment: City, Show Time Zones, and World
- City button features collapsible "World Travel Hotspot" panel, but the panel is repositioned to the bottom of the UI page along the lower edge
- "World Travel Hotspot" panel appears at the bottom of the UI page when the City button is activated
- "World Travel Hotspot" panel maintains all existing functionality including Capitals, Global Cities, and Major Cities toggles
- "World Travel Hotspot" panel positioning at the bottom ensures it does not interfere with other UI elements
- "World Travel Hotspot" panel can be collapsed by clicking elsewhere or re-clicking the City button
- City button preserves all current functionality without changing its layout or behavior
- "Show Time Zones" button positioned below the City button with consistent sizing and vertical alignment
- "Show Time Zones" button displays a time logo icon while maintaining its current size and layout
- "Show Time Zones" button maintains its click functionality and preserves all current behavior
- "UTC Offset" panel appears when the "Show Time Zones" button is activated, positioned at the bottom of the UI page along the lower edge and featuring a compact design with shortened width (reduced by approximately one-third) for improved visual appearance
- "UTC Offset" panel maintains its current design, alignment, and interactivity consistent with the existing layout
- "UTC Offset" panel positioning ensures it does not interfere with other UI elements
- "UTC Offset" panel can be collapsed by clicking elsewhere or re-clicking the "Show Time Zones" button
- "World" button positioned below the "Show Time Zones" button with consistent sizing and vertical alignment
- World collapsible panel contains the "3D Rotation Speed" and "3D Country Font Size" sliders, but these slider panels are repositioned to the bottom of the UI page along the lower edge
- World collapsible slider panels appear at the bottom of the UI page when the World button is activated
- World collapsible slider panels positioning ensures they do not interfere with other UI elements
- World collapsible slider panels can be collapsed by clicking elsewhere or re-clicking the "World" button
- All 3D globe functionalities, interactivity, and slider behavior remain completely unaffected after repositioning
- Automatic search for Zurich when "2D" toggle button is clicked
- Toggle buttons visually integrated into the search bar design for easy access and user-friendly interface
- Tooltip functionality for toggle buttons providing contextual help for each view mode

## Data Storage Requirements
- Backend must store user authentication information and session data
- Backend must store travel journey information including:
  - City name
  - Start date
  - End date
  - Creation and modification timestamps
- Backend must store travel spot information including:
  - City name association
  - User identity association
  - Travel spot type (as free text input from user)
  - Travel spot name
  - Travel spot description (optional)
  - Travel spot coordinates (latitude and longitude) obtained through geocoding
  - Travel spot media file data (images and videos) with robust storage mechanisms and enhanced URL generation that ensures frontend can load media properly and reliably
  - Travel spot social media links (YouTube and Instagram video URLs) with enhanced validation, storage, and error handling
  - Travel spot media file metadata (filename, format, file size, upload timestamp)
  - Travel spot social media link metadata (URL, platform type, addition timestamp)
  - Creation and modification timestamps
- Backend must store music album information including:
  - User identity association
  - Album titles and descriptions
  - Song metadata with optional title and artist fields
  - Audio file data with robust storage mechanisms and enhanced URL generation
  - Album cover images
  - Audio file metadata (filename, format, duration, file size, upload timestamp)
  - Support for MP3, WAV, FLAC, and AAC formats with comprehensive validation
  - Creation and modification timestamps
  - Support for batch music uploads with multiple files per album
- Enhanced music album storage with improved reliability for album creation and song upload operations
- Backend must store map settings:
  - User identity association
  - Display settings and toggles
  - Map preference metadata (creation and modification timestamps)
- Data must persist across browser sessions with guaranteed reliability
- Support for multiple journey entries
- Support for multiple travel spots per city with proper data management, type storage, coordinate storage, media storage, and social media link storage
- Support for multiple music albums and songs per user with reliable concurrent handling and user authentication
- Support for multiple media files and social media links per travel spot with reliable concurrent handling and user authentication
- Support for batch music uploads with multiple files per album upload operation
- Support for user-specific map settings with reliable storage and retrieval
- Maintain data integrity during save operations
- Provide confirmation responses for successful save operations
- Implement actual persistent storage for journey data, travel spot data with type, travel spot media data, travel spot social media links, music album data, and map settings with user association and coordinates
- Enhanced persistent storage for music album creation and song upload operations with improved reliability
- Enhanced persistent storage for batch music upload operations with improved reliability
- Enhanced persistent storage for map settings operations with improved reliability
- Ensure saved journeys can be retrieved and displayed in the admin panel
- Ensure saved travel spots with type, media, and social media links can be retrieved and displayed in the admin panel and as pins on the map with accurate coordinates
- Ensure saved music albums and songs can be retrieved and displayed in the music library and Music panel
- Ensure saved music files can be retrieved and played in the bottom music player bar
- Ensure saved map settings can be retrieved and applied to control default search place
- Enhanced retrieval system for music albums and songs with improved reliability and error handling
- Enhanced system to ensure travel spot media and social media links can be reliably retrieved and displayed by travel spot ID for both admin panel and popup display with robust URL generation that allows frontend to load media successfully without failures or endless loading
- Enhanced system to ensure music files can be reliably retrieved and played in the music library, Music panel, and bottom music player bar with robust URL generation that allows frontend to load audio successfully without failures
- Enhanced system to ensure map settings can be reliably retrieved and applied to control user interface elements
- Enhanced photo retrieval system that ensures reliable photo loading in both admin panel and popup galleries
- Travel spot social media link retrieval system that ensures reliable display in travel spot popup Social Media tabs with automatic updates
- Travel spot media retrieval system that ensures reliable display in travel spot popup media galleries
- Music file retrieval system that ensures reliable audio playback and library management
- Enhanced music file retrieval system with improved reliability for song playback, library management, Music panel display, and bottom music player bar functionality
- Map settings retrieval system that ensures reliable settings application and user interface control
- Comprehensive file format validation and reliable storage for travel spot media files and music files with authentication checks
- Enhanced social media URL validation and reliable storage for YouTube and Instagram video links with authentication checks and improved error handling
- Travel spot social media URL validation and reliable storage for YouTube and Instagram video links with authentication checks and improved error handling
- Map settings validation and reliable storage for display settings with authentication checks
- Robust error handling and recovery mechanisms for media file operations, travel spot operations, travel spot media operations, travel spot social media link operations, music file operations, and map settings operations
- Enhanced error handling and recovery mechanisms for music album creation and song upload operations
- Enhanced error handling and recovery mechanisms for batch music upload operations
- Enhanced error handling and recovery mechanisms for map settings operations
- User identity verification for protected data operations
- Enhanced URL generation for media files to ensure reliable loading and display in frontend components without loading issues, blacked-out content, or endless loading states
- Enhanced photo URL generation system that ensures reliable photo loading across all components
- Robust media serving system that allows frontend to successfully access and display uploaded media files without loading issues, failures, or endless loading states
- Travel spot social media link serving system that provides validated URLs for embedding YouTube and Instagram videos with automatic updates
- Travel spot media serving system that ensures reliable media loading and display for travel spot galleries
- Music file serving system that ensures reliable audio loading and playback for music libraries, Music panel, and bottom music player bar
- Enhanced music file serving system with improved reliability for song playback, album management, Music panel functionality, and bottom music player bar functionality
- Map settings serving system that ensures reliable settings retrieval and application to user interface elements
- Travel spot data validation ensuring required fields including type are provided and proper association with cities and users
- Travel spot coordinate storage and retrieval with geocoding integration for accurate pin placement
- Travel spot media validation ensuring proper file formats and user authentication
- Travel spot social media link validation ensuring proper URL formats and user authentication
- Music album data validation ensuring required fields are provided and proper association with users
- Music file validation ensuring proper audio formats and user authentication
- Enhanced music album and song validation with improved error handling and feedback
- Batch music upload validation ensuring proper audio formats and user authentication for multiple files
- Map settings validation ensuring proper settings format and user authentication
- Geocoding service integration for determining precise travel spot coordinates based on travel spot name and city name
- Travel spot type field storage and retrieval that accepts and stores any text input from the user for the travel spot type
- Travel spot type validation to ensure the type field is not empty and is properly saved and returned to the frontend
- Music metadata storage and retrieval with optional song title and artist fields
- Map settings metadata storage and retrieval with user-specific settings
- Robust error handling and recovery mechanisms for file upload operations, travel spot media management, travel spot social media link management, music file management, and map settings management to ensure users can upload files, add social media links, and update settings without errors
- Enhanced backend reliability for travel spot save operations, travel spot media operations, travel spot social media link operations, music album operations, and map settings operations to ensure users can save travel spots, upload media, add social media links, and update settings without errors
- Enhanced backend reliability for music album creation and song upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for batch music upload operations with improved error handling and recovery mechanisms
- Enhanced backend reliability for map settings operations with improved error handling and recovery mechanisms
- Comprehensive backend validation and error recovery mechanisms for all save operations including travel spot media, travel spot social media links, music files, and map settings to prevent data corruption and ensure successful persistence
- Enhanced backend validation and error recovery for music album creation and song upload operations
- Enhanced backend validation and error recovery for batch music upload operations
- Enhanced backend validation and error recovery for map settings operations
- Enhanced social media link validation system with improved error handling and user feedback
- Travel spot social media link validation system with improved error handling and user feedback
- Robust social media link storage and retrieval system that ensures reliable display in popup Social Media tabs
- Travel spot social media link storage and retrieval system that ensures reliable display in travel spot popup Social Media tabs
- Travel spot media storage and retrieval system that ensures reliable display in travel spot popup media galleries
- Music album storage and retrieval system that ensures reliable audio playback and library management
- Enhanced music album storage and retrieval system with improved reliability for album creation and song upload operations
- Enhanced music album storage and retrieval system with support for batch music uploads
- Map settings storage and retrieval system that ensures reliable settings management and application
