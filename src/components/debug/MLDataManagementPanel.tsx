/**
 * ML Data Management Panel
 * 
 * Provides controls for resetting, exporting, and importing ML training data.
 * Essential for development and experimentation workflows.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { MLDataManagementService, MLTrainingData, MLResetResult, MLRestoreResult } from '../../services/mlDataManagement.service';

interface DataStats {
  total_interactions: number;
  total_preferences: number;
  total_impressions: number;
  total_actions: number;
  last_interaction_date: string | null;
  unique_users: number;
}

export const MLDataManagementPanel: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [stats, setStats] = useState<DataStats>({
    total_interactions: 0,
    total_preferences: 0,
    total_impressions: 0,
    total_actions: 0,
    last_interaction_date: null,
    unique_users: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastOperation, setLastOperation] = useState<{
    type: 'reset' | 'export' | 'restore';
    timestamp: string;
    success: boolean;
    details?: any;
  } | null>(null);

  // Check if user is admin
  const isAdmin = user?.email === 'abdullahsaghirahmad@gmail.com';

  // Load stats on mount
  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const currentStats = await MLDataManagementService.getTrainingDataStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Error loading ML data stats:', error);
    }
  };

  const handleExport = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const exportData = await MLDataManagementService.exportTrainingData();
      MLDataManagementService.downloadBackup(exportData);
      
      setLastOperation({
        type: 'export',
        timestamp: new Date().toISOString(),
        success: true,
        details: exportData.export_metadata
      });
      
      loadStats();
    } catch (error) {
      console.error('Export failed:', error);
      setLastOperation({
        type: 'export',
        timestamp: new Date().toISOString(),
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    setShowResetConfirm(false);
    
    try {
      const resetResult = await MLDataManagementService.resetTrainingData();
      
      setLastOperation({
        type: 'reset',
        timestamp: new Date().toISOString(),
        success: true,
        details: resetResult.deleted_counts
      });
      
      loadStats();
    } catch (error) {
      console.error('Reset failed:', error);
      setLastOperation({
        type: 'reset',
        timestamp: new Date().toISOString(),
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setShowRestoreConfirm(true);
    } else {
      alert('Please select a valid JSON backup file');
    }
  };

  const handleRestore = async () => {
    if (!isAdmin || !selectedFile) return;
    
    setIsLoading(true);
    setShowRestoreConfirm(false);
    
    try {
      const backupData = await MLDataManagementService.parseBackupFile(selectedFile);
      const restoreResult = await MLDataManagementService.restoreTrainingData(backupData);
      
      setLastOperation({
        type: 'restore',
        timestamp: new Date().toISOString(),
        success: true,
        details: restoreResult.imported_counts
      });
      
      loadStats();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setLastOperation({
        type: 'restore',
        timestamp: new Date().toISOString(),
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isAdmin) {
    return (
      <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>ML Data Management is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
      <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        🧹 ML Data Management
      </h3>

      {/* Current Data Stats */}
      <div className={`p-4 rounded-lg mb-6 ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Current Training Data
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Interactions
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.total_interactions.toLocaleString()}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Preferences
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.total_preferences.toLocaleString()}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Impressions
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.total_impressions.toLocaleString()}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Actions
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.total_actions.toLocaleString()}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Unique Users
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.unique_users.toLocaleString()}
            </span>
          </div>
          <div>
            <span className={`block font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Last Activity
            </span>
            <span className={`font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {formatDate(stats.last_interaction_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isLoading}
          className={`flex items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors ${
            isLoading
              ? 'opacity-50 cursor-not-allowed'
              : theme === 'dark'
              ? 'border-blue-400 text-blue-400 hover:bg-blue-400/10'
              : 'border-blue-500 text-blue-600 hover:bg-blue-50'
          }`}
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Export Backup
        </button>

        {/* Import Button */}
        <label className={`flex items-center justify-center p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          isLoading
            ? 'opacity-50 cursor-not-allowed'
            : theme === 'dark'
            ? 'border-green-400 text-green-400 hover:bg-green-400/10'
            : 'border-green-500 text-green-600 hover:bg-green-50'
        }`}>
          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
          Import Backup
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={isLoading}
            className="hidden"
          />
        </label>

        {/* Reset Button */}
        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={isLoading}
          className={`flex items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors ${
            isLoading
              ? 'opacity-50 cursor-not-allowed'
              : theme === 'dark'
              ? 'border-red-400 text-red-400 hover:bg-red-400/10'
              : 'border-red-500 text-red-600 hover:bg-red-50'
          }`}
        >
          <TrashIcon className="h-5 w-5 mr-2" />
          Reset All Data
        </button>
      </div>

      {/* Last Operation Status */}
      {lastOperation && (
        <div className={`p-4 rounded-lg mb-4 ${
          lastOperation.success
            ? (theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200')
            : (theme === 'dark' ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200')
        } border`}>
          <div className="flex items-start">
            {lastOperation.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                lastOperation.success
                  ? (theme === 'dark' ? 'text-green-300' : 'text-green-700')
                  : (theme === 'dark' ? 'text-red-300' : 'text-red-700')
              }`}>
                {lastOperation.type.charAt(0).toUpperCase() + lastOperation.type.slice(1)} {lastOperation.success ? 'Successful' : 'Failed'}
              </p>
              <p className={`text-sm ${
                lastOperation.success
                  ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
              }`}>
                {formatTimestamp(lastOperation.timestamp)}
              </p>
              {lastOperation.details && (
                <pre className={`text-xs mt-2 ${
                  lastOperation.success
                    ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                    : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                }`}>
                  {typeof lastOperation.details === 'string' 
                    ? lastOperation.details 
                    : JSON.stringify(lastOperation.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="flex items-center">
            <ClockIcon className={`h-5 w-5 animate-spin mr-3 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
            }`} />
            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Processing ML data operation...
            </span>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-xl max-w-md w-full mx-4 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 mt-1" />
              <div>
                <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Reset ML Training Data
                </h3>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  This will permanently delete all ML learning data.
                </p>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg mb-4 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                This will delete:
              </p>
              <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• {stats.total_interactions.toLocaleString()} recommendation interactions</li>
                <li>• {stats.total_preferences.toLocaleString()} user preferences</li>
                <li>• {stats.total_impressions.toLocaleString()} recommendation impressions</li>
                <li>• {stats.total_actions.toLocaleString()} user actions</li>
                <li>• All learned patterns and model weights</li>
                <li>• Performance analytics and metrics</li>
              </ul>
            </div>

            <div className={`p-3 rounded-lg mb-6 ${
              theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
            } border`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                <strong>This will NOT affect:</strong> Books, users, feature flags, or system configuration.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleExport();
                  setTimeout(() => {
                    if (!isLoading) handleReset();
                  }, 1000);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Export & Reset
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Reset Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-xl max-w-md w-full mx-4 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start mb-4">
              <DocumentTextIcon className="h-6 w-6 text-blue-500 mr-3 mt-1" />
              <div>
                <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Restore ML Training Data
                </h3>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  This will replace all current ML data with the backup.
                </p>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg mb-4 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Selected file:
              </p>
              <p className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedFile.name}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>

            <div className={`p-3 rounded-lg mb-6 ${
              theme === 'dark' ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'
            } border`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                <strong>Warning:</strong> Current training data will be deleted and replaced with the backup data.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Restore Data
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};