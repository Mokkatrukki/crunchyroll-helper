// background.js
let settings = {
    showRatings: true,
    enableSorting: true
};

// Listen for settings changes from options page
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        for (let [key, { newValue }] of Object.entries(changes)) {
            settings[key] = newValue;
        }
        
        // Broadcast settings change to content scripts
        chrome.tabs.query({url: "*://*.crunchyroll.com/*"}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'settingsUpdated',
                    settings: settings
                });
            });
        });
    }
});

// Load initial settings
chrome.storage.sync.get({
    showRatings: true,
    enableSorting: true
}, (items) => {
    settings = items;
});