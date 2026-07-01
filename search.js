// State
let rawResults = [];
let filteredResults = [];
let currentPage = 1;
const RESULTS_PER_PAGE = 20;

let currentQuery = '';
let activeFilters = {
    year: new Set(),
    journal: new Set(),
    publisher: new Set(),
    language: new Set()
};

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const topKSelector = document.getElementById('topKSelector');
const retrievalStrategy = document.getElementById('retrievalStrategy');
const topKContainer = document.getElementById('topKContainer');
const minScoreContainer = document.getElementById('minScoreContainer');
const minScoreInput = document.getElementById('minScoreInput');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const resultsContainer = document.getElementById('resultsContainer');
const paginationNav = document.getElementById('paginationNav');
const paginationContainer = document.getElementById('paginationContainer');
const statisticsPanel = document.getElementById('statisticsPanel');
const sortSelector = document.getElementById('sortSelector');
const darkModeToggle = document.getElementById('darkModeToggle');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    restoreState();
    
    retrievalStrategy.addEventListener('change', () => {
        if (retrievalStrategy.value === 'minScore') {
            topKContainer.classList.add('d-none');
            minScoreContainer.classList.remove('d-none');
        } else {
            topKContainer.classList.remove('d-none');
            minScoreContainer.classList.add('d-none');
        }
    });

    searchForm.addEventListener('submit', handleSearch);
    sortSelector.addEventListener('change', applyFiltersAndSort);
    clearFiltersBtn.addEventListener('click', clearFilters);
    exportCsvBtn.addEventListener('click', exportToCsv);
});

// Dark Mode Toggle
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
    }

    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('darkMode', 'false');
            darkModeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
        } else {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
            darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        }
    });
}

// Save & Restore State
function saveState() {
    const state = {
        query: searchInput.value,
        topK: topKSelector.value,
        strategy: retrievalStrategy.value,
        minScore: minScoreInput.value,
        rawResults,
        activeFilters: {
            year: Array.from(activeFilters.year),
            journal: Array.from(activeFilters.journal),
            publisher: Array.from(activeFilters.publisher),
            language: Array.from(activeFilters.language)
        },
        sort: sortSelector.value,
        stats: statisticsPanel.innerHTML
    };
    localStorage.setItem('scholarlySearchState', JSON.stringify(state));
}

function restoreState() {
    const savedState = localStorage.getItem('scholarlySearchState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            searchInput.value = state.query || '';
            topKSelector.value = state.topK || '100';
            
            if (state.strategy) {
                retrievalStrategy.value = state.strategy;
                retrievalStrategy.dispatchEvent(new Event('change'));
            }
            if (state.minScore) {
                minScoreInput.value = state.minScore;
            }
            
            sortSelector.value = state.sort || 'score';
            currentQuery = state.query || '';
            
            if (state.rawResults && state.rawResults.length > 0) {
                rawResults = state.rawResults;
                
                // Restore filters
                activeFilters.year = new Set(state.activeFilters.year || []);
                activeFilters.journal = new Set(state.activeFilters.journal || []);
                activeFilters.publisher = new Set(state.activeFilters.publisher || []);
                activeFilters.language = new Set(state.activeFilters.language || []);
                
                statisticsPanel.innerHTML = state.stats || '';
                exportCsvBtn.disabled = false;
                
                updateFilterUI();
                applyFiltersAndSort();
            }
        } catch (e) {
            console.error("Error restoring state:", e);
        }
    }
}

