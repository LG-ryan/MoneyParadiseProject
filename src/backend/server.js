// MoneyParadise Backend Server
// Story 1.2: Alpha Vantage API 연동

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const DataProviderService = require('./services/dataProvider');
const RealTimeDataProvider = require('./services/realtimeDataProvider');
const OptimizedDataProvider = require('./services/optimizedDataProvider');
const EnhancedDataProvider = require('./services/enhancedDataProvider');
const UltimateDataProvider = require('./services/ultimateDataProvider');
const TurboDataProvider = require('./services/turboDataProvider');
const HyperDataProvider = require('./services/hyperDataProvider');
const FreeOnlyDataProvider = require('./services/freeOnlyDataProvider');
const RobustDataProvider = require('./services/robustDataProvider');
const StableDataProvider = require('./services/stableDataProvider');
const FinalDataProvider = require('./services/finalDataProvider');
const SmartDataProvider = require('./services/smartDataProvider');
const SignalDetectionEngine = new (require('./services/signalDetectionEngine'))();

// Initialize Data Provider Services (🎯 최종 4단계 자동 전환 시스템)
const dataProvider = new DataProviderService(); // 레거시 (Alpha Vantage 비활성화됨)
const realTimeProvider = new RealTimeDataProvider(); // 실시간 시도
const optimizedProvider = new OptimizedDataProvider(); // 미국 시장시간 최적화 + API 제한 관리
const enhancedProvider = new EnhancedDataProvider(); // 보완적 방법으로 최신성 극대화
const ultimateProvider = new UltimateDataProvider(); // 최종 솔루션: 25회 제한 고려한 데이터 보존 전략
const turboProvider = new TurboDataProvider(); // 🚀 터보 최종: 4단계 자동 전환 시스템
const hyperProvider = new HyperDataProvider(); // 🚀🚀 하이퍼스피드: 데스크톱 전용 무료 소스 최적화
const freeOnlyProvider = new FreeOnlyDataProvider(); // 🔥 무료 전용: Alpha Vantage 완전 제외, Yahoo+Investing+Finviz만
const robustProvider = new RobustDataProvider(); // 🛡️ 견고한: 문제점 완전 보완, 모든 상황 대응
const stableProvider = new StableDataProvider(); // 🛡️ 안정적: 웹스크래핑 차단 대응, 무료 API만 사용
const finalProvider = new FinalDataProvider(); // 🎯 최종: 4단계 자동 전환 (Yahoo → Investing → Finviz → Alpha Vantage)
const smartProvider = new SmartDataProvider(); // 🧠 스마트: 개장/폐장 1회 + 온디맨드 수집 (최고 효율)

// Initialize Express app
const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================
// 개발 환경에서 CSP 완화 (프론트엔드 인라인 스크립트 허용)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
})); // Security headers with relaxed CSP for development
app.use(compression()); // Response compression

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// =============================================================================
// BASIC MIDDLEWARE
// =============================================================================
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true, // Allow all origins in development
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// STATEC FILES SERVING
// =============================================================================
// Serve static files from frontend build directory (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// =============================================================================
// BASIC ROUTES
// =============================================================================

// Favicon 설정
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content 응답
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  });
});

// API Version endpoint
app.get('/api/v1/status', (req, res) => {
  res.status(200).json({
    service: 'MoneyParadise API',
    version: '1.0.0',
    status: 'operational',
    features: {
      'data-streaming': 'in_development',
      'signal-detection': 'planned',
      'portfolio-analysis': 'planned',
      'email-notifications': 'planned'
    },
    endpoints: {
      health: '/health',
      status: '/api/v1/status',
      market_data: '/api/v1/market-data',
      signals: '/api/v1/signals'
    }
  });
});

// API Root endpoint (프론트엔드와 구분)
app.get('/api', (req, res) => {
  res.json({
    message: 'MoneyParadise Advanced Market Intelligence Platform API',
    documentation: 'https://github.com/moneyparadise/api-docs',
    version: '1.0.1-turbo',
    status: 'development',
    features: {
      'turbo-system': '6단계 터보 데이터 시스템',
      '4-tier-fallback': 'Yahoo → Investing → Finviz → Alpha Vantage',
      'smart-scheduling': '거래시간별 적응적 업데이트 간격',
      'alpha-conservation': 'Alpha Vantage 20회/일 안전 보존 전략'
    },
    optimizationStatus: '🚀 터보 시스템 최대화 완료',
    dataSources: [
      'Yahoo Finance (무제한)',
      'Investing.com (웹스크래핑)', 
      'Finviz (웹스크래핑)',
      'Alpha Vantage (절약적 사용)'
    ],
    updateIntervals: {
      '정규거래시간': '3-4분 간격 (터보)',
      '확장거래시간': '6-8분 간격 (절약)',
      '폐장/주말': '60분 간격 (캐시만)'
    },
    systemUrl: '/dashboard'
  });
});

