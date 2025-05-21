import axios from 'axios';

interface StorygraphBook {
  title: string;
  author: string;
  cover_url: string;
  average_rating: number;
  description: string;
  pace: string;
  mood_tags: string[];
  theme_tags: string[];
  genre_tags?: string[];
  reading_level?: string;
}

interface StorygraphResponse {
  books: StorygraphBook[];
}

export class StorygraphAPI {
  private readonly baseUrl = 'https://api.storygraph.com/v1';

  async getTrendingBooks(limit: number = 50): Promise<any[]> {
    try {
      const response = await axios.get<StorygraphResponse>(
        `${this.baseUrl}/books/trending`,
        {
          params: { limit }
        }
      );

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
    } catch (error) {
      console.error('Error fetching trending books from Storygraph:', error);
      throw error;
    }
  }

  async searchBooks(query: string): Promise<any[]> {
    try {
      const response = await axios.get<StorygraphResponse>(
        `${this.baseUrl}/books/search`,
        {
          params: { q: query }
        }
      );

      return response.data.books.map((book) => ({
        title: book.title,
        author: book.author,
        coverImage: book.cover_url,
        rating: book.average_rating
      }));
    } catch (error) {
      console.error('Error searching books on Storygraph:', error);
      throw error;
    }
  }

  private mapPace(storygraphPace: string): 'Fast' | 'Moderate' | 'Slow' {
    // Map Storygraph's pace to our pace format
    const paceMap: { [key: string]: 'Fast' | 'Moderate' | 'Slow' } = {
      'fast-paced': 'Fast',
      'medium-paced': 'Moderate',
      'slow-paced': 'Slow'
    };
    return paceMap[storygraphPace] || 'Moderate';
  }

  private determineBestFor(book: StorygraphBook): string[] {
    // Determine who the book is best for based on its characteristics
    const audiences: string[] = [];

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
    } else if (book.reading_level === 'challenging') {
      audiences.push('Avid Readers');
    }

    return audiences;
  }
} 