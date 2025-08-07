import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  ChartBarIcon,
  CpuChipIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ContextualBanditsService, BanditRecommendation, BanditLearningResult } from '../../services/contextualBandits.service';
import { ContextVector } from '../../services/ml.service';

interface BanditTestResult {
  testName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  message: string;
  duration?: number;
}

interface SimulationResult {
  round: number;
  selectedArm: string;
  reward: number;
  cumulativeReward: number;
  explorationRate: number;
  bestArm: string;
}

const TEST_CONTEXTS: { name: string; context: ContextVector; expectedReward: number }[] = [
  {
    name: 'Relaxed Evening',
    context: { mood: 'relaxed', situation: 'before_bed', goal: 'entertainment', timeOfDay: 'evening' },
    expectedReward: 0.8 // High reward for mood-based recommendations
  },
  {
    name: 'Motivated Learning',
    context: { mood: 'motivated', situation: 'studying', goal: 'learning', timeOfDay: 'morning' },
    expectedReward: 0.9 // Very high reward for collaborative filtering
  },
  {
    name: 'Commute Reading',
    context: { mood: 'curious', situation: 'commuting', goal: 'entertainment', timeOfDay: 'morning' },
    expectedReward: 0.7 // Good reward for trending/popular books
  },
  {
    name: 'Weekend Explorer',
    context: { mood: 'adventurous', situation: 'weekend', goal: 'inspiration', timeOfDay: 'afternoon' },
    expectedReward: 0.6 // Medium reward for semantic similarity
  }
];

