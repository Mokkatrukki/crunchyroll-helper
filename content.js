// content.js
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000; // 1 second cooldown between sorts

function sortSeriesCards() {
    // Prevent concurrent sorts and limit frequency
    const now = Date.now();
    if (isSorting || (now - lastSort) < SORT_COOLDOWN) {
        return;
    }

    isSorting = true;
    lastSort = now;

    try {
        // Get ALL containers with cards
        const containers = document.querySelectorAll('[data-t="cards"]');
        if (!containers.length) return;

        containers.forEach(container => {
            // Get all cards and convert to array
            const cards = Array.from(container.children);
            
            // Create array of cards with their ratings
            const cardsWithRatings = cards.map(card => {
                const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
                const rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
                return { card, rating };
            });

            // Sort cards by rating (highest to lowest)
            cardsWithRatings.sort((a, b) => b.rating - a.rating);

            // Reappend cards in sorted order
            cardsWithRatings.forEach(({ card }) => {
                container.appendChild(card);
            });
        });
    } finally {
        // Always reset the sorting flag
        isSorting = false;
    }
}

function addRatingsToTitles() {
    // Find all series cards with attribute starting with "series-card"
    document.querySelectorAll('[data-t^="series-card"]').forEach(card => {
        // Find the title link within the card
        const titleH4 = card.querySelector('[data-t="title"]');
        const titleLink = titleH4?.querySelector('a');
        
        // Find the rating element with specific class for just the number
        const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
        const rating = ratingElement?.textContent?.trim();

        // Only update if we have both title and rating, and title doesn't already have rating
        if (titleLink && rating && !titleLink.textContent.includes('(')) {
            titleLink.textContent = `${titleLink.textContent} (${rating})`;
        }
    });

    // Sort cards after adding ratings
    sortSeriesCards();
}

// Create a debounced version of addRatingsToTitles
let updateTimeout = null;
function debouncedUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(addRatingsToTitles, 1000);
}

// Run the function initially with a delay to ensure content is loaded
setTimeout(addRatingsToTitles, 1500);

// Create a MutationObserver to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
    // Check if new cards were added
    const hasNewCards = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
                node.matches?.('[data-t^="series-card"]') ||
                node.querySelector?.('[data-t^="series-card"]')
            )
        )
    );

    if (hasNewCards) {
        debouncedUpdate();
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
    childList: true,
    subtree: true
});