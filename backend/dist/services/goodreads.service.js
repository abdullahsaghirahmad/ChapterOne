"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodreadsAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const fast_xml_parser_1 = require("fast-xml-parser");
class GoodreadsAPI {
    constructor(apiKey) {
        this.baseUrl = 'https://www.goodreads.com';
        this.apiKey = apiKey;
        this.parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
    }
    async getPopularBooks(limit = 50) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/book/popular_by_date.xml`, {
                params: {
                    key: this.apiKey,
                    limit
                }
            });
            const result = this.parser.parse(response.data);
            const books = result.GoodreadsResponse.books.book;
            return books.map((book) => ({
                title: book.title,
                author: book.author.name,
                isbn: book.isbn,
                publishedYear: book.publication_year,
                coverImage: book.image_url,
                rating: parseFloat(book.average_rating),
                description: book.description,
                pace: this.determinePace(book),
                tone: this.extractTone(book),
                themes: this.extractThemes(book),
                bestFor: this.determineBestFor(book)
            }));
        }
        catch (error) {
            console.error('Error fetching popular books from Goodreads:', error);
            throw error;
        }
    }
    async searchBooks(query) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/search/index.xml`, {
                params: {
                    key: this.apiKey,
                    q: query
                }
            });
            const result = this.parser.parse(response.data);
            const books = result.GoodreadsResponse.search?.results.work || [];
            if (!Array.isArray(books)) {
                return [];
            }
            return books.map((book) => ({
                title: book.best_book.title,
                author: book.best_book.author.name,
                coverImage: book.best_book.image_url,
                rating: parseFloat(book.average_rating)
            }));
        }
        catch (error) {
            console.error('Error searching books on Goodreads:', error);
            throw error;
        }
    }
    determinePace(book) {
        const pageCount = parseInt(book.num_pages) || 0;
        if (pageCount < 300)
            return 'Fast';
        if (pageCount < 600)
            return 'Moderate';
        return 'Slow';
    }
    extractTone(book) {
        const tones = ['Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional'];
        return tones.filter(tone => book.description?.toLowerCase().includes(tone.toLowerCase()));
    }
    extractThemes(book) {
        const themes = [
            'Love', 'Friendship', 'Family', 'Coming of Age', 'Identity',
            'Social Issues', 'Politics', 'Philosophy', 'Science', 'Nature'
        ];
        return themes.filter(theme => book.description?.toLowerCase().includes(theme.toLowerCase()));
    }
    determineBestFor(book) {
        const audiences = [
            'Young Adults', 'Adults', 'Seniors',
            'Fiction Lovers', 'Non-fiction Readers',
            'Casual Readers', 'Avid Readers'
        ];
        return audiences.filter(audience => book.description?.toLowerCase().includes(audience.toLowerCase()));
    }
}
exports.GoodreadsAPI = GoodreadsAPI;
