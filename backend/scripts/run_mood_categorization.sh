#!/bin/bash

# Mood Categorization Script Runner
# This script runs the LLM-powered book mood categorization

set -e  # Exit on error

echo "🚀 ChapterOne Book Mood Categorization"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f "../.env" ] && [ ! -f ".env" ]; then
    echo "❌ Error: No .env file found. Please ensure Supabase credentials are configured."
    exit 1
fi

# Check for required dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install > /dev/null 2>&1

echo "🔧 Building TypeScript..."
npm run build > /dev/null 2>&1 || {
    echo "⚠️  Build failed, trying to run with ts-node..."
}

# Function to run with different methods
run_script() {
    local method=$1
    echo "📊 Running mood categorization using: $method"
    
    case $method in
        "js")
            echo "🟢 Using JavaScript version (keyword-based analysis)..."
            node scripts/categorizeBooksWithMoods.js
            ;;
                 "ts")
             echo "🔵 Using TypeScript version (LLM-enhanced analysis)..."
             if command -v ts-node &> /dev/null; then
                 ts-node scripts/categorizeBooksWithLLM.ts
             else
                 echo "❌ ts-node not found. Installing..."
                 npm install -g ts-node
                 ts-node scripts/categorizeBooksWithLLM.ts
             fi
             ;;
         "comprehensive")
             echo "🌟 Using COMPREHENSIVE categorization (ALL filters)..."
             if command -v ts-node &> /dev/null; then
                 ts-node scripts/categorizeAllFilters.ts
             else
                 echo "❌ ts-node not found. Installing..."
                 npm install -g ts-node
                 ts-node scripts/categorizeAllFilters.ts
             fi
             ;;
        "compiled")
            echo "🟡 Using compiled version..."
            if [ -f "dist/scripts/categorizeBooksWithLLM.js" ]; then
                node dist/scripts/categorizeBooksWithLLM.js
            else
                echo "❌ Compiled version not found. Falling back to ts-node..."
                run_script "ts"
            fi
            ;;
        *)
            echo "❌ Unknown method: $method"
            exit 1
            ;;
    esac
}

# Parse command line arguments
METHOD="comprehensive"  # Default to comprehensive version
FORCE="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --method|-m)
            METHOD="$2"
            shift 2
            ;;
        --force|-f)
            FORCE="true"
            shift
            ;;
        --help|-h)
                         echo "Usage: $0 [OPTIONS]"
             echo ""
             echo "Options:"
             echo "  -m, --method <method>   Analysis method: 'js', 'ts', 'comprehensive', 'compiled'"
             echo "  -f, --force            Force run without confirmation"
             echo "  -h, --help             Show this help message"
             echo ""
             echo "Methods:"
             echo "  comprehensive - ALL filters: moods, themes, reading styles, professions (DEFAULT)"
             echo "  js           - Fast keyword-based analysis (moods only)"
             echo "  ts           - Enhanced LLM analysis (moods only)"
             echo "  compiled     - Use pre-compiled version"
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validation
if [[ ! "$METHOD" =~ ^(js|ts|comprehensive|compiled)$ ]]; then
    echo "❌ Invalid method: $METHOD. Use 'js', 'ts', 'comprehensive', or 'compiled'"
    exit 1
fi

# Show configuration
echo ""
echo "🔧 Configuration:"
echo "   Method: $METHOD"
if [ "$METHOD" = "comprehensive" ]; then
    echo "   Features: ALL filters (moods, themes, reading styles, professions)"
    echo "   Analysis: LLM primary + keyword fallback"
elif [ "$METHOD" = "ts" ]; then
    echo "   Features: Moods only - LLM analysis + keyword fallback"
elif [ "$METHOD" = "js" ]; then
    echo "   Features: Moods only - keyword-based analysis"
else
    echo "   Features: Compiled LLM analysis"
fi

# Check database connection (optional)
echo ""
echo "🔍 Checking database connectivity..."
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    echo "✅ Supabase credentials found"
else
    echo "⚠️  Supabase credentials not found in environment"
    echo "   Make sure your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY"
fi

# Confirmation prompt
if [ "$FORCE" != "true" ]; then
    echo ""
    if [ "$METHOD" = "comprehensive" ]; then
        echo "⚠️  This script will COMPREHENSIVELY analyze and update ALL books in your database."
        echo "   It will categorize books across ALL filter dimensions:"
        echo "   • Moods (tone field)"
        echo "   • Themes (themes field)"  
        echo "   • Reading Styles (pace field)"
        echo "   • Professions (professions field)"
    else
        echo "⚠️  This script will analyze and update ALL books in your database."
        echo "   It will add mood categories to the 'tone' field of each book."
    fi
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operation cancelled"
        exit 0
    fi
fi

echo ""
echo "🎯 Starting mood categorization..."
echo ""

# Record start time
START_TIME=$(date +%s)

# Run the categorization
if run_script "$METHOD"; then
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo "🎉 Mood categorization completed successfully!"
    echo "⏱️  Total time: ${DURATION} seconds"
    echo ""
    echo "✅ Your books now have mood-based categorizations!"
    echo "   Users can now search by mood in the UI."
else
    echo ""
    echo "❌ Mood categorization failed!"
    echo "   Check the error messages above for troubleshooting."
    exit 1
fi 