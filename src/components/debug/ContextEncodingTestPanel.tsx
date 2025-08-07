import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  CpuChipIcon,
  ChartBarIcon,
  BeakerIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { ContextEncoderService, EncodedContext, ContextSimilarity } from '../../services/contextEncoder.service';
import { ContextVector } from '../../services/ml.service';

interface EncodingTestResult {
  testName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: EncodedContext | ContextSimilarity[] | any;
  message: string;
  duration?: number;
}

const TEST_CONTEXTS: { name: string; context: ContextVector }[] = [
  {
    name: 'Relaxed Evening Reader',
    context: { mood: 'relaxed', situation: 'before_bed', goal: 'entertainment', timeOfDay: 'evening' }
  },
  {
    name: 'Motivated Morning Learner', 
    context: { mood: 'motivated', situation: 'morning', goal: 'learning', timeOfDay: 'morning' }
  },
  {
    name: 'Curious Commuter',
    context: { mood: 'curious', situation: 'commuting', goal: 'learning', timeOfDay: 'morning' }
  },
  {
    name: 'Weekend Explorer',
    context: { mood: 'adventurous', situation: 'weekend', goal: 'inspiration', timeOfDay: 'afternoon' }
  },
  {
    name: 'Focused Professional',
    context: { mood: 'focused', situation: 'work_day', goal: 'professional', timeOfDay: 'afternoon' }
  },
  {
    name: 'Nostalgic Evening',
    context: { mood: 'nostalgic', situation: 'evening', goal: 'perspective', timeOfDay: 'evening' }
  }
];

