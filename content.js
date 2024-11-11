// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;
let processedCards = new WeakSet(); // Use WeakSet instead of Set for DOM elements
let lastCarouselState = null;
let debounceTimeout = null;
let isUserScrolling = false;
let userInteractionTimeout;
let ratingsCache = new WeakMap();
let lastSortedState = new WeakMap();

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

// Replace the existing sortContainer function
function sortContainer(container, cardsNodeList) {
    if (!container || !cardsNodeList.length) return;
    
    const isCarousel = container.classList.contains('carousel-scroller__track--43f0L');
    if (isCarousel && isUserScrolling) return;

    // Get current container state hash
    const currentState = Array.from(cardsNodeList).map(card => card.outerHTML).join('');
    if (lastSortedState.get(container) === currentState) return;

    const cards = Array.from(cardsNodeList);
    const fragment = document.createDocumentFragment();
    
    // Use cached ratings or get new ones
    const cardsWithRatings = cards.map(card => {
        let rating = ratingsCache.get(card);
        if (rating === undefined) {
            const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
            rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
            ratingsCache.set(card, rating);
        }
        return { card, rating };
    }).filter(item => item.rating > 0);

    if (cardsWithRatings.length === 0) return;

    // Sort using cached ratings
    cardsWithRatings.sort((a, b) => b.rating - a.rating);

    // Batch DOM updates using DocumentFragment
    if (isCarousel) {
        const scrollLeft = container.scrollLeft;
        const transform = container.style.transform;
        
        cardsWithRatings.forEach(({ card }) => fragment.appendChild(card));
        container.appendChild(fragment);
        
        container.scrollLeft = scrollLeft;
        container.style.transform = transform;
    } else {
        cardsWithRatings.forEach(({ card }) => fragment.appendChild(card));
        container.appendChild(fragment);
    }

    lastSortedState.set(container, currentState);
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

// Replace sortAllCarousels with a simpler version
function sortAllCarousels() {
    const tracks = document.querySelectorAll('.carousel-scroller__track--43f0L');
    tracks.forEach((track) => {
        if (!isUserScrolling) {
            sortContainer(track, track.children);
        }
    });
}

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

            // Sort all carousels
            sortAllCarousels();
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

// Enhanced mutation observer
const observer = new MutationObserver((mutations) => {
    let affectedContainers = new Set();
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
        // Ignore mutations if user is interacting
        if (isUserScrolling) continue;

        if (mutation.target.classList?.contains('star-rating-short-static__rating--bdAfR')) {
            continue;
        }
        
        // Check if the mutation involves cards or containers
        const isRelevantNode = (node) => {
            if (node.nodeType !== 1) return false;
            return node.matches?.('[data-t^="series-card"]') ||
                   node.querySelector?.('[data-t^="series-card"]') ||
                   node.matches?.('.browse-card') ||
                   node.querySelector?.('.browse-card') ||
                   node.matches?.('.carousel-scroller__track--43f0L') ||
                   node.matches?.('[data-t="cards"]') ||
                   node.matches?.('.erc-browse-cards-collection') ||
                   node.matches?.('.horizontal-card__title-link--s2h7N') ||
                   node.querySelector?.('.horizontal-card__title-link--s2h7N');
        };

        // Process added nodes
        const hasNewCards = Array.from(mutation.addedNodes).some(node => isRelevantNode(node));
        if (hasNewCards) {
            shouldUpdate = true;
        }

        // Find and process containers
        mutation.addedNodes.forEach(node => {
            if (isRelevantNode(node)) {
                const container = findContainer(node);
                if (container) affectedContainers.add(container);
            }
        });

        if (isRelevantNode(mutation.target)) {
            const container = findContainer(mutation.target);
            if (container) affectedContainers.add(container);
        }
    }

    // Handle updates
    if (shouldUpdate && !isUserScrolling) {
        cleanupCaches(); // Add this line
        debouncedUpdate();
    }

    // Process affected containers
    if (affectedContainers.size > 0) {
        addRatingsToTitles();
        affectedContainers.forEach(container => {
            if (container.children.length > 0) {
                sortContainer(container, container.children);
            }
        });
    }
});

// Add intersection observer for carousels
const carouselObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.classList.contains('carousel-scroller__track--43f0L')) {
            sortContainer(entry.target, entry.target.children);
        }
    });
}, { threshold: 0.1 });

// Observe existing carousels
function observeCarousels() {
    document.querySelectorAll('.carousel-scroller__track--43f0L').forEach(track => {
        carouselObserver.observe(track);
    });
}

// Add these functions after the existing function declarations
function initializePageContent(retryCount = 0, maxRetries = 5) {
    const hasContent = document.querySelectorAll('[data-t^="series-card"], .browse-card [data-t^="series-card"]').length > 0;
    
    if (!hasContent && retryCount < maxRetries) {
        // Retry after a short delay with exponential backoff
        setTimeout(() => {
            initializePageContent(retryCount + 1, maxRetries);
        }, Math.min(100 * Math.pow(2, retryCount), 2000));
        return;
    }

    cleanupCaches(); // Add this line before other operations
    processedCards = new WeakSet(); // Reset processed cards on new page
    addRatingsToTitles();
    sortSeriesCards();
    observeCarousels();
}

// Add page navigation detection
function setupNavigationHandlers() {
    // History API navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            initializePageContent();
        }
    }).observe(document, { subtree: true, childList: true });

    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
        initializePageContent();
    });

    // Handle regular navigation
    document.addEventListener('DOMContentLoaded', () => {
        initializePageContent();
    });
}

// Add this cleanup function
function cleanupCaches() {
    ratingsCache = new WeakMap();
    lastSortedState = new WeakMap();
}

// Replace the initialization code at the bottom with:
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-t']
});

// Initialize everything
setupNavigationHandlers();
initializePageContent();
setupCarouselInteractionHandlers();

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'settingsUpdated') {
        settings = request.settings;
        processedCards = new WeakSet(); // Reset processed cards when settings change
        debouncedUpdate();
    }
});