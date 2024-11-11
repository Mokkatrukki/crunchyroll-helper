// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;
let processedCards = new WeakSet();
let isUserScrolling = false;
let userInteractionTimeout;

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
    if (!container || !cardsNodeList.length) return;
    
    const isCarousel = container.classList.contains('carousel-scroller__track--43f0L');
    if (isCarousel && isUserScrolling) return;

    const cards = Array.from(cardsNodeList);
    const fragment = document.createDocumentFragment();
    
    // Simplified rating collection without caching
    const cardsWithRatings = cards.map(card => {
        const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
        const rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
        return { card, rating };
    }).filter(item => item.rating > 0);

    if (cardsWithRatings.length === 0) return;

    cardsWithRatings.sort((a, b) => b.rating - a.rating);

    // Batch DOM updates
    if (isCarousel) {
        const scrollLeft = container.scrollLeft;
        cardsWithRatings.forEach(({ card }) => fragment.appendChild(card));
        container.appendChild(fragment);
        container.scrollLeft = scrollLeft;
    } else {
        cardsWithRatings.forEach(({ card }) => fragment.appendChild(card));
        container.appendChild(fragment);
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

        let hasChanges = false;

        cards.forEach(card => {
            // Skip if we've already processed this exact DOM element
            if (processedCards.has(card)) {
                const titleElement = window.location.href.includes('/videos/alphabetical') ?
                    card.querySelector('.horizontal-card__title-link--s2h7N') :
                    card.querySelector('[data-t="title"] a');
                
                // If title doesn't have rating anymore (e.g., after dynamic update), remove from processed
                if (titleElement && !titleElement.textContent.includes('(')) {
                    processedCards.delete(card);
                    hasChanges = true;
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
                hasChanges = true;
            }
        });

        // Only sort if enabled and not on alphabetical page
        if (settings.enableSorting && !window.location.href.includes('/videos/alphabetical') && hasChanges) {
            sortSeriesCards();
        }
    });
}

// Simplified observer
const observer = new MutationObserver((mutations) => {
    if (isUserScrolling) return;
    
    let shouldUpdate = false;
    for (const mutation of mutations) {
        if (mutation.target.classList?.contains('star-rating-short-static__rating--bdAfR')) {
            continue;
        }
        
        shouldUpdate = true;
        break;
    }

    if (shouldUpdate) {
        debouncedUpdate();
    }
});

// Add event listeners for user interaction
function setupCarouselInteractionHandlers() {
    document.addEventListener('mousedown', () => {
        isUserScrolling = true;
        clearTimeout(userInteractionTimeout);
    }, true);

    document.addEventListener('mouseup', () => {
        clearTimeout(userInteractionTimeout);
        userInteractionTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 1000);
    }, true);

    // Handle touch events for mobile
    document.addEventListener('touchstart', () => {
        isUserScrolling = true;
        clearTimeout(userInteractionTimeout);
    }, true);

    document.addEventListener('touchend', () => {
        clearTimeout(userInteractionTimeout);
        userInteractionTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 1000);
    }, true);
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

            // Handle carousels
            const carousels = document.querySelectorAll('.carousel-scroller__track--43f0L');
            carousels.forEach(carousel => {
                sortContainer(carousel, carousel.children);
            });
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

// Remove the setTimeout and replace with immediate initialization

// Add this function before the observer definition
function findContainer(node) {
    if (!node || node === document.body) return null;
    if (node.matches?.('.carousel-scroller__track--43f0L')) return node;
    if (node.matches?.('[data-t="cards"]')) return node;
    if (node.matches?.('.erc-browse-cards-collection')) return node;
    return findContainer(node.parentElement);
}

function initializePageContent() {
    processedCards = new WeakSet(); // Reset processed cards
    addRatingsToTitles();
    sortSeriesCards();
}

// Simplified navigation handler
function setupNavigationHandlers() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            initializePageContent();
        }
    }).observe(document, { subtree: true, childList: true });
}

// Initialize
observer.observe(document.body, {
    childList: true,
    subtree: true
});

setupNavigationHandlers();
initializePageContent();
setupCarouselInteractionHandlers();

// Settings listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'settingsUpdated') {
        settings = request.settings;
        processedCards = new WeakSet();
        debouncedUpdate();
    }
});