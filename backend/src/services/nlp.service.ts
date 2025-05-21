import natural from 'natural';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WordNet = require('node-wordnet');

export class NLPService {
  private tokenizer: natural.WordTokenizer;
  private wordnet: any;
  private themeKeywords!: Map<string, string[]>;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.wordnet = new WordNet();
    this.initializeThemeKeywords();
  }

  private initializeThemeKeywords() {
    this.themeKeywords = new Map([
      ['Love', ['love', 'romance', 'passion', 'affection', 'heart', 'relationship']],
      ['Friendship', ['friend', 'friendship', 'companionship', 'bond', 'loyalty']],
      ['Family', ['family', 'parent', 'child', 'sibling', 'relative', 'home']],
      ['Coming of Age', ['grow', 'mature', 'adolescent', 'teen', 'youth', 'adult']],
      ['Identity', ['identity', 'self', 'personality', 'character', 'individual']],
      ['Social Issues', ['society', 'social', 'community', 'culture', 'class', 'race']],
      ['Politics', ['political', 'government', 'power', 'authority', 'policy']],
      ['Philosophy', ['philosophy', 'thought', 'idea', 'concept', 'theory']],
      ['Science', ['science', 'scientific', 'research', 'discovery', 'experiment']],
      ['Nature', ['nature', 'environment', 'earth', 'world', 'planet', 'life']],
      ['War', ['war', 'battle', 'conflict', 'fight', 'military', 'soldier']],
      ['Death', ['death', 'die', 'dead', 'mortal', 'life', 'end']],
      ['Religion', ['religion', 'spiritual', 'faith', 'god', 'belief', 'worship']],
      ['Art', ['art', 'artist', 'creative', 'beauty', 'aesthetic', 'design']],
      ['Technology', ['technology', 'tech', 'digital', 'computer', 'machine', 'future']],
      ['History', ['history', 'historical', 'past', 'time', 'era', 'period']],
      ['Crime', ['crime', 'criminal', 'law', 'justice', 'police', 'detective']],
      ['Mystery', ['mystery', 'mysterious', 'secret', 'puzzle', 'clue', 'investigation']],
      ['Adventure', ['adventure', 'journey', 'quest', 'explore', 'discover', 'travel']],
      ['Fantasy', ['fantasy', 'magic', 'magical', 'supernatural', 'myth', 'legend']]
    ]);
  }

  async extractThemes(text: string): Promise<string[]> {
    if (!text) return [];

    // Tokenize and normalize text
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const themes = new Set<string>();

    // Check for direct keyword matches
    for (const [theme, keywords] of this.themeKeywords) {
      if (keywords.some(keyword => tokens.includes(keyword))) {
        themes.add(theme);
      }
    }

    // Use WordNet to find related words
    for (const token of tokens) {
      try {
        const synonyms = await this.wordnet.lookup(token);
        for (const syn of synonyms) {
          for (const [theme, keywords] of this.themeKeywords) {
            if (keywords.some(keyword => syn.synonyms.includes(keyword))) {
              themes.add(theme);
            }
          }
        }
      } catch (error) {
        // Ignore WordNet lookup errors
        continue;
      }
    }

    return Array.from(themes);
  }

  async extractTone(text: string): Promise<string[]> {
    if (!text) return [];

    const tones = new Map<string, string[]>([
      ['Humorous', ['funny', 'humor', 'comedy', 'laugh', 'joke', 'wit']],
      ['Dark', ['dark', 'gloomy', 'depressing', 'sad', 'tragic', 'bleak']],
      ['Lighthearted', ['light', 'cheerful', 'happy', 'joyful', 'playful', 'fun']],
      ['Serious', ['serious', 'grave', 'solemn', 'earnest', 'important', 'weighty']],
      ['Emotional', ['emotional', 'feeling', 'passionate', 'intense', 'moving', 'touching']],
      ['Suspenseful', ['suspense', 'tension', 'thrilling', 'exciting', 'gripping', 'edge']],
      ['Romantic', ['romantic', 'love', 'passion', 'affection', 'tender', 'sweet']],
      ['Mysterious', ['mysterious', 'mystery', 'enigmatic', 'puzzling', 'curious', 'strange']],
      ['Nostalgic', ['nostalgic', 'nostalgia', 'memory', 'remember', 'past', 'reminisce']],
      ['Inspirational', ['inspire', 'inspirational', 'motivate', 'uplift', 'encourage', 'hope']]
    ]);

    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const detectedTones = new Set<string>();

    for (const [tone, keywords] of tones) {
      if (keywords.some(keyword => tokens.includes(keyword))) {
        detectedTones.add(tone);
      }
    }

    return Array.from(detectedTones);
  }

  async determinePace(text: string, pageCount?: number): Promise<'Fast' | 'Moderate' | 'Slow'> {
    if (pageCount) {
      if (pageCount < 300) return 'Fast';
      if (pageCount < 600) return 'Moderate';
      return 'Slow';
    }

    if (!text) return 'Moderate';

    const paceIndicators = {
      Fast: ['fast', 'quick', 'rapid', 'swift', 'brisk', 'paced', 'thrilling', 'action'],
      Slow: ['slow', 'leisurely', 'gradual', 'measured', 'deliberate', 'detailed', 'descriptive'],
      Moderate: ['balanced', 'steady', 'moderate', 'even', 'consistent']
    };

    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const scores = {
      Fast: 0,
      Moderate: 0,
      Slow: 0
    };

    for (const [pace, indicators] of Object.entries(paceIndicators)) {
      scores[pace as keyof typeof scores] = indicators.filter(
        indicator => tokens.includes(indicator)
      ).length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'Moderate';

    return Object.entries(scores).find(
      ([_, score]) => score === maxScore
    )?.[0] as 'Fast' | 'Moderate' | 'Slow';
  }

  async determineBestFor(
    text: string,
    categories?: string[],
    pageCount?: number
  ): Promise<string[]> {
    const audiences = new Set<string>();

    // Check categories
    if (categories) {
      if (categories.some(cat => 
        cat.toLowerCase().includes('juvenile') || 
        cat.toLowerCase().includes('children')
      )) {
        audiences.add('Children');
      }
      if (categories.some(cat => 
        cat.toLowerCase().includes('young adult')
      )) {
        audiences.add('Young Adults');
      }
    }

    // Check page count
    if (pageCount) {
      if (pageCount < 300) {
        audiences.add('Casual Readers');
      } else if (pageCount > 600) {
        audiences.add('Avid Readers');
      }
    }

    // Check text content
    if (text) {
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      
      if (tokens.some(token => 
        ['child', 'children', 'kid', 'kids', 'young', 'youth'].includes(token)
      )) {
        audiences.add('Children');
      }
      
      if (tokens.some(token => 
        ['teen', 'teenager', 'adolescent', 'young adult'].includes(token)
      )) {
        audiences.add('Young Adults');
      }

      if (tokens.some(token => 
        ['simple', 'easy', 'basic', 'beginner'].includes(token)
      )) {
        audiences.add('Casual Readers');
      }

      if (tokens.some(token => 
        ['complex', 'challenging', 'advanced', 'sophisticated'].includes(token)
      )) {
        audiences.add('Avid Readers');
      }
    }

    return Array.from(audiences);
  }
} 