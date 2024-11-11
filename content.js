let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;
let isUserScrolling = false;
let userInteractionTimeout;

function addRatingsToTitles() {
    const cards = window.location.href.includes('/videos/alphabetical')
        ? document.querySelectorAll('[data-t="series-card"]')
        : document.querySelectorAll('[data-t^="series-card"], .browse-card [data-t^="series-card"]');

    let hasChanges = false;

    cards.forEach(card => {
        const titleElement = window.location.href.includes('/videos/alphabetical')
            ? card.querySelector('.horizontal-card__title-link--s2h7N')
            : card.querySelector('[data-t="title"] a');

        const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
        const rating = ratingElement?.textContent?.trim();
        
        if (titleElement && rating && !titleElement.textContent.includes('(')) {
            titleElement.textContent = `${titleElement.textContent} (${rating})`;
            hasChanges = true;
        }
    });

    // Sort if not on alphabetical page and changes were made
    if (!window.location.href.includes('/videos/alphabetical') && hasChanges) {
        sortSeriesCards();
    }
}

function sortSeriesCards() {
    if (isSorting || (Date.now() - lastSort) < SORT_COOLDOWN) return;

    isSorting = true;
    lastSort = Date.now();

    try {
        // Handle all container types
        const containers = [
            ...document.querySelectorAll('[data-t="cards"]'),
            document.querySelector('.erc-browse-cards-collection'),
            ...document.querySelectorAll('.carousel-scroller__track--43f0L')
        ].filter(Boolean);

        containers.forEach(container => sortContainer(container, container.children));
    } finally {
        isSorting = false;
    }
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

// Simplified observer
const observer = new MutationObserver(() => {
    if (!isUserScrolling) {
        debouncedUpdate();
    }
});

// Enhanced carousel interaction handlers
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
        }, SORT_COOLDOWN);
    };

    ['mousedown', 'touchstart'].forEach(event => 
        document.addEventListener(event, handleInteractionStart, { passive: true }));
    
    ['mouseup', 'touchend'].forEach(event => 
        document.addEventListener(event, handleInteractionEnd, { passive: true }));
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

// Add this function before the observer definition
function findContainer(node) {
    if (!node || node === document.body) return null;
    if (node.matches?.('.carousel-scroller__track--43f0L')) return node;
    if (node.matches?.('[data-t="cards"]')) return node;
    if (node.matches?.('.erc-browse-cards-collection')) return node;
    return findContainer(node.parentElement);
}

function initializePageContent() {
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