"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleBooksAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleBooksAPI {
    constructor(apiKey) {
        this.baseUrl = 'https://www.googleapis.com/books/v1';
        this.apiKey = apiKey;
    }
    async searchBooks(query, limit = 40) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/volumes`, {
                params: {
                    q: query,
                    maxResults: limit,
                    key: this.apiKey
                }
            });
            return response.data.items.map(book => ({
                title: book.volumeInfo.title,
                author: book.volumeInfo.authors?.[0] || 'Unknown',
                isbn: this.extractISBN(book.volumeInfo.industryIdentifiers),
                publishedYear: this.extractYear(book.volumeInfo.publishedDate),
                coverImage: book.volumeInfo.imageLinks?.thumbnail,
                rating: book.volumeInfo.averageRating || 0,
                description: book.volumeInfo.description,
                pace: this.determinePace(book.volumeInfo.pageCount),
                tone: this.extractTone(book.volumeInfo.description),
                themes: this.extractThemes(book.volumeInfo.categories, book.volumeInfo.description),
                bestFor: this.determineBestFor(book.volumeInfo)
            }));
        }
        catch (error) {
            console.error('Error searching books on Google Books:', error);
            throw error;
        }
    }
    extractISBN(identifiers) {
        if (!identifiers)
            return '';
        const isbn = identifiers.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10');
        return isbn?.identifier || '';
    }
    extractYear(date) {
        if (!date)
            return '';
        return date.split('-')[0];
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
        const tones = ['Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional'];
        return tones.filter(tone => description.toLowerCase().includes(tone.toLowerCase()));
    }
    extractThemes(categories, description) {
        const themes = new Set();
        if (categories) {
            categories.forEach(category => {
                const theme = category.split('/')[0].trim();
                if (theme)
                    themes.add(theme);
            });
        }
        if (description) {
            const commonThemes = [
                'Love', 'Friendship', 'Family', 'Coming of Age', 'Identity',
                'Social Issues', 'Politics', 'Philosophy', 'Science', 'Nature'
            ];
            commonThemes.forEach(theme => {
                if (description.toLowerCase().includes(theme.toLowerCase())) {
                    themes.add(theme);
                }
            });
        }
        return Array.from(themes);
    }
    determineBestFor(volumeInfo) {
        const audiences = [];
        if (volumeInfo.categories?.some(cat => cat.toLowerCase().includes('juvenile') ||
            cat.toLowerCase().includes('children'))) {
            audiences.push('Children');
        }
        if (volumeInfo.categories?.some(cat => cat.toLowerCase().includes('young adult'))) {
            audiences.push('Young Adults');
        }
        if (volumeInfo.pageCount) {
            if (volumeInfo.pageCount < 300) {
                audiences.push('Casual Readers');
            }
            else if (volumeInfo.pageCount > 600) {
                audiences.push('Avid Readers');
            }
        }
        return audiences;
    }
}
exports.GoogleBooksAPI = GoogleBooksAPI;
