// Enums and Constants
const PAGE_TYPES = {
    ALPHABETICAL: 'alphabetical',
    REGULAR: 'regular'
};

const DOM_STATES = {
    COMPLETE: 'complete'
};

const CONFIG = {
    TIMING: {
        SORT_COOLDOWN: 1000,
        DEBOUNCE_WAIT: 1000,
        MAX_INIT_RETRIES: 3,
        INIT_RETRY_DELAY: 500
    },
    VIEWPORT: {
        THRESHOLD: 800  // pixels above/below viewport to process
    },
    SELECTORS: {
        seriesCard: '[data-t="series-card"]',
        seriesCardWithPrefix: '[data-t^="series-card"], .browse-card [data-t^="series-card"]',
        titleLinkAlphabetical: '.horizontal-card__title-link--s2h7N',
        titleLink: '[data-t="title"] a',
        rating: '.star-rating-short-static__rating--bdAfR',
        cardsContainer: '[data-t="cards"]',
        browseCardsCollection: '.erc-browse-cards-collection',
        carouselTrack: '.carousel-scroller__track--43f0L'
    },
    INTERSECTION: {
        ROOT_MARGIN: '100px 0px',
        THRESHOLD: 0.1
    }
};

// State variables
let isSorting = false;
let lastSort = 0;
let firstLoad = true;
let isUserScrolling = false;
let userInteractionTimeout;
const ratingCache = new Map(); // Add rating cache

// Add numeric rating cache
const parsedRatingCache = new WeakMap();

// Utility functions
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

function findContainer(node) {
    if (!node || node === document.body) return null;
    if (node.matches?.(CONFIG.SELECTORS.carouselTrack)) return node;
    if (node.matches?.(CONFIG.SELECTORS.cardsContainer)) return node;
    if (node.matches?.(CONFIG.SELECTORS.browseCardsCollection)) return node;
    return findContainer(node.parentElement);
}

// Add helper function for rating validation
function isValidRating(rating) {
    const numRating = parseFloat(rating);
    return !isNaN(numRating) && numRating >= 0 && numRating <= 5;
}

// Add rating parser utility
function getParsedRating(element) {
    if (parsedRatingCache.has(element)) {
        return parsedRatingCache.get(element);
    }
    const rating = parseFloat(element.textContent);
    if (!isNaN(rating) && rating > 0) {
        parsedRatingCache.set(element, rating);
        return rating;
    }
    return 0;
}

// Add viewport helper function
function isNearViewport(element) {
    const rect = element.getBoundingClientRect();
    const threshold = CONFIG.VIEWPORT.THRESHOLD;
    return rect.top >= -threshold && 
           rect.top <= (window.innerHeight + threshold);
}

// Helper function to determine page type
function getPageType() {
    return window.location.href.includes('/videos/alphabetical') 
        ? PAGE_TYPES.ALPHABETICAL 
        : PAGE_TYPES.REGULAR;
}

// Main functionality
function addRatingsToTitles() {
    const pageType = getPageType();
    const cards = document.querySelectorAll(
        pageType === PAGE_TYPES.ALPHABETICAL
            ? CONFIG.SELECTORS.seriesCard
            : CONFIG.SELECTORS.seriesCardWithPrefix
    );

    let hasChanges = false;

    cards.forEach(card => {
        const titleElement = pageType === PAGE_TYPES.ALPHABETICAL
            ? card.querySelector(CONFIG.SELECTORS.titleLinkAlphabetical)
            : card.querySelector(CONFIG.SELECTORS.titleLink);

        if (!titleElement || titleElement.textContent.includes('(')) return;

        const titleText = titleElement.textContent;
        let rating = ratingCache.get(titleText);

        if (!rating) {
            const ratingElement = card.querySelector(CONFIG.SELECTORS.rating);
            const rawRating = ratingElement?.textContent?.trim();
            if (rawRating && isValidRating(rawRating)) {
                rating = rawRating;
                ratingCache.set(titleText, rating);
            }
        }
        
        if (rating) {
            titleElement.textContent = `${titleText} (${rating})`;
            hasChanges = true;
        }
    });

    if (pageType !== PAGE_TYPES.ALPHABETICAL && hasChanges) {
        sortSeriesCards();
    }
}

// Add progressive sorting observer
const progressiveSort = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isUserScrolling) {
            const container = entry.target;
            sortContainer(container, container.children);
            progressiveSort.unobserve(container); // Only sort once
        }
    });
}, {
    rootMargin: CONFIG.INTERSECTION.ROOT_MARGIN,
    threshold: CONFIG.INTERSECTION.THRESHOLD
});