// Handle Search
async function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    currentQuery = query;
    
    // Construct Fetch URL based on strategy
    let fetchUrl = `http://127.0.0.1:5000/search?q=${encodeURIComponent(query)}`;
    if (retrievalStrategy.value === 'topK') {
        fetchUrl += `&k=${topKSelector.value}`;
    } else {
        const minScore = minScoreInput.value || 0.75;
        // Fetch a larger pool and filter on backend by minScore
        fetchUrl += `&k=1000&min_score=${minScore}`;
    }
    
    // UI Reset
    clearFilters(false);
    resultsContainer.innerHTML = '';
    paginationNav.classList.add('d-none');
    emptyState.classList.add('d-none');
    loadingState.classList.remove('d-none');
    exportCsvBtn.disabled = true;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Solr backend often returns string fields as arrays (e.g., "title": ["Paper Name"])
        // We sanitize these into strings so frontend string functions (.replace, .localeCompare) don't crash
        rawResults = (data.data || []).map(item => {
            const sanitize = (val) => Array.isArray(val) ? val.join(', ') : val;
            
            let links = [];
            if (item.online_link) {
                const rawLinks = Array.isArray(item.online_link) ? item.online_link : [item.online_link];
                rawLinks.forEach(linkStr => {
                    linkStr.split('|').forEach(l => {
                        const cleanLink = l.trim();
                        if (cleanLink) links.push(cleanLink);
                    });
                });
            }

            return {
                ...item,
                title: sanitize(item.title),
                author: sanitize(item.author),
                author2: sanitize(item.author2),
                journal: sanitize(item.journal),
                publisher: sanitize(item.publisher),
                abstract: sanitize(item.abstract),
                language: sanitize(item.language),
                online_link: links.length > 0 ? links : null
            };
        });
        
        // Update Stats
        updateStats(data);
        
        // Populate Filter UI
        updateFilterUI();
        
        // Process & Render
        applyFiltersAndSort();
        
        exportCsvBtn.disabled = rawResults.length === 0;

    } catch (error) {
        console.error("Search failed:", error);
        loadingState.classList.add('d-none');
        emptyState.classList.remove('d-none');
        emptyState.querySelector('h4').textContent = "Search Error";
        emptyState.querySelector('p').textContent = "Could not connect to the search API. Please ensure the backend is running.";
        rawResults = [];
        updateFilterUI();
        statisticsPanel.innerHTML = '<p class="text-danger small mb-0 text-center py-3"><i class="bi bi-exclamation-triangle me-1"></i> Error connecting to server.</p>';
    }
}

function updateStats(data) {
    if (!data.timings) return;
    
    const html = `
        <div class="row text-center mb-3">
            <div class="col-6 border-end">
                <div class="fs-4 fw-bold text-primary">${data.retrieved || 0}</div>
                <div class="small text-muted fw-semibold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Papers</div>
            </div>
            <div class="col-6">
                <div class="fs-4 fw-bold">${data.timings.total_ms || 0} <span class="fs-6 text-muted">ms</span></div>
                <div class="small text-muted fw-semibold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Latency</div>
            </div>
        </div>
        <div class="bg-light rounded p-2 text-center">
            <div class="row">
                <div class="col-6 border-end">
                    <div class="fs-5 fw-bold">${data.timings.embedding_ms || 0} <span style="font-size: 0.75rem" class="text-muted fw-normal">ms</span></div>
                    <div class="small text-muted" style="font-size: 0.7rem;">Embedding</div>
                </div>
                <div class="col-6">
                    <div class="fs-5 fw-bold">${data.timings.retrieval_ms || 0} <span style="font-size: 0.75rem" class="text-muted fw-normal">ms</span></div>
                    <div class="small text-muted" style="font-size: 0.7rem;">Retrieval</div>
                </div>
            </div>
        </div>
    `;
    statisticsPanel.innerHTML = html;
}

// Filters & Sort
function updateFilterUI() {
    const years = new Map();
    const journals = new Map();
    const publishers = new Map();
    const languages = new Map();

    rawResults.forEach(item => {
        if (item.year) years.set(item.year, (years.get(item.year) || 0) + 1);
        if (item.journal) journals.set(item.journal, (journals.get(item.journal) || 0) + 1);
        if (item.publisher) publishers.set(item.publisher, (publishers.get(item.publisher) || 0) + 1);
        if (item.language) languages.set(item.language, (languages.get(item.language) || 0) + 1);
    });

    renderFilterCheckbox('yearFilterContainer', 'year', Array.from(years.entries()).sort((a,b) => b[0] - a[0]));
    renderFilterCheckbox('journalFilterContainer', 'journal', Array.from(journals.entries()).sort((a,b) => b[1] - a[1]));
    renderFilterCheckbox('publisherFilterContainer', 'publisher', Array.from(publishers.entries()).sort((a,b) => b[1] - a[1]));
    renderFilterCheckbox('languageFilterContainer', 'language', Array.from(languages.entries()).sort((a,b) => b[1] - a[1]));
}

