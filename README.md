# Crunchyroll Helper

A Chrome extension that enhances your Crunchyroll experience by displaying anime ratings and providing automatic sorting functionality.

## Features
- Shows rating scores next to anime titles across all Crunchyroll pages
- Automatically sorts anime by rating (highest to lowest) in each section
- Works on multiple page layouts:
  - Homepage
  - Browse pages
  - Simulcast/seasonal pages
- Configurable settings with easy-to-use toggle switches
- Updates dynamically as content loads
- Clean display of rating numbers (e.g., "One Piece (4.7)")

## Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the directory containing the extension files

## Configuration
After installation, you can configure the extension by:
1. Right-clicking the extension icon in Chrome
2. Selecting "Options"
3. Toggle the following settings:
   - Show Ratings: Display rating numbers next to anime titles
   - Sort by Rating: Automatically sort anime by rating in each section

## Project Structure
The extension consists of:
- `manifest.json`: Extension configuration and permissions
- `content.js`: Main script that handles ratings display and sorting
- `background.js`: Manages extension settings and state
- `options.html`: Configuration page UI
- `options.js`: Configuration page functionality

## Technical Details
- Uses MutationObserver for dynamic content handling
- Implements debouncing for performance optimization
- Handles multiple page layouts with unified sorting logic
- Uses Chrome Storage API for persistent settings
- Background script for settings management
- Message passing between components

## Development
To modify the extension:
1. Clone the repository
2. Make your changes
3. Test locally by loading the unpacked extension
4. Submit a pull request with your changes

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)


# Changelog

## [1.2.0] - 2024-11-07
### Added
- Support for simulcast/seasonal page layout
- Background script for settings management
- Unified sorting logic for all page layouts
- Improved error handling

### Changed
- Refactored settings management
- Enhanced content script stability
- Updated documentation

## [1.1.0] - 2024-11-07
### Added
- Configuration page with toggle switches
- Option to enable/disable rating display
- Option to enable/disable automatic sorting
- Persistent settings using Chrome Storage API

### Changed
- Improved performance with debouncing
- Enhanced sorting algorithm with cooldown
- Updated documentation

## [1.0.0] - 2024-11-06
### Added
- Initial release
- Rating display functionality
- Support for all Crunchyroll pages
- Basic sorting functionality