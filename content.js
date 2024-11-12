function initializeAnimeSorting() {
    const metrics = {
        startTime: Date.now(),
        containersSorted: 0,
        containersProcessed: 0
    };

    let isSorting = false;
    const sortedContainers = new WeakSet();

    // Helper functions
    function extractRatingData(element) {
        const rating = parseFloat(element.querySelector('.star-rating-short-static__rating--bdAfR')?.textContent || '0');
        const votes = parseFloat((element.querySelector('.star-rating-short-static__votes-count--h9Sun')?.textContent || '(0)').replace(/[()k]/g, '')) * 1000;
        return { rating, votes };
    }

    function compareCards(a, b) {
        const ratingA = extractRatingData(a);
        const ratingB = extractRatingData(b);
        
        if (ratingA.rating === ratingB.rating) {
            return ratingB.votes - ratingA.votes;
        }
        return ratingB.rating - ratingA.rating;
    }

    function addRatingToTitle(card) {
        const rating = card.querySelector('.star-rating-short-static__rating--bdAfR')?.textContent || '0';
        const titleElement = card.querySelector('.browse-card__title-link--SLlRM');
        if (titleElement && !titleElement.textContent.includes(`(${rating})`)) {
            titleElement.textContent += ` (${rating})`;
        }
    }

    // Container-specific handlers
    function handleCarouselContainer(container) {
        const cards = Array.from(container.querySelectorAll('.carousel-scroller__card--4Lrk-'));
        if (!cards.length) return false;

        cards.sort(compareCards);
        
        const fragment = document.createDocumentFragment();
        cards.forEach(card => {
            addRatingToTitle(card);
            fragment.appendChild(card);
        });
        
        container.appendChild(fragment);
        container.scrollLeft = 0;
        return true;
    }

    function handleBrowseContainer(container) {
        const cards = Array.from(container.querySelectorAll('.browse-card'));
        if (!cards.length) return false;

        cards.sort(compareCards);
        
        const fragment = document.createDocumentFragment();
        cards.forEach(card => {
            addRatingToTitle(card);
            fragment.appendChild(card);
        });
        
        container.appendChild(fragment);
        return true;
    }

    function sortContainer(container) {
        if (isSorting || sortedContainers.has(container)) return;

        metrics.containersSorted++;
        isSorting = true;

        const success = container.classList.contains('carousel-scroller__track--43f0L')
            ? handleCarouselContainer(container)
            : handleBrowseContainer(container);

        if (success) {
            sortedContainers.add(container);
        }

        isSorting = false;
    }

    function checkAndSortContainers() {
        if (isSorting) return;

        // Check for carousel containers
        document.querySelectorAll('.carousel-scroller__track--43f0L').forEach(container => {
            if (!sortedContainers.has(container)) {
                metrics.containersProcessed++;
                sortContainer(container);
            }
        });

        // Check for browse card containers
        document.querySelectorAll('.erc-browse-cards-collection').forEach(container => {
            if (!sortedContainers.has(container)) {
                metrics.containersProcessed++;
                sortContainer(container);
            }
        });
    }

    // Set up observer
    const observer = new MutationObserver((mutations) => {
        if (isSorting) return;

        const hasRelevantChanges = mutations.some(mutation => 
            mutation.addedNodes.length > 0 && 
            !mutation.target.classList?.contains('card-watchlist-label--EUFMb') &&
            !mutation.target.classList?.contains('tooltip-icon__action-icon--toIky')
        );

        if (hasRelevantChanges) {
            setTimeout(checkAndSortContainers, 1000);
        }
    });

    // Start monitoring
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    // Initial sort with delay
    setTimeout(checkAndSortContainers, 800);

    return {
        sortContainer,
        checkAndSortContainers,
        observer,
        getMetrics: () => ({
            ...metrics,
            runtime: (Date.now() - metrics.startTime) / 1000,
            status: 'active'
        })
    };
}

// Initialize
initializeAnimeSorting();