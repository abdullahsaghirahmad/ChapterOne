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
                case 'profession':
                    // For profession search, we'll use general search and filter later
                    params.q = query;
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
                let professions = this.determineProfessions(doc, details);
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
                else if (searchType === 'profession') {
                    // Prioritize professions related to the search
                    professions = professions.filter(p => p.toLowerCase().includes(query.toLowerCase()) ||
                        query.toLowerCase().includes(p.toLowerCase()));
                    if (professions.length === 0) {
                        // If no matching professions found, add the search query as a profession
                        professions = [this.formatSearchTermAsProfession(query)];
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
                    professions: professions,
                    bestFor: this.determineBestFor(doc, details)
                };
            }));
            // If searching for profession, only return books with matching professions
            if (searchType === 'profession') {
                return books.filter(book => book.professions && book.professions.some((p) => p.toLowerCase().includes(query.toLowerCase()) ||
                    query.toLowerCase().includes(p.toLowerCase())));
            }
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
    /**
     * Determine relevant professions for a book based on its content
     * @param doc The book document from OpenLibrary
     * @param details Additional details about the book
     */
    determineProfessions(doc, details) {
        const professions = [];
        const professionKeywords = {
            'Product Management': ['product', 'user experience', 'customer', 'market', 'roadmap', 'innovation', 'feature', 'strategy', 'prioritization', 'agile'],
            'UX/UI Design': ['design', 'user interface', 'ux', 'ui', 'usability', 'creative', 'visual', 'prototype', 'accessibility', 'wireframe'],
            'Sales': ['sales', 'negotiation', 'customer', 'pitch', 'closing', 'persuasion', 'client', 'revenue', 'deal', 'objection'],
            'Marketing': ['marketing', 'brand', 'campaign', 'strategy', 'social media', 'audience', 'messaging', 'content', 'analytics', 'promotion'],
            'Software Engineering': ['software', 'engineer', 'code', 'development', 'programming', 'technical', 'architecture', 'algorithm', 'debugging', 'testing'],
            'Data Science': ['data', 'analytics', 'statistics', 'machine learning', 'ai', 'artificial intelligence', 'model', 'prediction', 'visualization', 'insight'],
            'Leadership': ['leadership', 'management', 'team', 'vision', 'inspiration', 'strategy', 'executive', 'coach', 'decision', 'influence'],
            'Project Management': ['project', 'management', 'timeline', 'deadline', 'resources', 'planning', 'coordination', 'risk', 'delivery', 'milestone'],
            'Finance': ['finance', 'investment', 'capital', 'budget', 'money', 'valuation', 'accounting', 'risk', 'portfolio', 'profit'],
            'Human Resources': ['human resources', 'hr', 'talent', 'hiring', 'recruitment', 'culture', 'people', 'training', 'performance', 'benefit'],
            'Entrepreneurship': ['startup', 'entrepreneur', 'founder', 'venture', 'business model', 'innovation', 'risk', 'growth', 'scaling', 'disruption'],
            'Consulting': ['consulting', 'advisory', 'problem-solving', 'strategy', 'analysis', 'recommendation', 'stakeholder', 'framework', 'client', 'business']
        };
        // Subjects that map to professions
        const subjectToProfession = {
            'business': ['Leadership', 'Entrepreneurship', 'Marketing', 'Sales', 'Finance'],
            'leadership': ['Leadership', 'Project Management'],
            'management': ['Leadership', 'Project Management', 'Human Resources'],
            'economics': ['Finance', 'Consulting'],
            'technology': ['Software Engineering', 'Data Science', 'Product Management'],
            'computer science': ['Software Engineering', 'Data Science'],
            'design': ['UX/UI Design', 'Product Management'],
            'psychology': ['Human Resources', 'Leadership', 'Sales', 'Marketing'],
            'self-help': ['Leadership', 'Entrepreneurship'],
            'science': ['Data Science', 'Software Engineering'],
            'innovation': ['Product Management', 'Entrepreneurship'],
            'startups': ['Entrepreneurship', 'Product Management'],
            'marketing': ['Marketing'],
            'sales': ['Sales'],
            'finance': ['Finance'],
            'human resources': ['Human Resources']
        };
        // Check description for relevant keywords
        const description = details?.description || '';
        if (description) {
            const descText = typeof description === 'string'
                ? description.toLowerCase()
                : description.value?.toLowerCase() || '';
            Object.entries(professionKeywords).forEach(([prof, keywords]) => {
                if (keywords.some(keyword => descText.includes(keyword.toLowerCase()))) {
                    professions.push(prof);
                }
            });
        }
        // Check subjects for relevant matches
        const subjects = doc.subject || [];
        subjects.forEach((subject) => {
            const subjectLower = subject.toLowerCase();
            Object.entries(subjectToProfession).forEach(([key, profs]) => {
                if (subjectLower.includes(key)) {
                    professions.push(...profs);
                }
            });
        });
        // Deduplicate professions
        return [...new Set(professions)];
    }
    /**
     * Format a search term as a profession
     */
    formatSearchTermAsProfession(term) {
        // Map common search terms to standardized profession names
        const professionMap = {
            'product': 'Product Management',
            'pm': 'Product Management',
            'product manager': 'Product Management',
            'design': 'UX/UI Design',
            'designer': 'UX/UI Design',
            'ux': 'UX/UI Design',
            'ui': 'UX/UI Design',
            'user experience': 'UX/UI Design',
            'user interface': 'UX/UI Design',
            'sales': 'Sales',
            'selling': 'Sales',
            'marketing': 'Marketing',
            'market': 'Marketing',
            'engineering': 'Software Engineering',
            'developer': 'Software Engineering',
            'programming': 'Software Engineering',
            'software': 'Software Engineering',
            'data': 'Data Science',
            'analytics': 'Data Science',
            'machine learning': 'Data Science',
            'leadership': 'Leadership',
            'leader': 'Leadership',
            'management': 'Leadership',
            'project': 'Project Management',
            'project manager': 'Project Management',
            'finance': 'Finance',
            'financial': 'Finance',
            'hr': 'Human Resources',
            'human resources': 'Human Resources',
            'entrepreneur': 'Entrepreneurship',
            'startup': 'Entrepreneurship',
            'business': 'Entrepreneurship',
            'consulting': 'Consulting',
            'consultant': 'Consulting',
            'advisory': 'Consulting'
        };
        const termLower = term.toLowerCase();
        for (const [key, value] of Object.entries(professionMap)) {
            if (termLower.includes(key)) {
                return value;
            }
        }
        // If no match found, capitalize the first letter and return
        return term.charAt(0).toUpperCase() + term.slice(1);
    }
}
exports.OpenLibraryAPI = OpenLibraryAPI;