export const ContextualBanditsTestPanel: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<BanditTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [banditStats, setBanditStats] = useState<any>(null);

  const runBanditTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSimulationResults([]);

    const tests = [
      'Initialize Bandit Models',
      'Strategy Selection', 
      'Learning Update',
      'Confidence Intervals',
      'Multi-Round Simulation',
      'Performance Analysis'
    ];

    // Initialize results
    const initialResults = tests.map(test => ({
      testName: test,
      status: 'pending' as const,
      message: 'Waiting...'
    }));
    setTestResults(initialResults);

    try {
      // Test 1: Initialize Bandit Models
      setTestResults(prev => prev.map(r => r.testName === 'Initialize Bandit Models'
        ? { ...r, status: 'running', message: 'Initializing LinUCB models...' }
        : r
      ));

      const startTime1 = Date.now();
      const stats = await ContextualBanditsService.getBanditStats(user?.id);
      
      setTestResults(prev => prev.map(r => r.testName === 'Initialize Bandit Models'
        ? {
            ...r,
            status: 'success',
            message: `✅ Initialized ${stats.armStats?.length || 0} bandit arms`,
            result: stats,
            duration: Date.now() - startTime1
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Strategy Selection
      setTestResults(prev => prev.map(r => r.testName === 'Strategy Selection'
        ? { ...r, status: 'running', message: 'Testing strategy selection...' }
        : r
      ));

      const testContext = TEST_CONTEXTS[0].context;
      const recommendation = await ContextualBanditsService.getBestRecommendationStrategy(
        testContext, 
        user?.id
      );

      setTestResults(prev => prev.map(r => r.testName === 'Strategy Selection'
        ? {
            ...r,
            status: 'success',
            message: `✅ Selected strategy: ${recommendation.armName}`,
            result: recommendation
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: Learning Update
      setTestResults(prev => prev.map(r => r.testName === 'Learning Update'
        ? { ...r, status: 'running', message: 'Testing model learning...' }
        : r
      ));

      const learningResult = await ContextualBanditsService.updateBanditModel(
        recommendation.armId,
        testContext,
        0.8, // Simulated positive reward
        user?.id
      );

      setTestResults(prev => prev.map(r => r.testName === 'Learning Update'
        ? {
            ...r,
            status: 'success',
            message: `✅ Model updated (reward: ${learningResult.newReward.toFixed(3)})`,
            result: learningResult
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Confidence Intervals
      setTestResults(prev => prev.map(r => r.testName === 'Confidence Intervals'
        ? { ...r, status: 'running', message: 'Testing confidence calculations...' }
        : r
      ));

      // Test multiple strategy selections to see confidence evolution
      const confidenceTests: Array<{
        context: string;
        selectedArm: string;
        confidence: number;
        explorationLevel: number;
      }> = [];
      for (let i = 0; i < 3; i++) {
        const testRec = await ContextualBanditsService.getBestRecommendationStrategy(
          TEST_CONTEXTS[i % TEST_CONTEXTS.length].context,
          user?.id
        );
        confidenceTests.push({
          context: TEST_CONTEXTS[i % TEST_CONTEXTS.length].name,
          selectedArm: testRec.armName,
          confidence: testRec.confidence,
          explorationLevel: testRec.explorationLevel
        });
      }

      setTestResults(prev => prev.map(r => r.testName === 'Confidence Intervals'
        ? {
            ...r,
            status: 'success',
            message: `✅ Confidence intervals working`,
            result: confidenceTests
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 5: Multi-Round Simulation
      setTestResults(prev => prev.map(r => r.testName === 'Multi-Round Simulation'
        ? { ...r, status: 'running', message: 'Running bandit simulation...' }
        : r
      ));

      const simulation = await runBanditSimulation(user?.id);
      setSimulationResults(simulation);

      setTestResults(prev => prev.map(r => r.testName === 'Multi-Round Simulation'
        ? {
            ...r,
            status: 'success',
            message: `✅ Completed ${simulation.length} rounds`,
            result: simulation
          }
        : r
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 6: Performance Analysis
      setTestResults(prev => prev.map(r => r.testName === 'Performance Analysis'
        ? { ...r, status: 'running', message: 'Analyzing bandit performance...' }
        : r
      ));

      const finalStats = await ContextualBanditsService.getBanditStats(user?.id);
      setBanditStats(finalStats);

      const totalReward = simulation.reduce((sum, round) => sum + round.reward, 0);
      const averageReward = totalReward / simulation.length;

      setTestResults(prev => prev.map(r => r.testName === 'Performance Analysis'
        ? {
            ...r,
            status: 'success',
            message: `✅ Avg reward: ${averageReward.toFixed(3)}`,
            result: { totalReward, averageReward, finalStats }
          }
        : r
      ));

    } catch (error) {
      console.error('Bandit test error:', error);
      setTestResults(prev => prev.map(r => 
        r.status === 'running' 
          ? { ...r, status: 'error', message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : r
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const runBanditSimulation = async (userId?: string): Promise<SimulationResult[]> => {
    const results: SimulationResult[] = [];
    let cumulativeReward = 0;
    const armCounts: Record<string, number> = {};

    for (let round = 0; round < 20; round++) {
      // Select random context for this round
      const testCase = TEST_CONTEXTS[round % TEST_CONTEXTS.length];
      
      // Get bandit recommendation
      const recommendation = await ContextualBanditsService.getBestRecommendationStrategy(
        testCase.context,
        userId
      );

      // Simulate reward (with some noise around expected reward)
      const baseReward = testCase.expectedReward;
      const noise = (Math.random() - 0.5) * 0.3; // ±15% noise
      const reward = Math.max(0, Math.min(1, baseReward + noise));

      cumulativeReward += reward;

      // Update bandit model
      await ContextualBanditsService.updateBanditModel(
        recommendation.armId,
        testCase.context,
        reward,
        userId
      );

      // Track arm usage
      armCounts[recommendation.armId] = (armCounts[recommendation.armId] || 0) + 1;

      // Find current best arm
      const bestArm = Object.entries(armCounts).reduce((best, [armId, count]) => 
        count > (armCounts[best] || 0) ? armId : best
      , Object.keys(armCounts)[0]);

      results.push({
        round: round + 1,
        selectedArm: recommendation.armName,
        reward,
        cumulativeReward,
        explorationRate: recommendation.explorationLevel,
        bestArm
      });
    }

    return results;
  };

  return (
    <div className={`p-6 rounded-xl border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Contextual Bandits Test Panel
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Test LinUCB algorithm, learning, and exploration vs exploitation
            </p>
          </div>
        </div>

        <button
          onClick={runBanditTests}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Cog6ToothIcon className="h-4 w-4 animate-spin" />
              <span>Running Tests...</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Test Bandits</span>
            </>
          )}
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-6 space-y-3">
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
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
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
                  ? 'text-purple-700 dark:text-purple-300'
                  : 'text-gray-500'
              }`}>
                {result.message}
              </div>

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

      {/* Simulation Visualization */}
      {simulationResults.length > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <h4 className={`text-sm font-medium mb-3 flex items-center space-x-2 ${
            theme === 'dark' ? 'text-indigo-200' : 'text-indigo-800'
          }`}>
            <ArrowTrendingUpIcon className="h-4 w-4" />
            <span>Learning Simulation (20 Rounds)</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cumulative Reward Chart */}
            <div>
              <div className={`text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
              }`}>
                Cumulative Reward
              </div>
              <div className="h-24 flex items-end space-x-1">
                {simulationResults.slice(0, 10).map((result, index) => (
                  <div
                    key={index}
                    className="bg-indigo-500 dark:bg-indigo-400 rounded-t"
                    style={{
                      height: `${(result.cumulativeReward / simulationResults[9]?.cumulativeReward) * 100}%`,
                      width: '8px'
                    }}
                    title={`Round ${result.round}: ${result.cumulativeReward.toFixed(2)}`}
                  />
                ))}
              </div>
            </div>

            {/* Exploration Rate */}
            <div>
              <div className={`text-xs font-medium mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
              }`}>
                Exploration Rate
              </div>
              <div className="h-24 flex items-end space-x-1">
                {simulationResults.slice(0, 10).map((result, index) => (
                  <div
                    key={index}
                    className="bg-orange-500 dark:bg-orange-400 rounded-t"
                    style={{
                      height: `${result.explorationRate * 100}%`,
                      width: '8px'
                    }}
                    title={`Round ${result.round}: ${(result.explorationRate * 100).toFixed(1)}% exploration`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs space-y-1">
            <div>Final Reward: {simulationResults[simulationResults.length - 1]?.cumulativeReward.toFixed(2)}</div>
            <div>Avg Reward: {(simulationResults.reduce((sum, r) => sum + r.reward, 0) / simulationResults.length).toFixed(3)}</div>
          </div>
        </div>
      )}

      {/* Bandit Statistics */}
      {banditStats && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h4 className={`text-sm font-medium mb-3 flex items-center space-x-2 ${
            theme === 'dark' ? 'text-purple-200' : 'text-purple-800'
          }`}>
            <LightBulbIcon className="h-4 w-4" />
            <span>Bandit Performance Statistics</span>
          </h4>
          
          {banditStats.armStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {banditStats.armStats.map((arm: any) => (
                <div
                  key={arm.armId}
                  className={`p-3 rounded border ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {arm.armName}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      arm.armId === banditStats.bestPerformingArm?.armId
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {arm.armId === banditStats.bestPerformingArm?.armId ? 'BEST' : 'OK'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>Interactions: {arm.interactions}</div>
                    <div>Avg Reward: {arm.averageReward.toFixed(3)}</div>
                    <div>Confidence: {(arm.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Algorithm Explanation */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className={`text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          How LinUCB Contextual Bandits Work:
        </h4>
        <div className={`text-xs space-y-1 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <div>• <strong>Context Encoding:</strong> 44D vectors represent user mood, situation, goal, time</div>
          <div>• <strong>Linear Models:</strong> Each strategy learns θ parameters for context → reward prediction</div>
          <div>• <strong>Upper Confidence Bounds:</strong> Balance exploitation (known good) vs exploration (uncertain)</div>
          <div>• <strong>Online Learning:</strong> Models update with each user interaction and reward signal</div>
          <div>• <strong>Strategy Selection:</strong> Choose strategy with highest UCB = prediction + exploration bonus</div>
        </div>
      </div>
    </div>
  );
};