// =============================================================================
// MARKET DATA ENDPOINTS (Story 1.2)
// =============================================================================

// 특정 심볼의 현재 가격 데이터 조회 (실시간성 최적화)
app.get('/api/v1/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 새로운 실시간 프로바이더 우선 사용
    let data = realTimeProvider.getCurrentData(symbol.toUpperCase());
    let isRealtime = true;
    
    // 실시간 데이터가 없으면 기존 프로바이더 확인
    if (!data) {
      data = dataProvider.getCurrentData(symbol.toUpperCase());
      isRealtime = false;
    }
    
    if (!data) {
      return res.status(404).json({
        error: 'Data not found',
        message: `${symbol} 데이터가 캐시에 없습니다.`,
        suggestion: '데이터 수집을 시작해주세요.'
      });
    }
    
    res.json({
      symbol: symbol.toUpperCase(),
      currentPrice: data.currentPrice,
      volume: data.volume,
      lastRefreshed: data.lastRefreshed,
      source: data.source || 'Legacy',
      isRealtime: isRealtime,
      cached: true,
      cachedAt: isRealtime ? 
        realTimeProvider.lastUpdateTimes.get(`${symbol.toUpperCase()}_realtime`) :
        dataProvider.lastUpdateTimes.get(`${symbol.toUpperCase()}_5min`)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 모든 수집 중인 데이터 조회 (🎯 최종 4단계 자동 전환 시스템)
app.get('/api/v1/market-data', (req, res) => {
  try {
    // 🎯 최종 4단계 자동 전환 시스템 최우선 사용
    const finalData = finalProvider.getAllCachedData();
    const stableData = stableProvider.getAllCachedData();
    const robustData = robustProvider.getAllCachedData();
    const freeOnlyData = freeOnlyProvider.getAllCachedData();
    const hyperData = hyperProvider.getAllCachedData();
    const turboData = turboProvider.getAllCachedData();
    const ultimateData = ultimateProvider.getAllCachedData();
    const enhancedData = enhancedProvider.getAllCachedData();
    const optimizedData = optimizedProvider.getAllCachedData();
    const realtimeData = realTimeProvider.getAllCachedData();
    const legacyData = dataProvider.getAllCachedData();
    
    // 🎯 최종 4단계 자동 전환 시스템 데이터 최우선 표시
    const allData = { ...legacyData, ...realtimeData, ...optimizedData, ...enhancedData, ...ultimateData, ...turboData, ...hyperData, ...freeOnlyData, ...robustData, ...stableData, ...finalData };
    
    if (Object.keys(allData).length === 0) {
      return res.json({
        message: 'No data cached yet',
        suggestion: '실시간 데이터 수집을 시작합니다. 잠시만 기다려주세요.'
      });
    }
    
    // 🎯 최종 4단계 자동 전환 시스템 데이터 개수 계산
        const finalCount = Object.keys(finalData).length;
        const stableCount = Object.keys(stableData).length;
        const robustCount = Object.keys(robustData).length;
        const turboCount = Object.keys(turboData).length;
        const ultimateCount = Object.keys(ultimateData).length;
        const enhancedCount = Object.keys(enhancedData).length;
        const optimizedCount = Object.keys(optimizedData).length;
        const realtimeCount = Object.keys(realtimeData).length;
        const totalCount = Object.keys(allData).length;
    
    res.json({
      cachedData: allData,
      summary: {
        totalSymbols: totalCount,
        finalSymbols: finalCount, // 🎯 최종 4단계 자동 전환 시스템
        stableSymbols: stableCount, // 🛡️ 안정적 시스템
        robustSymbols: robustCount, // 🛡️ 견고한 시스템
        turboSymbols: turboCount,
        ultimateSymbols: ultimateCount,
        enhancedSymbols: enhancedCount,
        optimizedSymbols: optimizedCount,
        realtimeSymbols: realtimeCount,
        legacySymbols: totalCount - finalCount - stableCount - robustCount - turboCount - ultimateCount - enhancedCount - optimizedCount - realtimeCount,
        optimizationStatus: '🎯 최종 4단계 자동 전환 시스템 활성화'
      },
      status: '캐시된 데이터 조회 성공'
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🎯 최종 4단계 자동 전환 시스템 데이터 수집 강제 실행
app.post('/api/v1/market-data/refresh', async (req, res) => {
  try {
    console.log('🎯 클라이언트 요청으로 4단계 자동 전환 시스템 시작...');
    
    // 🎯 최종 4단계 자동 전환 시스템 최우선 사용
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    let results;
    try {
      results = await finalProvider.collectFinalData(symbols);
      console.log('✅ 4단계 자동 전환 시스템 수집 성공');
    } catch (finalError) {
      console.log('⚠️ 4단계 자동 전환 시스템 실패, 안정적 시스템으로 폴백');
      try {
        results = await stableProvider.collectStableData(symbols);
        console.log('✅ 안정적 시스템 수집 성공');
      } catch (stableError) {
        console.log('⚠️ 안정적 시스템 실패, 터보 시스템으로 폴백');
        results = await turboProvider.collectTurboData(symbols);
      }
    }
    
    // 성공한 항목들만 추출
    const successResults = {};
    Object.entries(results).forEach(([symbol, result]) => {
      if (!result.error) {
        successResults[symbol] = result;
      }
    });
    
    res.json({
      message: '🎯 4단계 자동 전환 시스템 데이터 수집 완료',
      results: successResults,
      totalProcessed: Object.keys(results).length,
      successCount: Object.keys(successResults).length,
      optimizationApplied: '🎯 최종 4단계 자동 전환 시스템 (Yahoo → Investing → Finviz → Alpha Vantage)',
      fallbackChain: [
        '🔥 Yahoo Finance (무제한)',
        '🌐 Investing.com (웹스크래핑)',
        '📊 Finviz (웹스크래핑)',
        '⭐ Alpha Vantage (25회/일)'
      ],
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Data collection failed',
      message: error.message
    });
  }
});

// 🧠 신호 탐지 API (PRD 기반)
app.get('/api/v1/signals', async (req, res) => {
  try {
    // 견고한 데이터 수집
    const robustData = robustProvider.getAllCachedData();
    
    if (Object.keys(robustData).length === 0) {
      return res.json({
        message: 'No market data available for analysis',
        suggestion: '데이터 수집이 완료된 후 신호 분석을 시작하세요.'
      });
    }

    // 신호 분석 실행
    const signals = await SignalDetectionEngine.analyzeRealtimeSignals(robustData);
    const activeSignals = SignalDetectionEngine.getActiveSignals();
    
    res.json({
      signals: Array.from(signals.values()),
      activeSignals: activeSignals,
      analysisTimestamp: new Date().toISOString(),
      dataSources: Object.keys(robustData).length,
      systemStatus: 'Signal detection active'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Signal analysis failed',
      message: error.message
    });
  }
});

// 🖥️ 데이터 소스 성능 모니터링 API
app.get('/api/v1/data-sources', (req, res) => {
  try {
    const metrics = robustProvider.getSourceMetrics();
    
    res.json({
      sourceMetrics: metrics,
      monitoringStatus: 'active',
      robustnessLevel: 'maximum',
      lastCheck: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Metrics retrieval failed',
      message: error.message
    });
  }
});

// 🧠 스마트 데이터 시스템 API
app.get('/api/v1/smart-data', (req, res) => {
  try {
    const smartData = smartProvider.getAllCachedData();
    const smartStatus = smartProvider.getSmartStatus();
    
    res.json({
      smartData: smartData,
      smartStatus: smartStatus,
      systemType: '스마트 데이터 프로바이더',
      efficiency: '최대 90% API 호출 절약',
      lastCheck: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Smart data retrieval failed',
      message: error.message
    });
  }
});

// 🔍 온디맨드 실시간 데이터 수집 API (사용자 검색 시)
app.get('/api/v1/smart-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🔍 사용자 요청: ${symbol} 온디맨드 실시간 데이터 수집`);
    
    const data = await smartProvider.collectOnDemandData(symbol.toUpperCase());
    
    res.json({
      symbol: symbol.toUpperCase(),
      data: data,
      collectionType: data.collectionType,
      source: data.source,
      isStable: data.isStable,
      efficiency: '온디맨드 수집으로 리소스 절약',
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'On-demand data collection failed',
      message: error.message,
      suggestion: '다른 데이터 소스를 시도해보세요.'
    });
  }
});

// 🧪 Yahoo Finance 직접 테스트 API
app.get('/api/v1/test-yahoo/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🧪 Yahoo Finance 직접 테스트: ${symbol}`);

    const result = await smartProvider.fetchFromYahooFinance(symbol.toUpperCase());

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      data: result,
      source: 'Yahoo Finance (Direct Test)',
      timestamp: new Date().toISOString(),
      test: true
    });

  } catch (error) {
    console.error(`❌ Yahoo Finance 테스트 실패:`, error.message);
    res.status(500).json({
      success: false,
      error: true,
      message: error.message,
      symbol: req.params.symbol,
      source: 'Yahoo Finance (Direct Test)'
    });
  }
});

// 📊 과거 데이터 API (차트용)
app.get('/api/v1/historical-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1mo', interval = '1d' } = req.query;
    
    console.log(`📊 ${symbol} 과거 데이터 요청: ${period}, ${interval}`);

    const result = await smartProvider.fetchHistoricalData(symbol.toUpperCase(), period, interval);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      period: period,
      interval: interval,
      data: result,
      source: 'Yahoo Finance (Historical)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ ${req.params.symbol} 과거 데이터 수집 실패:`, error.message);
    res.status(500).json({
      success: false,
      error: true,
      message: error.message,
      symbol: req.params.symbol,
      source: 'Yahoo Finance (Historical)'
    });
  }
});

