function initializeAnimeSorting() {
    console.log('Initializing Anime Sorting Extension');

    // Metrics tracking
    const metrics = {
        startTime: Date.now(),
        containersSorted: 0,
        containersProcessed: 0
    };

    // Flags and tracking
    let isSorting = false;
    const sortedContainers = new WeakSet();

    function sortContainer(container) {
        if (isSorting || sortedContainers.has(container)) {
            return;
        }

        const cards = Array.from(container.querySelectorAll('.carousel-scroller__card--4Lrk-'));

        console.log(`📊 Sorting container #${++metrics.containersSorted} with ${cards.length} cards`);
        isSorting = true;

        // Sort the cards
        cards.sort((a, b) => {
            const ratingA = parseFloat(a.querySelector('.star-rating-short-static__rating--bdAfR')?.textContent || '0');
            const ratingB = parseFloat(b.querySelector('.star-rating-short-static__rating--bdAfR')?.textContent || '0');
            
            if (ratingA === ratingB) {
                const countA = parseFloat((a.querySelector('.star-rating-short-static__votes-count--h9Sun')?.textContent || '(0)').replace(/[()k]/g, '')) * 1000;
                const countB = parseFloat((b.querySelector('.star-rating-short-static__votes-count--h9Sun')?.textContent || '(0)').replace(/[()k]/g, '')) * 1000;
                return countB - countA;
            }
            
            return ratingB - ratingA;
        });

        // Apply sort and add ratings
        const fragment = document.createDocumentFragment();
        cards.forEach(card => {
            const rating = card.querySelector('.star-rating-short-static__rating--bdAfR')?.textContent || '0';
            const titleElement = card.querySelector('.browse-card__title-link--SLlRM');
            if (titleElement && !titleElement.textContent.includes(`(${rating})`)) {
                titleElement.textContent += ` (${rating})`;
            }
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
        container.scrollLeft = 0;

        sortedContainers.add(container);
        isSorting = false;
        
        console.log(`✅ Container sorted and scrolled to start`);
    }

    function checkAndSortContainers() {
        if (isSorting) return;

        const containers = document.querySelectorAll('.carousel-scroller__track--43f0L');
        containers.forEach(container => {
            if (!sortedContainers.has(container)) {
                metrics.containersProcessed++;
                sortContainer(container);
            }
        });
    }

    // Monitor for container changes
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

    console.log('🚀 Anime sorter initialized with monitoring');

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

initializeAnimeSorting();