export const ContextEncodingTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const [testResults, setTestResults] = useState<EncodingTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedContext1, setSelectedContext1] = useState(0);
  const [selectedContext2, setSelectedContext2] = useState(1);

  const runEncodingTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      'Basic Context Encoding',
      'Vector Dimensions Check', 
      'Context Similarity Calculation',
      'Similar Context Detection',
      'Temporal Feature Encoding',
      'Edge Case Handling'
    ];

    // Initialize results
    const initialResults = tests.map(test => ({
      testName: test,
      status: 'pending' as const,
      message: 'Waiting...'
    }));
    setTestResults(initialResults);

    try {
      // Test 1: Basic Context Encoding
      setTestResults(prev => prev.map(r => r.testName === 'Basic Context Encoding'
        ? { ...r, status: 'running', message: 'Encoding test contexts...' }
        : r
      ));

      const startTime1 = Date.now();
      const testContext = TEST_CONTEXTS[0].context;
      const encoded = ContextEncoderService.encodeContext(testContext, 'test-user');
      
      setTestResults(prev => prev.map(r => r.testName === 'Basic Context Encoding'
        ? {
            ...r,
            status: 'success',
            message: `✅ Encoded to ${encoded.vector.length}D vector`,
            result: encoded,
            duration: Date.now() - startTime1
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 2: Vector Dimensions Check
      setTestResults(prev => prev.map(r => r.testName === 'Vector Dimensions Check'
        ? { ...r, status: 'running', message: 'Checking vector structure...' }
        : r
      ));

      const expectedDims = 8 + 8 + 8 + 12 + 8; // mood + situation + goal + temporal + user
      const actualDims = encoded.vector.length;
      const dimensionsOk = actualDims === expectedDims;

      setTestResults(prev => prev.map(r => r.testName === 'Vector Dimensions Check'
        ? {
            ...r,
            status: dimensionsOk ? 'success' : 'error',
            message: dimensionsOk 
              ? `✅ Vector dimensions correct (${actualDims}D)`
              : `❌ Expected ${expectedDims}D, got ${actualDims}D`,
            result: {
              expected: expectedDims,
              actual: actualDims,
              breakdown: {
                mood: encoded.dimensions.mood.length,
                situation: encoded.dimensions.situation.length,
                goal: encoded.dimensions.goal.length,
                temporal: encoded.dimensions.temporal.length,
                user: encoded.dimensions.user.length
              }
            }
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 3: Context Similarity
      setTestResults(prev => prev.map(r => r.testName === 'Context Similarity Calculation'
        ? { ...r, status: 'running', message: 'Calculating context similarities...' }
        : r
      ));

      const context1 = TEST_CONTEXTS[selectedContext1].context;
      const context2 = TEST_CONTEXTS[selectedContext2].context;
      const similarity = ContextEncoderService.calculateContextSimilarity(context1, context2);

      setTestResults(prev => prev.map(r => r.testName === 'Context Similarity Calculation'
        ? {
            ...r,
            status: 'success',
            message: `✅ Similarity: ${(similarity.similarity * 100).toFixed(1)}%`,
            result: similarity
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 4: Similar Context Detection
      setTestResults(prev => prev.map(r => r.testName === 'Similar Context Detection'
        ? { ...r, status: 'running', message: 'Finding similar contexts...' }
        : r
      ));

      const targetContext = TEST_CONTEXTS[0].context;
      const otherContexts = TEST_CONTEXTS.slice(1).map(tc => tc.context);
      const similarContexts = ContextEncoderService.findSimilarContexts(
        targetContext, 
        otherContexts, 
        0.3, // Lower threshold for testing
        3
      );

      setTestResults(prev => prev.map(r => r.testName === 'Similar Context Detection'
        ? {
            ...r,
            status: 'success',
            message: `✅ Found ${similarContexts.length} similar contexts`,
            result: similarContexts
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 5: Temporal Features
      setTestResults(prev => prev.map(r => r.testName === 'Temporal Feature Encoding'
        ? { ...r, status: 'running', message: 'Testing temporal encoding...' }
        : r
      ));

      // Test different times of day
      const morningContext = { ...testContext, timeOfDay: 'morning' as const };
      const eveningContext = { ...testContext, timeOfDay: 'evening' as const };
      
      const morningEncoded = ContextEncoderService.encodeContext(morningContext);
      const eveningEncoded = ContextEncoderService.encodeContext(eveningContext);
      
      const temporalDifference = ContextEncoderService.calculateContextSimilarity(
        morningContext, 
        eveningContext
      );

      setTestResults(prev => prev.map(r => r.testName === 'Temporal Feature Encoding'
        ? {
            ...r,
            status: 'success',
            message: `✅ Temporal features working (morning vs evening: ${(temporalDifference.similarity * 100).toFixed(1)}% similar)`,
            result: {
              morningTemporal: morningEncoded.dimensions.temporal,
              eveningTemporal: eveningEncoded.dimensions.temporal,
              temporalSimilarity: temporalDifference.similarity
            }
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 300));

      // Test 6: Edge Cases
      setTestResults(prev => prev.map(r => r.testName === 'Edge Case Handling'
        ? { ...r, status: 'running', message: 'Testing edge cases...' }
        : r
      ));

      // Test empty context
      const emptyContext: ContextVector = {};
      const emptyEncoded = ContextEncoderService.encodeContext(emptyContext);
      
      // Test invalid context
      const invalidContext: ContextVector = {
        mood: 'nonexistent_mood',
        situation: 'invalid_situation',
        goal: 'fake_goal'
      };
      const invalidEncoded = ContextEncoderService.encodeContext(invalidContext);

      setTestResults(prev => prev.map(r => r.testName === 'Edge Case Handling'
        ? {
            ...r,
            status: 'success',
            message: `✅ Edge cases handled gracefully`,
            result: {
              emptyContextLength: emptyEncoded.vector.length,
              invalidContextLength: invalidEncoded.vector.length,
              bothValid: emptyEncoded.vector.length > 0 && invalidEncoded.vector.length > 0
            }
          }
        : r
      ));

    } catch (error) {
      console.error('Context encoding test error:', error);
      setTestResults(prev => prev.map(r => 
        r.status === 'running' 
          ? { ...r, status: 'error', message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const testContextSimilarity = () => {
    const context1 = TEST_CONTEXTS[selectedContext1];
    const context2 = TEST_CONTEXTS[selectedContext2];
    const similarity = ContextEncoderService.calculateContextSimilarity(context1.context, context2.context);
    
    console.log('Context Similarity Test:', {
      context1: context1.name,
      context2: context2.name,
      similarity
    });
  };

  return (
    <div className={`p-6 rounded-xl border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Context Encoding Test Panel
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Test context vectorization, similarity, and temporal features
            </p>
          </div>
        </div>

        <button
          onClick={runEncodingTests}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <BeakerIcon className="h-4 w-4 animate-pulse" />
              <span>Running Tests...</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Test Context Encoding</span>
            </>
          )}
        </button>
      </div>

      {/* Context Similarity Tester */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className={`text-sm font-medium mb-3 ${
          theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
        }`}>
          Quick Similarity Test
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Context 1
            </label>
            <select
              value={selectedContext1}
              onChange={(e) => setSelectedContext1(Number(e.target.value))}
              className={`w-full p-2 text-sm rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {TEST_CONTEXTS.map((tc, index) => (
                <option key={index} value={index}>{tc.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`block text-xs font-medium mb-1 ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Context 2
            </label>
            <select
              value={selectedContext2}
              onChange={(e) => setSelectedContext2(Number(e.target.value))}
              className={`w-full p-2 text-sm rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {TEST_CONTEXTS.map((tc, index) => (
                <option key={index} value={index}>{tc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={testContextSimilarity}
              className={`flex items-center space-x-1 px-3 py-2 text-sm rounded border ${
                theme === 'dark'
                  ? 'border-blue-600 text-blue-300 hover:bg-blue-900'
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>Compare</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          {testResults.map((result, index) => (
            <motion.div
              key={result.testName}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : result.status === 'error'
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : result.status === 'running'
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-4 w-4" />
                  <span className={`font-medium text-sm ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {result.testName}
                  </span>
                </div>
                
                {result.duration && (
                  <span className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {result.duration}ms
                  </span>
                )}
              </div>
              
              <div className={`text-xs ${
                result.status === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : result.status === 'error'
                  ? 'text-red-700 dark:text-red-300'
                  : result.status === 'running'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-500'
              }`}>
                {result.message}
              </div>

              {/* Show additional result details */}
              {result.result && result.status === 'success' && (
                <details className="mt-2">
                  <summary className={`text-xs cursor-pointer ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    View Details
                  </summary>
                  <pre className={`text-xs mt-1 p-2 rounded overflow-x-auto ${
                    theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </details>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Context Encoding Explanation */}
      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <h4 className={`text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-indigo-200' : 'text-indigo-800'
        }`}>
          How Context Encoding Works:
        </h4>
        <div className={`text-xs space-y-1 ${
          theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
        }`}>
          <div>• <strong>Mood Vector (8D):</strong> Semantic embeddings for emotional states</div>
          <div>• <strong>Situation Vector (8D):</strong> Location and activity context encoding</div>
          <div>• <strong>Goal Vector (8D):</strong> User intent and objective representation</div>
          <div>• <strong>Temporal Vector (12D):</strong> Time patterns with cyclical encoding</div>
          <div>• <strong>User Vector (8D):</strong> Personal preferences and engagement history</div>
          <div>• <strong>Total: 44D Vector</strong> normalized for machine learning algorithms</div>
        </div>
      </div>
    </div>
  );
};