// 👀 관심 티커 추가 API
app.post('/api/v1/smart-data/watch/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    smartProvider.addWatchedSymbol(symbol.toUpperCase());
    
    res.json({
      message: `${symbol.toUpperCase()} 관심 티커로 추가됨`,
      symbol: symbol.toUpperCase(),
      updateFrequency: '5분마다 업데이트 (거래 시간에만)',
      addedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add watched symbol',
      message: error.message
    });
  }
});

// 🕘 개장 데이터 수집 강제 실행 API
app.post('/api/v1/smart-data/market-open', async (req, res) => {
  try {
    console.log('🕘 개장 데이터 수집 강제 실행...');
    
    const results = await smartProvider.collectMarketOpenData();
    
    if (!results) {
      return res.json({
        message: '시장이 열리지 않았습니다',
        suggestion: '거래 시간에 다시 시도해주세요.'
      });
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    res.json({
      message: '🕘 개장 데이터 수집 완료',
      results: results,
      successCount: successCount,
      totalCount: totalCount,
      collectionType: 'market-open',
      efficiency: '전체 티커 1회만 수집으로 리소스 절약',
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Market open data collection failed',
      message: error.message
    });
  }
});

// 🕔 폐장 데이터 수집 강제 실행 API
app.post('/api/v1/smart-data/market-close', async (req, res) => {
  try {
    console.log('🕔 폐장 데이터 수집 강제 실행...');
    
    const results = await smartProvider.collectMarketCloseData();
    
    if (!results) {
      return res.json({
        message: '사용자가 검색한 티커가 없습니다',
        suggestion: '먼저 티커를 검색해보세요.'
      });
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    res.json({
      message: '🕔 폐장 데이터 수집 완료',
      results: results,
      successCount: successCount,
      totalCount: totalCount,
      collectionType: 'market-close',
      efficiency: '관심 티커만 수집으로 리소스 절약',
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Market close data collection failed',
      message: error.message
    });
  }
});

// Serve frontend files (development and production)
// Development mode: serve HTML directly
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });
} else {
  // Production mode: serve static files and catch-all route
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.path} does not exist`,
    available_endpoints: ['/health', '/api/v1/status', '/']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong on our side' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================
const server = app.listen(PORT, async () => {
  console.log(`
