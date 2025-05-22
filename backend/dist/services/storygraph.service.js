"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorygraphAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class StorygraphAPI {
    constructor() {
        this.baseUrl = 'https://api.storygraph.com/v1';
    }
    async getTrendingBooks(limit = 50) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/books/trending`, {
                params: { limit }
            });
            return response.data.books.map((book) => ({
                title: book.title,
                author: book.author,
                coverImage: book.cover_url,
                rating: book.average_rating,
                description: book.description,
                pace: this.mapPace(book.pace),
                tone: book.mood_tags,
                themes: book.theme_tags,
                bestFor: this.determineBestFor(book)
            }));
        }
        catch (error) {
            console.error('Error fetching trending books from Storygraph:', error);
            throw error;
        }
    }
    async searchBooks(query) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/books/search`, {
                params: { q: query }
            });
            return response.data.books.map((book) => ({
                title: book.title,
                author: book.author,
                coverImage: book.cover_url,
                rating: book.average_rating
            }));
        }
        catch (error) {
            console.error('Error searching books on Storygraph:', error);
            throw error;
        }
    }
    mapPace(storygraphPace) {
        // Map Storygraph's pace to our pace format
        const paceMap = {
            'fast-paced': 'Fast',
            'medium-paced': 'Moderate',
            'slow-paced': 'Slow'
        };
        return paceMap[storygraphPace] || 'Moderate';
    }
    determineBestFor(book) {
        // Determine who the book is best for based on its characteristics
        const audiences = [];
        // Add audiences based on book characteristics
        if (book.genre_tags?.includes('young-adult')) {
            audiences.push('Young Adults');
        }
        if (book.genre_tags?.includes('adult')) {
            audiences.push('Adults');
        }
        if (book.genre_tags?.includes('children')) {
            audiences.push('Children');
        }
        if (book.genre_tags?.includes('middle-grade')) {
            audiences.push('Middle Grade Readers');
        }
        // Add reading level
        if (book.reading_level === 'easy') {
            audiences.push('Casual Readers');
        }
        else if (book.reading_level === 'challenging') {
            audiences.push('Avid Readers');
        }
        return audiences;
    }
}
exports.StorygraphAPI = StorygraphAPI;
