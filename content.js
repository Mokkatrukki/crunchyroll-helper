// Configuration
const CONFIG = {
    SORT_COOLDOWN: 1000,
    DEBOUNCE_WAIT: 1000,
    SELECTORS: {
        seriesCard: '[data-t="series-card"]',
        seriesCardWithPrefix: '[data-t^="series-card"], .browse-card [data-t^="series-card"]',
        titleLinkAlphabetical: '.horizontal-card__title-link--s2h7N',
        titleLink: '[data-t="title"] a',
        rating: '.star-rating-short-static__rating--bdAfR',
        cardsContainer: '[data-t="cards"]',
        browseCardsCollection: '.erc-browse-cards-collection',
        carouselTrack: '.carousel-scroller__track--43f0L'
    }
};

// State variables
let isSorting = false;
let lastSort = 0;
let firstLoad = true;
let isUserScrolling = false;
let userInteractionTimeout;

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

// Main functionality
function addRatingsToTitles() {
    const cards = window.location.href.includes('/videos/alphabetical')
        ? document.querySelectorAll(CONFIG.SELECTORS.seriesCard)
        : document.querySelectorAll(CONFIG.SELECTORS.seriesCardWithPrefix);

    let hasChanges = false;

    cards.forEach(card => {
        const titleElement = window.location.href.includes('/videos/alphabetical')
            ? card.querySelector(CONFIG.SELECTORS.titleLinkAlphabetical)
            : card.querySelector(CONFIG.SELECTORS.titleLink);

        const ratingElement = card.querySelector(CONFIG.SELECTORS.rating);
        const rating = ratingElement?.textContent?.trim();
        
        if (titleElement && rating && !titleElement.textContent.includes('(')) {
            titleElement.textContent = `${titleElement.textContent} (${rating})`;
            hasChanges = true;
        }
    });

    if (!window.location.href.includes('/videos/alphabetical') && hasChanges) {
        sortSeriesCards();
    }
}

function sortSeriesCards() {
    if (!firstLoad && (isSorting || (Date.now() - lastSort) < CONFIG.SORT_COOLDOWN)) return;

    isSorting = true;
    lastSort = Date.now();

    try {
        const containers = [
            ...document.querySelectorAll(CONFIG.SELECTORS.cardsContainer),
            document.querySelector(CONFIG.SELECTORS.browseCardsCollection),
            ...document.querySelectorAll(CONFIG.SELECTORS.carouselTrack)
        ].filter(Boolean);

        containers.forEach(container => sortContainer(container, container.children));
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
    const ratingCache = new WeakMap();
    
    const sortableCards = cards.filter(card => {
        const ratingElement = card.querySelector(CONFIG.SELECTORS.rating);
        if (ratingElement && parseFloat(ratingElement.textContent) > 0) {
            ratingCache.set(card, parseFloat(ratingElement.textContent));
            return true;
        }
        return false;
    });

    if (sortableCards.length === 0) return;

    sortableCards.sort((a, b) => ratingCache.get(b) - ratingCache.get(a));

    if (isCarousel) {
        const scrollLeft = container.scrollLeft;
        sortableCards.forEach(card => fragment.appendChild(card));
        container.appendChild(fragment);
        container.scrollLeft = scrollLeft;
    } else {
        sortableCards.forEach(card => fragment.appendChild(card));
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
        }, CONFIG.SORT_COOLDOWN);
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
            initializePageContent();
        }
    }).observe(document, { subtree: true, childList: true });
}

// Initialization
const debouncedUpdate = debounce(() => {
    addRatingsToTitles();
}, CONFIG.DEBOUNCE_WAIT);

const observer = new MutationObserver(() => {
    if (!isUserScrolling) {
        debouncedUpdate();
    }
});

function initializePageContent() {
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