import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookCard } from '../features/BookCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { getCollectionByMood, getRandomCollections, CuratedCollection } from '../../data/curatedCollections';

interface CuratedCollectionsProps {
  maxCollections?: number;
}

export const CuratedCollections: React.FC<CuratedCollectionsProps> = ({ 
  maxCollections = 3 
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [collections, setCollections] = useState<CuratedCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPersonalizedCollections = async () => {
      setLoading(true);
      
      try {
        let selectedCollections: CuratedCollection[] = [];

        if (user) {
          // Get user preferences for personalization
          const context = await UserPreferencesService.getPersonalizedRecommendationContext();
          
          // If user has a current mood, prioritize that collection
          if (context.mood) {
            const moodCollection = getCollectionByMood(context.mood.toLowerCase());
            if (moodCollection) {
              selectedCollections.push(moodCollection);
            }
          }

          // Fill remaining slots with random collections
          const remaining = maxCollections - selectedCollections.length;
          if (remaining > 0) {
            const randomCollections = getRandomCollections(remaining + 2)
              .filter(collection => !selectedCollections.some(sc => sc.id === collection.id))
              .slice(0, remaining);
            selectedCollections.push(...randomCollections);
          }
        } else {
          // For anonymous users, show popular/diverse collections
          selectedCollections = getRandomCollections(maxCollections);
        }

        setCollections(selectedCollections);
      } catch (error) {
        console.error('Error loading personalized collections:', error);
        // Fallback to random collections
        setCollections(getRandomCollections(maxCollections));
      } finally {
        setLoading(false);
      }
    };

    loadPersonalizedCollections();
  }, [user, maxCollections]);

  if (loading) {
    return (
      <div className="space-y-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4">
            <div className={`h-8 rounded w-64 animate-pulse ${
              theme === 'light'
                ? 'bg-gray-200'
                : theme === 'dark'
                ? 'bg-gray-700'
                : 'bg-purple-200'
            }`} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, j) => (
                <div key={j} className={`h-96 rounded-lg animate-pulse ${
                  theme === 'light'
                    ? 'bg-gray-200'
                    : theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-purple-200'
                }`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12">
      {collections.map((collection, collectionIndex) => (
        <motion.div
          key={collection.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: collectionIndex * 0.1,
            ease: [0.4, 0.0, 0.2, 1]
          }}
          className="space-y-6"
        >
          {/* Collection Header */}
          <div className="flex items-center gap-4">
            <span className="text-3xl">{collection.icon}</span>
            <div>
              <h2 className={`text-2xl font-bold ${
                theme === 'light'
                  ? 'text-gray-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                {collection.title}
              </h2>
              <p className={`text-sm ${
                theme === 'light'
                  ? 'text-gray-600'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-600'
              }`}>
                {collection.description}
              </p>
            </div>
          </div>

          {/* Collection Books */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.books.map((book, bookIndex) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.3, 
                  delay: (collectionIndex * 0.1) + (bookIndex * 0.05),
                  ease: [0.4, 0.0, 0.2, 1]
                }}
              >
                <BookCard
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  coverImage={book.coverImage}
                  pace={book.pace}
                  tone={book.tone}
                  themes={book.themes}
                  description={book.description}
                  bestFor={book.bestFor}
                  isExternal={book.isExternal}
                />
              </motion.div>
            ))}
          </div>

          {/* Collection Footer */}
          <div className={`pt-4 border-t ${
            theme === 'light'
              ? 'border-gray-200'
              : theme === 'dark'
              ? 'border-gray-700'
              : 'border-purple-200'
          }`}>
            <p className={`text-xs ${
              theme === 'light'
                ? 'text-gray-500'
                : theme === 'dark'
                ? 'text-gray-400'
                : 'text-purple-500'
            }`}>
              Curated by our team for readers seeking {collection.mood} experiences
            </p>
          </div>
        </motion.div>
      ))}

      {/* Personalization Note for Logged-in Users */}
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={`p-4 rounded-lg ${
            theme === 'light'
              ? 'bg-primary-50 border border-primary-200'
              : theme === 'dark'
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-gradient-to-r from-pink-50 to-purple-50 border border-purple-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🎯</span>
            <div>
              <h3 className={`font-medium ${
                theme === 'light'
                  ? 'text-primary-900'
                  : theme === 'dark'
                  ? 'text-white'
                  : 'text-purple-900'
              }`}>
                Personalized for You
              </h3>
              <p className={`text-sm ${
                theme === 'light'
                  ? 'text-primary-700'
                  : theme === 'dark'
                  ? 'text-gray-300'
                  : 'text-purple-700'
              }`}>
                These collections are curated based on your reading preferences and current mood. 
                The more you interact with books, the better our recommendations become!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Call-to-Action for Anonymous Users */}
      {!user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={`p-6 rounded-lg text-center ${
            theme === 'light'
              ? 'bg-primary-50 border border-primary-200'
              : theme === 'dark'
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-gradient-to-r from-pink-50 to-purple-50 border border-purple-200'
          }`}
        >
          <div className="space-y-3">
            <span className="text-2xl">✨</span>
            <h3 className={`text-lg font-semibold ${
              theme === 'light'
                ? 'text-primary-900'
                : theme === 'dark'
                ? 'text-white'
                : 'text-purple-900'
            }`}>
              Get Personalized Recommendations
            </h3>
            <p className={`text-sm ${
              theme === 'light'
                ? 'text-primary-700'
                : theme === 'dark'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              Sign up to save books, track your reading, and get mood-based recommendations tailored just for you!
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};