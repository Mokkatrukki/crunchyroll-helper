// options.js
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get({
        showRatings: true,
        enableSorting: true
    }, (items) => {
        document.getElementById('showRatings').checked = items.showRatings;
        document.getElementById('enableSorting').checked = items.enableSorting;
    });

    // Save settings when changed
    function saveSettings() {
        const showRatings = document.getElementById('showRatings').checked;
        const enableSorting = document.getElementById('enableSorting').checked;

        chrome.storage.sync.set({
            showRatings: showRatings,
            enableSorting: enableSorting
        }, () => {
            const status = document.getElementById('status');
            status.textContent = 'Settings saved!';
            status.className = 'status success';
            setTimeout(() => {
                status.className = 'status';
            }, 2000);
        });
    }

    document.getElementById('showRatings').addEventListener('change', saveSettings);
    document.getElementById('enableSorting').addEventListener('change', saveSettings);
});
