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
    // Check if this is a carousel track
    const isCarousel = container.classList.contains('carousel-scroller__track--43f0L');
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
        // If it's a carousel, handle the special case
        if (isCarousel) {
            // Clear transform and any scroll position
            container.style.transform = '';
            container.scrollLeft = 0;
            
            // Force layout recalculation
            void container.offsetHeight;

            // Reappend in sorted order
            cardsWithRatings.forEach(({ card }) => {
                container.appendChild(card);
            });

            // Set transform explicitly to show first items
            container.style.transform = 'translate3d(0px, 0px, 0px)';
        } else {
            // Regular container sorting
            cardsWithRatings.forEach(({ card }) => {
                container.appendChild(card);
            });
        }
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

function sortAllCarousels() {
    // Find all carousel tracks
    const tracks = document.querySelectorAll('.carousel-scroller__track--43f0L');

    tracks.forEach((track) => {
        // Get current cards and sort them
        const cards = Array.from(track.children);

        const cardsWithRatings = cards.map(card => {
            const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
            const rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
            return { card, rating };
        }).filter(item => item.rating > 0);

        // Sort by rating
        cardsWithRatings.sort((a, b) => b.rating - a.rating);

        // Clear transform and any scroll position
        track.style.transform = '';
        track.scrollLeft = 0;
        
        // Force layout recalculation
        void track.offsetHeight;

        // Reappend in sorted order
        cardsWithRatings.forEach(({ card }) => {
            track.appendChild(card);
        });

        // Set transform explicitly
        track.style.transform = 'translate3d(0px, 0px, 0px)';
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
addRatingsToTitles();

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
    if (shouldUpdate) {
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

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-t']
});

// Initial carousel observation
observeCarousels();

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'settingsUpdated') {
        settings = request.settings;
        processedCards = new WeakSet(); // Reset processed cards when settings change
        debouncedUpdate();
    }
});