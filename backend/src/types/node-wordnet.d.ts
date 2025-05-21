declare module 'node-wordnet' {
  export class WordNet {
    lookup(word: string): Promise<any[]>;
  }
} 