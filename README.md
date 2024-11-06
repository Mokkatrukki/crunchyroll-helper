// README.md
# Crunchyroll Helper

A Chrome extension that enhances your Crunchyroll experience. Currently displays anime ratings directly next to titles.

## Features
- Shows rating scores next to anime titles across all Crunchyroll pages
- Works on both homepage and browsing pages
- Updates dynamically as content loads
- Clean display of rating numbers (e.g., "One Piece (4.7)")

## Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the directory containing the extension files

## Development
The extension consists of:
- `manifest.json`: Extension configuration
- `content.js`: Main script that adds ratings to titles

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

// .gitignore
node_modules/
.DS_Store
*.log
.vscode/
.idea/

// CHANGELOG.md
# Changelog

## [1.0.0] - 2024-11-06
- Initial release
- Added rating display functionality
- Support for all Crunchyroll pages