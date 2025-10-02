// 무료이지만 최신에 가까운 데이터를 위한 보완적 방법들
// 다중 소스 조합 + 배치 처리 + 지능적 캐싱 + 예측 업데이트

const axios = require('axios');

class EnhancedDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.priceHistory = new Map(); // 가격 변화 추적으로 빠른 업데이트 예측
    this.volatilityIndex = new Map(); // 변동성 기반 업데이트 주기 조정
    
    this.updateInterval = null;
    
    // 다중 무료 데이터 소스
    this.dataSources = {
      yahooFinance: {
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        reliability: 0.9,
        delay: '5-15분',
        free: true
      },
      finviz: {
        baseUrl: 'https://finviz.com/quote.ashx',
        reliability: 0.7,
        delay: '1-5분',
        free: true,
        scraping: true
      },
      investing: {
        baseUrl: 'https://www.investing.com',
        reliability: 0.8,
        delay: '3-10분',
        free: true,
        scraping: true
      },
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: 'YCN5UGRTXB1ZF74P',
        reliability: 0.9,
        delay: '5-20분',
        free: true,
        limited: true
      }
    };

    // 심볼별 우선순위 전략
    this.symbolStrategies = new Map();
    this.setupSymbolStrategies();
  }

  // 심볼별 최적 전략 설정
  setupSymbolStrategies() {
    const strategies = {
      // 고변동성 주식 - 더 자주 체크 (대형주지만 변동성 높음)
      'TSLA': { 
        updateFrequency: 'fast',
        volatilityThreshold: 0.5,
        primarySource: 'yahooFinance',
        backupSources: ['investing', 'alphaVantage']
      },
      
      // 안정 주식 - 덜 자주 체크 (변동성 낮음)
      'AAPL': { 
        updateFrequency: 'normal',
        volatilityThreshold: 0.3,
        primarySource: 'yahooFinance',
        backupSources: ['alphaVantage']
      },
      
      'MSFT': { 
        updateFrequency: 'normal',
        volatilityThreshold: 0.35,
        primarySource: 'yahooFinance',
        backupSources: ['alphaVantage']
      },
      
      // 테크 주식들 - 중간 빈도
      'NVDA': { 
        updateFrequency: 'normal-fast',
        volatilityThreshold: 0.4,
        primarySource: 'yahooFinance',
        backupSources: ['investing', 'alphaVantage']
      },
      
      'GOOGL': { 
        updateFrequency: 'normal-fast',
        volatilityThreshold: 0.38,
        primarySource: 'yahooFinance',
        backupSources: ['alphaVantage']
      },
      
      'AMZN': { 
        updateFrequency: 'normal',
        volatilityThreshold: 0.36,
        primarySource: 'yahooFinance',
        backupSources: ['alphaVantage']
      },
      
      'META': { 
        updateFrequency: 'fast',
        volatilityThreshold: 0.45,
        primarySource: 'yahooFinance',
        backupSources: ['investing', 'finviz']
      },
      
      'AMD': { 
        updateFrequency: 'fast',
        volatilityThreshold: 0.48,
        primarySource: 'yahooFinance',
        backupSources: ['investing', 'alphaVantage']
      }
    };

    Object.entries(strategies).forEach(([symbol, strategy]) => {
      this.symbolStrategies.set(symbol, strategy);
    });
  }

  // 미국 시장 시간 기준 동적 전략
  getMarketAdaptedStrategy(symbol) {
    const marketTime = this.getUSMarketTime();
    const baseStrategy = this.symbolStrategies.get(symbol);
    
    if (!baseStrategy) return baseStrategy;

    // 거래시간에 따라 전략 조정
    if (marketTime.isRegularHours) {
      return {
        ...baseStrategy,
        updateFrequency: 'fast', // 정규시간은 모든 심볼 빠르게
        checkInterval: 30000, // 30초
        priority: 'high'
      };
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      return {
        ...baseStrategy,
        updateFrequency: baseStrategy.updateFrequency === 'fast' ? 'normal-fast' : 'normal',
        checkInterval: 120000, // 2분
        priority: 'medium'
      };
    } else {
      return {
        ...baseStrategy,
        updateFrequency: 'slow',
        checkInterval: 600000, // 10분
        priority: 'low'
      };
    }
  }

  // 가격 변화 추적 시스템
  trackPriceMovement(symbol, currentPrice) {
    const historyKey = `${symbol}_price_history`;
    const currentTime = Date.now();
    
    if (!this.priceHistory.has(historyKey)) {
      this.priceHistory.set(historyKey, []);
    }
    
    const history = this.priceHistory.get(historyKey);
    
    // 최근 5개 데이터 포인트 유지
    history.push({ price: currentPrice, timestamp: currentTime });
    if (history.length > 5) {
      history.shift();
    }
    
    // 변동성 계산
    if (history.length >= 3) {
      const prices = history.map(h => h.price);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
      const volatility = Math.sqrt(variance) / avgPrice;
      
      this.volatilityIndex.set(symbol, volatility);
      
      // 변동성이 높으면 더 자주 업데이트 필요
      const strategy = this.getMarketAdaptedStrategy(symbol);
      if (volatility > strategy.volatilityThreshold) {
        console.log(`📈 ${symbol} 고변동성 감지 (${Math.round(volatility*100)}%) - 빠른 업데이트 활성화`);
        return true; // 더 빠른 업데이트 필요
      }
    }
    
    return false;
  }

  // 우회 업데이트 예측 시스템
  predictUpdateNeed(symbol) {
    const strategy = this.getMarketAdaptedStrategy(symbol);
    const volatility = this.volatilityIndex.get(symbol) || 0;
    const lastUpdate = this.lastUpdateTimes.get(symbol);
    const now = Date.now();
    
    if (!lastUpdate) return true;
    
    const timeSinceUpdate = now - lastUpdate;
    let suggestedInterval = strategy.checkInterval;
    
    // 변동성에 따른 동적 조정
    if (volatility > 0.5) {
      suggestedInterval *= 0.5; // 고변동성시 2배 빨리
    } else if (volatility > 0.3) {
      suggestedInterval *= 0.7; // 중변동성시 1.4배 빨리
    }
    
    return timeSinceUpdate > suggestedInterval;
  }

  // 배치 최적화 수집
  async collectBatchOptimized(symbols) {
    const now = Date.now();
    const marketTime = this.getUSMarketTime();
    
    console.log(`\n🎯 스마트 배치 수집 시작 (${marketTime.hour}:${marketTime.minute} EST)`);
    
    // 1. 업데이트 우선순위 계산
    const updateQueue = [];
    
    symbols.forEach(symbol => {
      const needUpdate = this.predictUpdateNeed(symbol);
      const strategy = this.getMarketAdaptedStrategy(symbol);
      const volatility = this.volatilityIndex.get(symbol) || 0;
      
      if (needUpdate) {
        const priority = this.calculatePriority(symbol, strategy, volatility, marketTime);
        updateQueue.push({
          symbol,
          priority,
          strategy,
          volatility
        });
      }
    });
    
    // 우선순위 순으로 정렬
    updateQueue.sort((a, b) => b.priority - a.priority);
    
    console.log(`📊 업데이트 큐: ${updateQueue.length}/${symbols.length} 심볼 업데이트 필요`);
    
    // 2. 배치 단위로 처리 (API 부하 분산)
    const batchSize = marketTime.isRegularHours ? 3 : 2;
    const results = {};
    
    for (let i = 0; i < updateQueue.length; i += batchSize) {
      const batch = updateQueue.slice(i, i + batchSize);
      
      console.log(`⏱️ 배치 ${Math.floor(i/batchSize)+1}/${Math.ceil(updateQueue.length/batchSize)} 처리 중...`);
      
      const batchResults = await this.processBatch(batch);
      Object.assign(results, batchResults);
      
      // 배치 간 대기 (API 제한 고려)
      if (i + batchSize < updateQueue.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    return results;
  }

  // 배치 처리
  async processBatch(batch) {
    const promises = batch.map(async (item) => {
      try {
        const data = await this.getEnhancedDataForSymbol(item.symbol, item.strategy);
        return { symbol: item.symbol, data, success: true };
      } catch (error) {
        return { symbol: item.symbol, error: error.message, success: false };
      }
    });

    const results = await Promise.all(promises);
    
    const processedResults = {};
    results.forEach(result => {
      if (result.success) {
        processedResults[result.symbol] = result.data;
        
        // 가격 추적 업데이트
        this.trackPriceMovement(result.symbol, result.data.currentPrice);
      } else {
        processedResults[result.symbol] = { error: result.error };
      }
    });

    return processedResults;
  }

  // 심볼별 향상된 데이터 수집
  async getEnhancedDataForSymbol(symbol, strategy) {
    const primarySource = strategy.primarySource;
    const backupSources = strategy.backupSources;
    
    // 캐시 확인
    const cached = this.dataCache.get(symbol);
    if (cached && this.isCacheFresh(symbol, strategy)) {
      return { ...cached, cached: true, source: 'cache' };
    }
    
    // 주 데이터 소스 시도
    try {
      const data = await this.fetchFromSource(symbol, primarySource);
      console.log(`✅ ${symbol}: ${primarySource} 성공 - $${data.currentPrice}`);
      
      // 캐시 업데이트
      this.updateCache(symbol, data);
      
      return data;
      
    } catch (primaryError) {
      console.log(`⚠️ ${symbol}: ${primarySource} 실패, 백업 소스 시도`);
      
      // 백업 소스들 순차 시도
      for (const backupSource of backupSources) {
        try {
          const data = await this.fetchFromSource(symbol, backupSource);
          console.log(`✅ ${symbol}: ${backupSource} 백업 성공 - $${data.currentPrice}`);
          
          this.updateCache(symbol, data);
          
          return data;
          
        } catch (backupError) {
          console.log(`❌ ${symbol}: ${backupSource} 백업도 실패`);
        }
      }
      
      throw new Error(`모든 데이터 소스 실패: ${symbol}`);
    }
  }

  // 캐시 신선도 확인
  isCacheFresh(symbol, strategy) {
    const lastUpdate = this.lastUpdateTimes.get(symbol);
    if (!lastUpdate) return false;
    
    const now = Date.now();
    const timeSinceUpdate = now - lastUpdate;
    
    // 주 전략에 따른 신선도 기준
    const freshnessThreshold = {
      'fast': 45000,      // 45초
      'normal-fast': 90000,  // 90초
      'normal': 120000,     // 2분
      'slow': 300000        // 5분
    };
    
    return timeSinceUpdate < freshnessThreshold[strategy.updateFrequency];
  }

  // 캐시 업데이트
  updateCache(symbol, data) {
    this.dataCache.set(symbol, data);
    this.lastUpdateTimes.set(symbol, Date.now());
  }

  // 소스별 데이터 페칭
  async fetchFromSource(symbol, sourceName) {
    const source = this.dataSources[sourceName];
    
    if (!source) {
      throw new Error(`알 수 없는 데이터 소스: ${sourceName}`);
    }
    
    switch (sourceName) {
      case 'yahooFinance':
        return await this.fetchFromYahooFinance(symbol);
      case 'alphaVantage':
        return await this.fetchFromAlphaVantage(symbol);
      case 'investing':
        return await this.fetchFromInvesting(symbol);
      case 'finviz':
        return await this.fetchFromFinviz(symbol);
      default:
        throw new Error(`구현되지 않은 소스: ${sourceName}`);
    }
  }

  // Yahoo Finance 데이터 페칭 (향상된 버전)
  async fetchFromYahooFinance(symbol) {
    const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
    const params = {
      range: '1d',
      interval: '1m',
      includePrePost: 'true',
      events: 'div,splits'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data.chart.result || response.data.chart.result.length === 0) {
      throw new Error('Yahoo Finance 응답 데이터 없음');
    }

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    // 최신 가격 찾기
    let latestIndex = quotes.close.length - 1;
    while (latestIndex >= 0 && quotes.close[latestIndex] === null) {
      latestIndex--;
    }

    if (latestIndex < 0) {
      throw new Error('유효한 가격 데이터 없음');
    }

    const latestTimestamp = timestamps[latestIndex];
    const lastRefresh = new Date(latestTimestamp * 1000);
    
    return {
      symbol: symbol,
      currentPrice: quotes.close[latestIndex],
      open: quotes.open[latestIndex],
      high: quotes.high[latestIndex],
      low: quotes.low[latestIndex],
      volume: quotes.volume[latestIndex],
      change: quotes.close[latestIndex] - quotes.open[latestIndex],
      changePercent: ((quotes.close[latestIndex] - quotes.open[latestIndex]) / quotes.open[latestIndex]) * 100,
      lastRefreshed: lastRefresh.toISOString(),
      source: 'Yahoo Finance Enhanced',
      timestamp: Date.now(),
      delay: lastRefresh.toISOString()
    };
  }

  // Alpha Vantage 데이터 페칭 (제한된 사용)
  async fetchFromAlphaVantage(symbol) {
    // 일일 제한 고려하여 신중하게 사용
    const params = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol,
      interval: '5min',
      apikey: this.dataSources.alphaVantage.apiKey,
      outputsize: 'compact'
    };

    const response = await axios.get(this.dataSources.alphaVantage.baseUrl, { 
      params,
     timeout: 8000
    });
    
    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const timeSeriesData = response.data['Time Series (5min)'];
    if (!timeSeriesData) {
      throw new Error('Alpha Vantage 시간 시리즈 데이터 없음');
    }

    const latestTimeKey = Object.keys(timeSeriesData)[0];
    const latestData = timeSeriesData[latestTimeKey];

    return {
      symbol: symbol,
      currentPrice: parseFloat(latestData['4. close']),
      open: parseFloat(latestData['1. open']),
      high: parseFloat(latestData['2. high']),
      low: parseFloat(latestData['3. low']),
      volume: parseFloat(latestData['5. volume']),
      change: parseFloat(latestData['4. close']) - parseFloat(latestData['1. open']),
      changePercent: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['1. open'])) * 100,
      lastRefreshed: latestTimeKey,
      source: 'Alpha Vantage',
      timestamp: Date.now()
    };
  }

  // Investing.com 스크래핑 (보완적 방법)
  async fetchFromInvesting(symbol) {
    try {
      // 헤더를 포함하여 스크래핑 차단 방지
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      const response = await axios.get(`https://www.investing.com/search/?q=${symbol}`, {
        headers,
        timeout: 10000
      });

      // 간단한 가격 추출 (실제로는 더 복잡한 파싱 필요)
      // 이는 예시이며 실제 구현에서는 정확한 선택자가 필요
      const priceMatch = response.data.match(/\$(\d+\.?\d*)/);
      
      if (priceMatch) {
        return {
          symbol: symbol,
          currentPrice: parseFloat(priceMatch[1]),
          source: 'Investing.com (Scraped)',
          lastRefreshed: new Date().toISOString(),
          timestamp: Date.now(),
          note: 'Scraped data - less reliable'
        };
      }
      
      throw new Error('Investing.com에서 가격 정보 추출 실패');
      
    } catch (error) {
      throw new Error(`Investing.com 스크래핑 실패: ${error.message}`);
    }
  }

  // Finviz 스크래핑 (보완적 방법)
  async fetchFromFinviz(symbol) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const response = await axios.get(`https://finviz.com/quote.ashx?t=${symbol}`, {
        headers,
        timeout: 8000
      });

      // 간단한 가격 정보 추출
      const priceRegex = /\$(\d+\.?\d*)/;
      const priceMatch = response.data.match(priceRegex);
      
      if (priceMatch) {
        return {
          symbol: symbol,
          currentPrice: parseFloat(priceMatch[1]),
          source: 'Finviz (Scraped)',
          lastRefreshed: new Date().toISOString(),
          timestamp: Date.now(),
          note: 'Scraped data - quick backup'
        };
      }
      
      throw new Error('Finviz에서 가격 정보 추출 실패');
      
    } catch (error) {
      throw new Error(`Finviz 스크래핑 실패: ${error.message}`);
    }
  }

  // 우선순위 계산
  calculatePriority(symbol, strategy, volatility, marketTime) {
    let priority = 0;
    
    // 기본 우선순위
    priority += strategy.priority === 'high' ? 100 : strategy.priority === 'medium' ? 50 : 10;
    
    // 변동성 보너스
    priority += Math.round(volatility * 50);
    
    // 거래시간 보너스
    if (marketTime.isRegularHours) {
      priority += 30;
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      priority += 10;
    }
    
    // 시간 경과 패널티
    const timeSinceUpdate = Date.now() - (this.lastUpdateTimes.get(symbol) || 0);
    const expectedInterval = strategy.checkInterval;
    priority += Math.min(20, timeSinceUpdate / expectedInterval * 10);
    
    return priority;
  }

  // 미국 시장 시간 함수 (기존과 동일)
  getUSMarketTime() {
    const now = new Date();
    const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    return {
      datetime: usTime,
      day: usTime.getDay(),
      hour: usTime.getHours(),
      minute: usTime.getMinutes(),
      isTradingDay: usTime.getDay() >= 1 && usTime.getDay() <= 5,
      isPreMarket: usTime.getHours() >= 4 && usTime.getHours() < 9,
      isRegularHours: usTime.getHours() >= 9 && usTime.getHours() <= 16,
      isAfterMarket: usTime.getHours() >= 16 && usTime.getHours() < 20,
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20
    };
  }

  // 시작 함수
  async startEnhancedCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🚀 향상된 데이터 수집 시스템 시작...');
    console.log('📊 적용된 보완적 방법들:');
    console.log('   • 동적 우선순위 시스템 (거래시간별 조정)');
    console.log('   • 다중 데이터 소스 자동 전환');
    console.log('   • 가격 변동성 추적 시스템');
    console.log('   • 배치 처리로 API 부하 분산');
    console.log('   • 스마트 캐싱 및 예측 업데이트');
    
    // 즉시 첫 수집
    await this.collectBatchOptimized(symbols);
    
    // 동적 스케줄링 시작
    this.startDynamicScheduling(symbols);
  }

  // 동적 스케줄링
  startDynamicScheduling(symbols) {
    const scheduleNext = () => {
      const marketTime = this.getUSMarketTime();
      
      // 거래시간별 적응적 간격
      let baseInterval = 120000; // 기본 2분
      
      if (marketTime.isRegularHours) {
        baseInterval = 60000; // 정규시간 1분
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        baseInterval = 180000; // 확장시간 3분
      } else {
        baseInterval = 600000; // 폐장 10분
      }
      
      // 변동성 평균을 고려한 추가 조정
      const avgVolatility = Array.from(this.volatilityIndex.values())
        .reduce((sum, vol) => sum + vol, 0) / this.volatilityIndex.size || 0;
      
      if (avgVolatility > 0.2) {
        baseInterval *= 0.8; // 고변동성시 더 자주
      }
      
      setTimeout(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 향상된 배치 수집`);
        await this.collectBatchOptimized(symbols);
        scheduleNext(); // 다음 스케줄 설정
      }, baseInterval);
      
      console.log(`⏰ 다음 업데이트: ${Math.round(baseInterval/1000)}초 후 (시장 변동성: ${Math.round(avgVolatility*100)}%)`);
    };

    scheduleNext();
  }

  // 공개 메서르들
  getAllCachedData() {
    const allData = {};
    for (const [symbol, data] of this.dataCache) {
      allData[symbol] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(symbol),
        volatility: this.volatilityIndex.get(symbol) || 0,
        ageMinutes: Math.round((Date.now() - this.lastUpdateTimes.get(symbol)) / 60000)
      };
    }
    return allData;
  }

  getCurrentData(symbol) {
    return this.dataCache.get(symbol);
  }

  stopCollection() {
    // 스케줄링 중단 로직
    console.log('⏹️ 향상된 데이터 수집 중단');
  }
}

module.exports = EnhancedDataProvider;