function sortSeriesCards() {
    if (!firstLoad && (isSorting || (Date.now() - lastSort) < CONFIG.TIMING.SORT_COOLDOWN)) return;

    isSorting = true;
    lastSort = Date.now();

    try {
        const containers = [
            ...document.querySelectorAll(CONFIG.SELECTORS.cardsContainer),
            document.querySelector(CONFIG.SELECTORS.browseCardsCollection),
            ...document.querySelectorAll(CONFIG.SELECTORS.carouselTrack)
        ].filter(Boolean);

        // Use progressive sorting instead of immediate sorting
        containers.forEach(container => {
            if (isNearViewport(container)) {
                sortContainer(container, container.children);
            } else {
                progressiveSort.observe(container);
            }
        });
    } finally {
        isSorting = false;
    }
}

function sortContainer(container, cardsNodeList) {
    if (!container || !cardsNodeList.length) return;
    
    const isCarousel = container.classList.contains(CONFIG.SELECTORS.carouselTrack.slice(1));
    if (isCarousel && isUserScrolling) return;

    const cards = Array.from(cardsNodeList);
    const fragment = document.createDocumentFragment();
    
    // Split cards into visible and non-visible
    const [visibleCards, hiddenCards] = cards.reduce((acc, card) => {
        const isVisible = isNearViewport(card);
        acc[isVisible ? 0 : 1].push(card);
        return acc;
    }, [[], []]);

    // Sort visible cards first
    const sortedVisible = visibleCards
        .filter(card => {
            const ratingElement = card.querySelector(CONFIG.SELECTORS.rating);
            return ratingElement && getParsedRating(ratingElement) > 0;
        })
        .sort((a, b) => {
            const ratingA = getParsedRating(a.querySelector(CONFIG.SELECTORS.rating));
            const ratingB = getParsedRating(b.querySelector(CONFIG.SELECTORS.rating));
            return ratingB - ratingA;
        });

    // Sort hidden cards only if needed
    const sortedHidden = hiddenCards
        .filter(card => {
            const ratingElement = card.querySelector(CONFIG.SELECTORS.rating);
            return ratingElement && getParsedRating(ratingElement) > 0;
        })
        .sort((a, b) => {
            const ratingA = getParsedRating(a.querySelector(CONFIG.SELECTORS.rating));
            const ratingB = getParsedRating(b.querySelector(CONFIG.SELECTORS.rating));
            return ratingB - ratingA;
        });

    if (sortedVisible.length === 0 && sortedHidden.length === 0) return;

    [...sortedVisible, ...sortedHidden].forEach(card => fragment.appendChild(card));

    if (isCarousel) {
        const scrollLeft = container.scrollLeft;
        container.appendChild(fragment);
        container.scrollLeft = scrollLeft;
    } else {
        container.appendChild(fragment);
    }
}

// Event handlers
function setupCarouselInteractionHandlers() {
    const handleInteractionStart = () => {
        isUserScrolling = true;
        clearTimeout(userInteractionTimeout);
    };

    const handleInteractionEnd = () => {
        clearTimeout(userInteractionTimeout);
        userInteractionTimeout = setTimeout(() => {
            isUserScrolling = false;
            addRatingsToTitles() && sortSeriesCards();
        }, CONFIG.TIMING.SORT_COOLDOWN);
    };

    ['mousedown', 'touchstart'].forEach(event => 
        document.addEventListener(event, handleInteractionStart, { passive: true }));
    
    ['mouseup', 'touchend'].forEach(event => 
        document.addEventListener(event, handleInteractionEnd, { passive: true }));
}

function setupNavigationHandlers() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            ratingCache.clear(); // Clear cache on navigation
            initializePageContent();
        }
    }).observe(document, { subtree: true, childList: true });
}

// Initialization
const debouncedUpdate = debounce(() => {
    addRatingsToTitles();
}, CONFIG.TIMING.DEBOUNCE_WAIT);

const observer = new MutationObserver(() => {
    if (!isUserScrolling) {
        debouncedUpdate();
    }
});

function initializePageContent(retryCount = 0) {
    if (document.readyState !== DOM_STATES.COMPLETE) {
        if (retryCount < CONFIG.TIMING.MAX_INIT_RETRIES) {
            setTimeout(() => initializePageContent(retryCount + 1), CONFIG.TIMING.INIT_RETRY_DELAY);
            return;
        }
    }

    if (firstLoad) {
        addRatingsToTitles();
        sortSeriesCards();
        firstLoad = false;
    } else {
        debouncedUpdate();
    }
}

// Start observing and setup handlers
observer.observe(document.body, {
    childList: true,
    subtree: true
});

setupNavigationHandlers();
initializePageContent();
setupCarouselInteractionHandlers();