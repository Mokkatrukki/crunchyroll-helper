// content.js
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
}

// Run the function initially
addRatingsToTitles();

// Create a MutationObserver to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
    addRatingsToTitles();
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
    childList: true,
    subtree: true
});