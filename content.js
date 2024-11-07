// content.js (updated version)
let isSorting = false;
let lastSort = 0;
const SORT_COOLDOWN = 1000;

// Load settings first
function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            showRatings: true,
            enableSorting: true
        }, resolve);
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
            const containers = document.querySelectorAll('[data-t="cards"]');
            if (!containers.length) return;

            containers.forEach(container => {
                const cards = Array.from(container.children);
                
                const cardsWithRatings = cards.map(card => {
                    const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
                    const rating = ratingElement ? parseFloat(ratingElement.textContent) : 0;
                    return { card, rating };
                });

                cardsWithRatings.sort((a, b) => b.rating - a.rating);

                cardsWithRatings.forEach(({ card }) => {
                    container.appendChild(card);
                });
            });
        } finally {
            isSorting = false;
        }
    });
}

function addRatingsToTitles() {
    loadSettings().then(settings => {
        if (!settings.showRatings) return;

        document.querySelectorAll('[data-t^="series-card"]').forEach(card => {
            const titleH4 = card.querySelector('[data-t="title"]');
            const titleLink = titleH4?.querySelector('a');
            
            const ratingElement = card.querySelector('.star-rating-short-static__rating--bdAfR');
            const rating = ratingElement?.textContent?.trim();

            if (titleLink && rating && !titleLink.textContent.includes('(')) {
                titleLink.textContent = `${titleLink.textContent} (${rating})`;
            }
        });

        if (settings.enableSorting) {
            sortSeriesCards();
        }
    });
}

let updateTimeout = null;
function debouncedUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(addRatingsToTitles, 1000);
}

setTimeout(addRatingsToTitles, 1500);

const observer = new MutationObserver((mutations) => {
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

observer.observe(document.body, {
    childList: true,
    subtree: true
});