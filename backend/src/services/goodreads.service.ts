import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

interface GoodreadsBook {
  title: string;
  author: {
    name: string;
  };
  isbn: string;
  publication_year: string;
  image_url: string;
  average_rating: string;
  description: string;
  num_pages: string;
}

interface GoodreadsResponse {
  GoodreadsResponse: {
    books: {
      book: GoodreadsBook[];
    };
    search?: {
      results: {
        work: {
          best_book: {
            title: string;
            author: {
              name: string;
            };
            image_url: string;
          };
          average_rating: string;
        };
      };
    };
  };
}

export class GoodreadsAPI {
  private readonly baseUrl = 'https://www.goodreads.com';
  private readonly apiKey: string;
  private readonly parser: XMLParser;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  async getPopularBooks(limit: number = 50): Promise<any[]> {
    try {
      const response = await axios.get<string>(
        `${this.baseUrl}/book/popular_by_date.xml`,
        {
          params: {
            key: this.apiKey,
            limit
          }
        }
      );

      const result = this.parser.parse(response.data) as GoodreadsResponse;
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
    } catch (error) {
      console.error('Error fetching popular books from Goodreads:', error);
      throw error;
    }
  }

  async searchBooks(query: string): Promise<any[]> {
    try {
      const response = await axios.get<string>(
        `${this.baseUrl}/search/index.xml`,
        {
          params: {
            key: this.apiKey,
            q: query
          }
        }
      );

      const result = this.parser.parse(response.data) as GoodreadsResponse;
      const books = result.GoodreadsResponse.search?.results.work || [];

      return books.map((book) => ({
        title: book.best_book.title,
        author: book.best_book.author.name,
        coverImage: book.best_book.image_url,
        rating: parseFloat(book.average_rating)
      }));
    } catch (error) {
      console.error('Error searching books on Goodreads:', error);
      throw error;
    }
  }

  private determinePace(book: GoodreadsBook): 'Fast' | 'Moderate' | 'Slow' {
    const pageCount = parseInt(book.num_pages) || 0;
    if (pageCount < 300) return 'Fast';
    if (pageCount < 600) return 'Moderate';
    return 'Slow';
  }

  private extractTone(book: GoodreadsBook): string[] {
    const tones = ['Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional'];
    return tones.filter(tone => 
      book.description?.toLowerCase().includes(tone.toLowerCase())
    );
  }

  private extractThemes(book: GoodreadsBook): string[] {
    const themes = [
      'Love', 'Friendship', 'Family', 'Coming of Age', 'Identity',
      'Social Issues', 'Politics', 'Philosophy', 'Science', 'Nature'
    ];
    return themes.filter(theme => 
      book.description?.toLowerCase().includes(theme.toLowerCase())
    );
  }

  private determineBestFor(book: GoodreadsBook): string[] {
    const audiences = [
      'Young Adults', 'Adults', 'Seniors',
      'Fiction Lovers', 'Non-fiction Readers',
      'Casual Readers', 'Avid Readers'
    ];
    return audiences.filter(audience => 
      book.description?.toLowerCase().includes(audience.toLowerCase())
    );
  }
} 