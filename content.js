// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;
let processedCards = new WeakSet(); // Use WeakSet instead of Set for DOM elements

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
    }).filter(item => item.rating > 0);

    if (cardsWithRatings.length === 0) return;

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
            // Skip if we've already processed this exact DOM element
            if (processedCards.has(card)) {
                const titleElement = window.location.href.includes('/videos/alphabetical') ?
                    card.querySelector('.horizontal-card__title-link--s2h7N') :
                    card.querySelector('[data-t="title"] a');
                
                // If title doesn't have rating anymore (e.g., after dynamic update), remove from processed
                if (titleElement && !titleElement.textContent.includes('(')) {
                    processedCards.delete(card);
                } else {
                    return;
                }
            }

            const titleElement = window.location.href.includes('/videos/alphabetical') ?
                card.querySelector('.horizontal-card__title-link--s2h7N') :
                card.querySelector('[data-t="title"] a');

            const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
            const rating = ratingElement?.textContent?.trim();

            if (titleElement && rating && !titleElement.textContent.includes('(')) {
                titleElement.textContent = `${titleElement.textContent} (${rating})`;
                processedCards.add(card); // Mark the DOM element as processed
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

// Improved debounce with immediate option
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
    addRatingsToTitles();
}, 1000);

// Initial load with shorter delay
setTimeout(() => {
    addRatingsToTitles();
}, 1000);

// More precise mutation observer
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
        if (mutation.target.classList?.contains('star-rating-short-static__rating--bdAfR')) {
            continue;
        }
        
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
        processedCards = new WeakSet(); // Reset processed cards when settings change
        debouncedUpdate();
    }
});