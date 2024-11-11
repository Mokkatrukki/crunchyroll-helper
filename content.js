// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;
let processedCards = new Set(); // Track cards we've already processed

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
    }).filter(item => item.rating > 0); // Only include items with actual ratings

    if (cardsWithRatings.length === 0) return; // Don't sort if no ratings found

    cardsWithRatings.sort((a, b) => b.rating - a.rating);

    // Only reorder if the order has actually changed
    const currentOrder = cards.map(card => card.outerHTML).join('');
    const newOrder = cardsWithRatings.map(({ card }) => card.outerHTML).join('');
    
    if (currentOrder !== newOrder) {
        cardsWithRatings.forEach(({ card }) => {
            container.appendChild(card);
        });
    }
}

function addRatingsToTitles() {
    loadSettings().then(settings => {
        if (!settings.showRatings) return;

        // Handle different page layouts
        let cards;
        if (window.location.href.includes('/videos/alphabetical')) {
            cards = document.querySelectorAll('[data-t="series-card"]');
        } else {
            cards = document.querySelectorAll('[data-t^="series-card"], .browse-card [data-t^="series-card"]');
        }

        cards.forEach(card => {
            const cardId = card.getAttribute('data-t');
            if (processedCards.has(cardId)) return; // Skip if already processed

            const titleElement = window.location.href.includes('/videos/alphabetical') ?
                card.querySelector('.horizontal-card__title-link--s2h7N') :
                card.querySelector('[data-t="title"] a');

            const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
            const rating = ratingElement?.textContent?.trim();

            if (titleElement && rating && !titleElement.textContent.includes('(')) {
                titleElement.textContent = `${titleElement.textContent} (${rating})`;
                processedCards.add(cardId); // Mark as processed
            }
        });

        // Only sort if enabled and not on alphabetical page
        if (settings.enableSorting && !window.location.href.includes('/videos/alphabetical')) {
            sortSeriesCards();
        }
    });
}

function sortSeriesCards() {
    loadSettings().then(settings => {
        if (!settings.enableSorting) return;

        const now = Date.now();
        if (isSorting || (now - lastSort) < SORT_COOLDOWN) {
            return;
        }

        isSorting = true;
        lastSort = now;

        try {
            // Handle standard layout
            const standardContainers = document.querySelectorAll('[data-t="cards"]');
            if (standardContainers.length) {
                standardContainers.forEach(container => {
                    sortContainer(container, container.children);
                });
            }

            // Handle grid layout
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

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedUpdate = debounce(() => {
    processedCards.clear(); // Clear processed cards before update
    addRatingsToTitles();
}, 1000);

// Initial load with delay
setTimeout(() => {
    addRatingsToTitles();
}, 1500);

// More precise mutation observer
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
        // Skip if mutation is from our own changes
        if (mutation.target.classList?.contains('star-rating-short-static__rating--bdAfR')) {
            continue;
        }
        
        // Check for relevant changes
        const hasNewCards = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
                node.matches?.('[data-t^="series-card"]') ||
                node.querySelector?.('[data-t^="series-card"]') ||
                node.matches?.('.browse-card') ||
                node.querySelector?.('.browse-card') ||
                node.matches?.('.horizontal-card__title-link--s2h7N') ||
                node.querySelector?.('.horizontal-card__title-link--s2h7N')
            )
        );

        if (hasNewCards) {
            shouldUpdate = true;
            break;
        }
    }

    if (shouldUpdate) {
        debouncedUpdate();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'settingsUpdated') {
        settings = request.settings;
        processedCards.clear(); // Clear processed cards when settings change
        debouncedUpdate();
    }
});