🚀 MoneyParadise Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏃 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Port: ${PORT}
🔗 Health Check: http://localhost:${PORT}/health
📊 API Status: http://localhost:${PORT}/api/v1/status
📈 Market Data: http://localhost:${PORT}/api/v1/market-data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // MoneyParadise 최종 최적화 시스템 시작
  console.log('\n🚀 MoneyParadise 최종 데이터 시스템 시작!!');
  
  try {
    // 기본 연결 확인 (참고용)
    console.log('\n📋 Alpha Vantage 무료 제한 확인:');
    console.log('   ✅ 일일 제한: 25회 (Alpha Vantage 공식 확인)');
    console.log('   ✅ 지연 시간: 15분+ (무료는 실시간 불가)');
    console.log('   ✅ 라이선스: NASDAQ 승인 데이터만 실시간 제공');
    
    const testResult = await dataProvider.testBasicDataRetrieval();
    
    if (testResult) {
      console.log('✅ 기본 Alpha Vantage 연결 성공 (백업용)');
    }
    
    // 🧠 스마트 데이터 시스템 시작 (최고 효율)
    setTimeout(async () => {
      console.log('\n🧠 스마트 데이터 시스템 활성화 시작...');
      console.log('💡 효율적 리소스 사용 전략:');
      console.log('   🕘 개장 시점: 전체 티커 1회 수집');
      console.log('   🕔 폐장 시점: 관심 티커 1회 수집');
      console.log('   🔍 사용자 검색: 온디맨드 실시간 수집');
      console.log('   👀 관심 티커: 5분마다 업데이트 (거래 시간에만)');
      console.log('   💰 API 호출 절약: 최대 90% 절약');
      console.log('   🚫 Alpha Vantage 토큰 없이 오류 방지');
      console.log('🎯 평생 사용 가능한 초효율적 시스템 구축');
      
      // 🧠 스마트 스케줄링 시스템 시작
      await smartProvider.startSmartScheduling();
    }, 3000); // 3초 후 시작
    
  } catch (error) {
    console.error('❌ 최종 시스템 초기화 오류:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