function renderFilterCheckbox(containerId, filterType, entries) {
    const container = document.getElementById(containerId);
    if (entries.length === 0) {
        container.innerHTML = '<div class="text-muted small py-1">No data</div>';
        return;
    }

    const html = entries.map(([value, count]) => {
        const isChecked = activeFilters[filterType].has(String(value));
        const id = `filter-${filterType}-${value.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
        return `
            <div class="form-check mb-2">
                <input class="form-check-input filter-checkbox" type="checkbox" value="${value}" id="${id}" data-type="${filterType}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label d-flex justify-content-between align-items-center text-truncate w-100 pe-1" for="${id}" title="${value}">
                    <span class="text-truncate flex-grow-1">${value}</span>
                    <span class="badge bg-light text-secondary border rounded-pill ms-2 fw-normal" style="font-size: 0.7rem;">${count}</span>
                </label>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Attach event listeners
    container.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const val = e.target.value;
            if (e.target.checked) {
                activeFilters[type].add(val);
            } else {
                activeFilters[type].delete(val);
            }
            applyFiltersAndSort();
        });
    });
}

function clearFilters(apply = true) {
    activeFilters = { year: new Set(), journal: new Set(), publisher: new Set(), language: new Set() };
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    if (apply) applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // 1. Filter
    filteredResults = rawResults.filter(item => {
        const passYear = activeFilters.year.size === 0 || activeFilters.year.has(String(item.year));
        const passJournal = activeFilters.journal.size === 0 || activeFilters.journal.has(String(item.journal));
        const passPublisher = activeFilters.publisher.size === 0 || activeFilters.publisher.has(String(item.publisher));
        const passLanguage = activeFilters.language.size === 0 || activeFilters.language.has(String(item.language));
        return passYear && passJournal && passPublisher && passLanguage;
    });

    // 2. Sort
    const sortMode = sortSelector.value;
    filteredResults.sort((a, b) => {
        if (sortMode === 'score') return (b.score || 0) - (a.score || 0);
        if (sortMode === 'newest') return (b.year || 0) - (a.year || 0);
        if (sortMode === 'oldest') return (a.year || 0) - (b.year || 0);
        if (sortMode === 'titleAZ') return (a.title || '').localeCompare(b.title || '');
        return 0;
    });

    // 3. Render
    currentPage = 1;
    renderResults();
    saveState();
}

// Rendering
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
    if (!text || !query) return text || '';
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length === 0) return text;
    
    let highlighted = text;
    terms.forEach(term => {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
    });
    return highlighted;
}

