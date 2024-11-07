// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;

// Default settings
let settings = {
    showRatings: true,
    enableSorting: true
};

function loadSettings() {
    return new Promise((resolve) => {
        try {
            resolve(settings);
        } catch (error) {
            console.log('Using default settings');
            resolve(settings);
        }
    });
}

function sortContainer(container, cardsNodeList) {
    const cards = Array.from(cardsNodeList);
    
    const cardsWithRatings = cards.map(card => {
        const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
        const rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
        return { card, rating };
    });

    cardsWithRatings.sort((a, b) => b.rating - a.rating);

    cardsWithRatings.forEach(({ card }) => {
        container.appendChild(card);
    });
}

function sortSeriesCards() {
    loadSettings().then(settings => {
        if (!settings.enableSorting) return;

        // Don't sort on alphabetical view
        if (window.location.href.includes('/videos/alphabetical')) {
            return;
        }

        const now = Date.now();
        if (isSorting || (now - lastSort) < SORT_COOLDOWN) {
            return;
        }

        isSorting = true;
        lastSort = now;

        try {
            // Try standard layout first
            const standardContainers = document.querySelectorAll('[data-t="cards"]');
            if (standardContainers.length) {
                standardContainers.forEach(container => {
                    sortContainer(container, container.children);
                });
            }

            // Try grid layout
            const gridContainer = document.querySelector('.erc-browse-cards-collection');
            if (gridContainer) {
                const gridCards = gridContainer.querySelectorAll('.browse-card');
                if (gridCards.length) {
                    sortContainer(gridContainer, gridCards);
                }
            }
        } finally {
            isSorting = false;
        }
    });
}

function addRatingsToTitles() {
    loadSettings().then(settings => {
        if (!settings.showRatings) return;

        // Handle alphabetical view
        if (window.location.href.includes('/videos/alphabetical')) {
            document.querySelectorAll('[data-t="series-card"]').forEach(card => {
                const titleLink = card.querySelector('.horizontal-card__title-link--s2h7N');
                const ratingElement = card.querySelector('[data-t="rating-section"] p');
                const rating = ratingElement?.textContent?.trim();

                if (titleLink && rating && !titleLink.textContent.includes('(')) {
                    titleLink.textContent = `${titleLink.textContent} (${rating})`;
                }
            });
            return; // Exit after handling alphabetical view
        }

        // Handle other views
        const selectors = [
            '[data-t^="series-card"]',
            '.browse-card [data-t^="series-card"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(card => {
                const titleH4 = card.querySelector('[data-t="title"]');
                const titleLink = titleH4?.querySelector('a');
                
                const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
                const rating = ratingElement?.textContent?.trim();

                if (titleLink && rating && !titleLink.textContent.includes('(')) {
                    titleLink.textContent = `${titleLink.textContent} (${rating})`;
                }
            });
        });

        if (settings.enableSorting) {
            sortSeriesCards();
        }
    });
}

let updateTimeout = null;
function debouncedUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(addRatingsToTitles, 1000);
}

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'settingsUpdated') {
        settings = request.settings;
        debouncedUpdate();
    }
});

setTimeout(addRatingsToTitles, 1500);

const observer = new MutationObserver((mutations) => {
    const hasNewCards = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
                node.matches?.('[data-t^="series-card"]') ||
                node.querySelector?.('[data-t^="series-card"]') ||
                node.matches?.('.browse-card') ||
                node.querySelector?.('.browse-card') ||
                node.matches?.('.horizontal-card__title-link--s2h7N') ||
                node.querySelector?.('.horizontal-card__title-link--s2h7N')
            )
        )
    );

    if (hasNewCards) {
        debouncedUpdate();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});