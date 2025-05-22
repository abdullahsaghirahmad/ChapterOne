"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenLibraryAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenLibraryAPI {
    constructor() {
        this.baseUrl = 'https://openlibrary.org';
        this.searchUrl = 'https://openlibrary.org/search.json';
    }
    /**
     * Search for books in OpenLibrary
     * @param query Search query
     * @param limit Maximum number of results
     * @param searchType Type of search: 'all', 'title', 'author', 'mood', 'theme'
     */
    async searchBooks(query, limit = 50, searchType = 'all') {
        try {
            let params = { limit };
            // Customize query based on search type
            switch (searchType) {
                case 'title':
                    params.title = query;
                    break;
                case 'author':
                    params.author = query;
                    break;
                case 'subject':
                case 'theme':
                    params.subject = query;
                    break;
                case 'all':
                default:
                    params.q = query;
                    break;
            }
            const response = await axios_1.default.get(this.searchUrl, { params });
            const books = await Promise.all(response.data.docs.map(async (doc) => {
                const details = await this.getBookDetails(doc.key);
                // Process moods and themes based on searchType
                let tone = this.extractTone(details?.description);
                let themes = this.extractThemes(doc.subject, details?.description);
                // Enhance results if searching for mood or theme
                if (searchType === 'mood' || searchType === 'tone') {
                    // Prioritize tones related to the search
                    tone = tone.filter(t => t.toLowerCase().includes(query.toLowerCase()) ||
                        query.toLowerCase().includes(t.toLowerCase()));
                    if (tone.length === 0) {
                        // If no matching tones found, add the search query as a tone
                        tone = [this.formatSearchTermAsTone(query)];
                    }
                }
                else if (searchType === 'theme') {
                    // Prioritize themes related to the search
                    themes = themes.filter(t => t.toLowerCase().includes(query.toLowerCase()) ||
                        query.toLowerCase().includes(t.toLowerCase()));
                    if (themes.length === 0) {
                        // If no matching themes found, add the search query as a theme
                        themes = [this.formatSearchTermAsTheme(query)];
                    }
                }
                return {
                    title: doc.title,
                    author: doc.author_name?.[0] || 'Unknown',
                    publishedYear: doc.first_publish_year?.toString() || '',
                    coverImage: doc.cover_i ?
                        `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` :
                        undefined,
                    pageCount: doc.number_of_pages_median,
                    description: details?.description,
                    firstSentence: details?.first_sentence,
                    subjects: doc.subject || [],
                    pace: this.determinePace(doc.number_of_pages_median),
                    tone: tone,
                    themes: themes,
                    bestFor: this.determineBestFor(doc, details)
                };
            }));
            return books;
        }
        catch (error) {
            console.error('Error searching books on Open Library:', error);
            throw error;
        }
    }
    async getBookDetails(key) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}${key}.json`);
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching book details for ${key}:`, error);
            return null;
        }
    }
    determinePace(pageCount) {
        if (!pageCount)
            return 'Moderate';
        if (pageCount < 300)
            return 'Fast';
        if (pageCount < 600)
            return 'Moderate';
        return 'Slow';
    }
    extractTone(description) {
        if (!description)
            return [];
        // Handle case where description is an object with a value property
        const descText = typeof description === 'string' ? description :
            (description.value ? description.value : '');
        if (!descText)
            return [];
        const tones = [
            'Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional', 'Inspirational',
            'Romantic', 'Suspenseful', 'Mysterious', 'Thoughtful', 'Uplifting', 'Philosophical',
            'Dramatic', 'Intense', 'Comforting', 'Melancholic', 'Hopeful', 'Scientific'
        ];
        return tones.filter(tone => descText.toLowerCase().includes(tone.toLowerCase()));
    }
    formatSearchTermAsTone(term) {
        // Capitalize first letter and make the rest lowercase
        return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    }
    formatSearchTermAsTheme(term) {
        // Capitalize first letter and make the rest lowercase
        return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    }
    extractThemes(subjects, description) {
        const themes = new Set();
        if (subjects) {
            subjects.forEach(subject => {
                // Open Library subjects are often hierarchical, e.g., "Fiction -- Science Fiction"
                const theme = subject.split('--')[0].trim();
                if (theme)
                    themes.add(theme);
            });
        }
        // Handle case where description is an object with a value property
        const descText = typeof description === 'string' ? description :
            (description?.value ? description.value : '');
        if (descText) {
            const commonThemes = [
                'Love', 'Friendship', 'Family', 'Coming of Age', 'Identity',
                'Social Issues', 'Politics', 'Philosophy', 'Science', 'Nature',
                'Adventure', 'Mystery', 'Fantasy', 'Science Fiction', 'History',
                'Travel', 'Self-Discovery', 'Courage', 'Loss', 'Redemption',
                'Technology', 'Magic', 'Survival', 'War', 'Peace', 'Justice'
            ];
            commonThemes.forEach(theme => {
                if (descText.toLowerCase().includes(theme.toLowerCase())) {
                    themes.add(theme);
                }
            });
        }
        return Array.from(themes);
    }
    determineBestFor(doc, details) {
        const audiences = [];
        // Check subjects for audience indicators
        if (doc.subject?.some(subject => subject.toLowerCase().includes('juvenile') ||
            subject.toLowerCase().includes('children'))) {
            audiences.push('Children');
        }
        if (doc.subject?.some(subject => subject.toLowerCase().includes('young adult'))) {
            audiences.push('Young Adults');
        }
        // Check page count for reading level
        if (doc.number_of_pages_median) {
            if (doc.number_of_pages_median < 300) {
                audiences.push('Casual Readers');
            }
            else if (doc.number_of_pages_median > 600) {
                audiences.push('Avid Readers');
            }
        }
        // Check description for additional audience indicators
        if (details?.description) {
            // Handle case where description is an object with a value property
            const descText = typeof details.description === 'string' ? details.description :
                (details.description.value ? details.description.value : '');
            if (descText) {
                if (descText.toLowerCase().includes('children')) {
                    audiences.push('Children');
                }
                if (descText.toLowerCase().includes('young adult')) {
                    audiences.push('Young Adults');
                }
            }
        }
        return audiences;
    }
}
exports.OpenLibraryAPI = OpenLibraryAPI;