function renderResults() {
    loadingState.classList.add('d-none');
    resultsContainer.innerHTML = '';

    if (filteredResults.length === 0) {
        emptyState.classList.remove('d-none');
        paginationNav.classList.add('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = Math.min(startIndex + RESULTS_PER_PAGE, filteredResults.length);
    const pageData = filteredResults.slice(startIndex, endIndex);

    pageData.forEach(item => {
        const authorsStr = [item.author, item.author2].filter(Boolean).join(', ');
        
        const card = document.createElement('div');
        card.className = 'card result-card p-4 border-0 mb-2';
        
        let abstractHtml = '';
        if (item.abstract) {
            const hAbstract = highlightText(item.abstract, currentQuery);
            abstractHtml = `
                <div class="mt-3 bg-light p-3 rounded-3 border">
                    <div class="abstract-preview abstract-collapsed" id="abstract-${item.id}">
                        ${hAbstract}
                    </div>
                    <button class="btn btn-link expand-btn mt-1 d-inline-flex align-items-center" onclick="toggleAbstract('abstract-${item.id}', this)">
                        <i class="bi bi-chevron-down me-1" style="font-size: 0.8rem;"></i> <span>Show full abstract</span>
                    </button>
                </div>
            `;
        }

        let linkHtml = '';
        if (item.online_link && Array.isArray(item.online_link)) {
            linkHtml = item.online_link.map((link, idx) => `
                <a href="${link}" target="_blank" class="btn btn-sm btn-primary rounded-pill px-3 me-2 mt-2 mt-md-0">
                    <i class="bi bi-box-arrow-up-right me-1"></i> ${item.online_link.length > 1 ? 'Link ' + (idx + 1) : 'Read Paper'}
                </a>
            `).join('');
        }

        let doiHtml = '';
        if (item.doi) {
            doiHtml = `
                <div class="d-inline-flex align-items-center bg-light rounded-pill px-2 py-1 border ms-md-2 mt-2 mt-md-0">
                    <span class="text-muted small me-2 font-monospace">DOI: ${item.doi}</span>
                    <button class="btn btn-sm btn-link text-decoration-none p-0 text-primary" onclick="copyToClipboard('${item.doi}')" title="Copy DOI">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            `;
        }

        const scoreHtml = item.score ? `<span class="badge bg-success bg-opacity-10 text-success border border-success float-end rounded-pill px-2 py-1 ms-2 mb-2"><i class="bi bi-bullseye me-1"></i>Score: ${item.score.toFixed(3)}</span>` : '';

        card.innerHTML = `
            <div>
                ${scoreHtml}
                <a href="${item.online_link || '#'}" target="_blank" class="result-title d-inline-block mb-2 pe-5">
                    ${highlightText(item.title, currentQuery)}
                </a>
                <div class="authors mb-2 fw-medium">
                    ${highlightText(authorsStr, currentQuery)} <span class="text-muted ms-1">&bull; ${item.year || 'N/A'}</span>
                </div>
                <div class="metadata d-flex align-items-center flex-wrap gap-3">
                    ${item.journal ? `<span class="d-flex align-items-center"><i class="bi bi-journal-richtext text-primary me-2"></i> ${highlightText(item.journal, currentQuery)}</span>` : ''}
                    ${item.publisher ? `<span class="d-flex align-items-center"><i class="bi bi-building text-primary me-2"></i> ${item.publisher}</span>` : ''}
                </div>
                ${abstractHtml}
                <div class="mt-3 d-flex flex-wrap align-items-center justify-content-between">
                    <div>
                        ${linkHtml}
                        ${doiHtml}
                    </div>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(card);
    });

    renderPagination();
}

window.toggleAbstract = function(id, btn) {
    const el = document.getElementById(id);
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    
    if (el.classList.contains('abstract-collapsed')) {
        el.classList.remove('abstract-collapsed');
        span.textContent = 'Show less';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
    } else {
        el.classList.add('abstract-collapsed');
        span.textContent = 'Show full abstract';
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
    }
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Optional: simple visual feedback could be added here
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationNav.classList.add('d-none');
        return;
    }

    paginationNav.classList.remove('d-none');
    paginationContainer.innerHTML = '';

    // Prev
    addPageItem('<i class="bi bi-chevron-left"></i>', currentPage > 1 ? currentPage - 1 : null, currentPage === 1);

    // Numbered pages (simplified to show around current page)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        addPageItem(1, 1);
        if (startPage > 2) addPageItem('...', null, true);
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageItem(i, i, false, i === currentPage);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) addPageItem('...', null, true);
        addPageItem(totalPages, totalPages);
    }

    // Next
    addPageItem('<i class="bi bi-chevron-right"></i>', currentPage < totalPages ? currentPage + 1 : null, currentPage === totalPages);
}

function addPageItem(text, targetPage, disabled = false, active = false) {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
    
    const a = document.createElement('a');
    a.className = 'page-link px-3 py-2';
    a.href = '#';
    a.innerHTML = text; // innerHTML for icons
    
    if (!disabled && targetPage) {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = targetPage;
            renderResults();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    } else {
        a.tabIndex = -1;
        if(disabled) a.setAttribute('aria-disabled', 'true');
    }
    
    li.appendChild(a);
    paginationContainer.appendChild(li);
}

// Export to CSV
function exportToCsv() {
    if (filteredResults.length === 0) return;
    
    const headers = ['Title', 'Authors', 'Journal', 'Publisher', 'Year', 'DOI', 'Score', 'Language', 'Link'];
    const rows = filteredResults.map(item => [
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${([item.author, item.author2].filter(Boolean).join(', ')).replace(/"/g, '""')}"`,
        `"${(item.journal || '').replace(/"/g, '""')}"`,
        `"${(item.publisher || '').replace(/"/g, '""')}"`,
        item.year || '',
        item.doi || '',
        item.score || '',
        item.language || '',
        Array.isArray(item.online_link) ? item.online_link.join('; ') : (item.online_link || '')
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'scholar_search_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
