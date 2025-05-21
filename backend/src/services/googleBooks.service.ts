import axios from 'axios';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors: string[];
    description: string;
    industryIdentifiers: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount: number;
    publishedDate: string;
    imageLinks?: {
      thumbnail: string;
    };
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
  };
}

interface GoogleBooksResponse {
  items: GoogleBook[];
  totalItems: number;
}

export class GoogleBooksAPI {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchBooks(query: string, limit: number = 40): Promise<any[]> {
    try {
      const response = await axios.get<GoogleBooksResponse>(
        `${this.baseUrl}/volumes`,
        {
          params: {
            q: query,
            maxResults: limit,
            key: this.apiKey
          }
        }
      );

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
    } catch (error) {
      console.error('Error searching books on Google Books:', error);
      throw error;
    }
  }

  private extractISBN(identifiers: GoogleBook['volumeInfo']['industryIdentifiers']): string {
    if (!identifiers) return '';
    const isbn = identifiers.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10');
    return isbn?.identifier || '';
  }

  private extractYear(date: string): string {
    if (!date) return '';
    return date.split('-')[0];
  }

  private determinePace(pageCount?: number): 'Fast' | 'Moderate' | 'Slow' {
    if (!pageCount) return 'Moderate';
    if (pageCount < 300) return 'Fast';
    if (pageCount < 600) return 'Moderate';
    return 'Slow';
  }

  private extractTone(description?: string): string[] {
    if (!description) return [];
    const tones = ['Humorous', 'Dark', 'Lighthearted', 'Serious', 'Emotional'];
    return tones.filter(tone => 
      description.toLowerCase().includes(tone.toLowerCase())
    );
  }

  private extractThemes(categories?: string[], description?: string): string[] {
    const themes = new Set<string>();
    
    if (categories) {
      categories.forEach(category => {
        const theme = category.split('/')[0].trim();
        if (theme) themes.add(theme);
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

  private determineBestFor(volumeInfo: GoogleBook['volumeInfo']): string[] {
    const audiences: string[] = [];

    if (volumeInfo.categories?.some(cat => 
      cat.toLowerCase().includes('juvenile') || 
      cat.toLowerCase().includes('children')
    )) {
      audiences.push('Children');
    }

    if (volumeInfo.categories?.some(cat => 
      cat.toLowerCase().includes('young adult')
    )) {
      audiences.push('Young Adults');
    }

    if (volumeInfo.pageCount) {
      if (volumeInfo.pageCount < 300) {
        audiences.push('Casual Readers');
      } else if (volumeInfo.pageCount > 600) {
        audiences.push('Avid Readers');
      }
    }

    return audiences;
  }
} 