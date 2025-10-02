// 🎯 최종 데이터 전략 - 4단계 자동 전환 시스템
// 🔥 Yahoo Finance (무제한) → 🌐 Investing.com → 📊 Finviz → ⭐ Alpha Vantage (25회/일)

const axios = require('axios');
const cheerio = require('cheerio');

class FinalDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.sourceMetrics = new Map();
    this.alphaVantageUsage = {
      dailyCount: 0,
      lastReset: new Date().toDateString(),
      maxDailyLimit: 20 // 25회 중 20회로 안전하게 제한
    };
    
    // 4단계 데이터 소스 설정
    this.dataSources = {
      yahooFinance: {
        name: 'Yahoo Finance',
        priority: 1,
        isStable: true,
        isUnlimited: true,
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart'
      },
      investing: {
        name: 'Investing.com',
        priority: 2,
        isStable: false, // 웹스크래핑 - 차단 가능
        isUnlimited: true,
        baseUrl: 'https://www.investing.com'
      },
      finviz: {
        name: 'Finviz',
        priority: 3,
        isStable: false, // 웹스크래핑 - 차단 가능
        isUnlimited: true,
        baseUrl: 'https://finviz.com'
      },
      alphaVantage: {
        name: 'Alpha Vantage',
        priority: 4,
        isStable: true,
        isUnlimited: false, // 25회/일 제한
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: null // 토큰 없음 - 비활성화
      }
    };
    
    console.log('🎯 최종 데이터 전략 - 4단계 자동 전환 시스템 초기화');
    console.log('🔥 1단계: Yahoo Finance (무제한) - 주 소스');
    console.log('🌐 2단계: Investing.com (웹스크래핑) - 빠른 백업');
    console.log('📊 3단계: Finviz (웹스크래핑) - 추가 백업');
    console.log('⭐ 4단계: Alpha Vantage (25회/일) - 매우 절약적 사용');
  }

  // 🔥 1단계: Yahoo Finance (무제한) - 가장 안정적
  async fetchFromYahooFinance(symbol) {
    try {
      const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
      console.log(`🔥 Yahoo Finance에서 ${symbol} 데이터 수집...`);
      
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!response.data.chart || !response.data.chart.result) {
        throw new Error('Yahoo Finance 응답 구조 오류');
      }
      
      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quotes = result.timestamp;
      const prices = result.indicators.quote[0];
      
      if (!quotes || quotes.length === 0) {
        throw new Error('Yahoo Finance에서 가격 데이터 없음');
      }
      
      const latestIndex = quotes.length - 1;
      const latestPrice = prices.close[latestIndex];
      const openPrice = prices.open[latestIndex];
      const highPrice = prices.high[latestIndex];
      const lowPrice = prices.low[latestIndex];
      const volume = prices.volume[latestIndex];
      
      this.updateSourceMetrics('yahooFinance', true);
      
      return {
        symbol: symbol,
        currentPrice: parseFloat(latestPrice),
        open: parseFloat(openPrice),
        high: parseFloat(highPrice),
        low: parseFloat(lowPrice),
        volume: parseFloat(volume),
        change: parseFloat(latestPrice) - parseFloat(openPrice),
        changePercent: ((parseFloat(latestPrice) - parseFloat(openPrice)) / parseFloat(openPrice)) * 100,
        lastRefreshed: new Date(quotes[latestIndex] * 1000).toISOString(),
        source: 'Yahoo Finance (무제한)',
        sourcePriority: 1,
        timestamp: Date.now(),
        delay: '실시간',
        isStable: true,
        isUnlimited: true
      };
      
    } catch (error) {
      console.error(`❌ Yahoo Finance ${symbol} 수집 실패:`, error.message);
      this.updateSourceMetrics('yahooFinance', false);
      throw new Error(`Yahoo Finance 접근 실패: ${error.message}`);
    }
  }

  // 🌐 2단계: Investing.com (웹스크래핑) - 빠른 백업
  async fetchFromInvesting(symbol) {
    try {
      console.log(`🌐 Investing.com에서 ${symbol} 데이터 스크래핑...`);
      
      // Investing.com 심볼 매핑
      const symbolMap = {
        'AAPL': 'AAPL',
        'MSFT': 'MSFT',
        'GOOGL': 'GOOGL',
        'TSLA': 'TSLA',
        'AMZN': 'AMZN',
        'NVDA': 'NVDA',
        'META': 'META',
        'AMD': 'AMD'
      };
      
      const investingSymbol = symbolMap[symbol] || symbol;
      const url = `${this.dataSources.investing.baseUrl}/equities/${investingSymbol.toLowerCase()}`;
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Investing.com에서 가격 정보 추출 (실제 구조에 따라 조정 필요)
      const priceElement = $('.instrument-price_last__KQzyA').first();
      const priceText = priceElement.text().replace(/[^\d.-]/g, '');
      const currentPrice = parseFloat(priceText);
      
      if (!currentPrice || isNaN(currentPrice)) {
        throw new Error('Investing.com에서 가격 정보 추출 실패');
      }
      
      this.updateSourceMetrics('investing', true);
      
      return {
        symbol: symbol,
        currentPrice: currentPrice,
        lastRefreshed: new Date().toISOString(),
        source: 'Investing.com (웹스크래핑)',
        sourcePriority: 2,
        timestamp: Date.now(),
        delay: '실시간',
        isStable: false, // 웹스크래핑 - 차단 가능
        isUnlimited: true
      };
      
    } catch (error) {
      console.error(`❌ Investing.com ${symbol} 스크래핑 실패:`, error.message);
      this.updateSourceMetrics('investing', false);
      throw new Error(`Investing.com 접근 실패: ${error.message}`);
    }
  }

  // 📊 3단계: Finviz (웹스크래핑) - 추가 백업
  async fetchFromFinviz(symbol) {
    try {
      console.log(`📊 Finviz에서 ${symbol} 데이터 스크래핑...`);
      
      const url = `${this.dataSources.finviz.baseUrl}/quote.ashx?t=${symbol}`;
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Finviz에서 가격 정보 추출
      const priceElement = $('table.snapshot-table2 tr').find('td').filter(function() {
        return $(this).text().includes('$');
      }).first();
      
      const priceText = priceElement.text().replace(/[^\d.-]/g, '');
      const currentPrice = parseFloat(priceText);
      
      if (!currentPrice || isNaN(currentPrice)) {
        throw new Error('Finviz에서 가격 정보 추출 실패');
      }
      
      this.updateSourceMetrics('finviz', true);
      
      return {
        symbol: symbol,
        currentPrice: currentPrice,
        lastRefreshed: new Date().toISOString(),
        source: 'Finviz (웹스크래핑)',
        sourcePriority: 3,
        timestamp: Date.now(),
        delay: '실시간',
        isStable: false, // 웹스크래핑 - 차단 가능
        isUnlimited: true
      };
      
    } catch (error) {
      console.error(`❌ Finviz ${symbol} 스크래핑 실패:`, error.message);
      this.updateSourceMetrics('finviz', false);
      throw new Error(`Finviz 접근 실패: ${error.message}`);
    }
  }

  // ⭐ 4단계: Alpha Vantage (25회/일) - 매우 절약적 사용
  async fetchFromAlphaVantage(symbol) {
    try {
      // 일일 사용량 체크
      this.checkAlphaVantageUsage();
      
      if (this.alphaVantageUsage.dailyCount >= this.alphaVantageUsage.maxDailyLimit) {
        throw new Error('Alpha Vantage 일일 제한 도달 (20회)');
      }
      
      console.log(`⭐ Alpha Vantage에서 ${symbol} 데이터 수집... (${this.alphaVantageUsage.dailyCount + 1}/${this.alphaVantageUsage.maxDailyLimit})`);
      
      // Alpha Vantage는 토큰이 없으므로 비활성화
      throw new Error('Alpha Vantage 토큰 없음 - 비활성화됨');
      
      /* 실제 구현시 사용할 코드 (토큰 발급 후)
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
        throw new Error('Alpha Vantage 응답에서 시간 시리즈 데이터 없음');
      }

      const latestTimeKey = Object.keys(timeSeriesData)[0];
      const latestData = timeSeriesData[latestTimeKey];

      // 사용량 증가
      this.alphaVantageUsage.dailyCount++;

      this.updateSourceMetrics('alphaVantage', true);

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
        source: 'Alpha Vantage (25회/일 제한)',
        sourcePriority: 4,
        timestamp: Date.now(),
        delay: '15분+ 지연',
        isStable: true,
        isUnlimited: false
      };
      */
      
    } catch (error) {
      console.error(`❌ Alpha Vantage ${symbol} 수집 실패:`, error.message);
      this.updateSourceMetrics('alphaVantage', false);
      throw new Error(`Alpha Vantage 접근 실패: ${error.message}`);
    }
  }

  // 🎯 4단계 자동 전환 시스템
  async getDataWithFallback(symbol) {
    const cacheKey = `final_${symbol}`;
    const cachedData = this.dataCache.get(cacheKey);
    const lastUpdate = this.lastUpdateTimes.get(cacheKey);
    
    // 5분 이내 데이터면 캐시된 데이터 반환
    if (cachedData && lastUpdate && Date.now() - lastUpdate < 300000) {
      console.log(`📈 ${symbol}: 캐시된 데이터 사용`);
      return cachedData;
    }

    // 4단계 폴백 체인
    const fallbackMethods = [
      () => this.fetchFromYahooFinance(symbol),
      () => this.fetchFromInvesting(symbol),
      () => this.fetchFromFinviz(symbol),
      () => this.fetchFromAlphaVantage(symbol)
    ];

    const sourceNames = ['Yahoo Finance', 'Investing.com', 'Finviz', 'Alpha Vantage'];

    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        console.log(`🔄 ${symbol}: ${sourceNames[i]} 시도 중... (${i + 1}/4)`);
        const data = await fallbackMethods[i]();
        
        // 성공시 캐시에 저장
        this.dataCache.set(cacheKey, data);
        this.lastUpdateTimes.set(cacheKey, Date.now());
        
        console.log(`✅ ${symbol}: ${sourceNames[i]}에서 데이터 수집 성공`);
        return data;
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: ${sourceNames[i]} 실패 → 다음 소스로 전환`);
        if (i === fallbackMethods.length - 1) {
          throw new Error(`모든 데이터 소스 실패: ${error.message}`);
        }
        
        // 다음 소스로 전환 전 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 다중 심볼 4단계 자동 전환 수집
  async collectFinalData(symbols) {
    console.log('🎯 4단계 자동 전환 시스템으로 데이터 수집 시작...');
    const results = {};
    
    for (const symbol of symbols) {
      try {
        const data = await this.getDataWithFallback(symbol);
        results[symbol] = {
          success: true,
          data: data,
          source: data.source,
          sourcePriority: data.sourcePriority,
          isStable: data.isStable
        };
        
        // 요청 간 지연 (안정성 보장)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          sourcePriority: 0
        };
      }
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    console.log(`🎯 4단계 자동 전환 시스템 완료: ${successCount}/${symbols.length} 성공`);
    
    return results;
  }

  // Alpha Vantage 사용량 체크
  checkAlphaVantageUsage() {
    const today = new Date().toDateString();
    
    if (this.alphaVantageUsage.lastReset !== today) {
      this.alphaVantageUsage.dailyCount = 0;
      this.alphaVantageUsage.lastReset = today;
      console.log('🔄 Alpha Vantage 일일 사용량 리셋');
    }
  }

  // 소스별 성능 메트릭 업데이트
  updateSourceMetrics(sourceName, success) {
    if (!this.sourceMetrics.has(sourceName)) {
      this.sourceMetrics.set(sourceName, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0
      });
    }
    
    const metrics = this.sourceMetrics.get(sourceName);
    metrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }
    
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  }

  // 4단계 자동 전환 시스템 시작
  async startFinalCollection() {
    const targetSymbols = [
      'AAPL',  // Apple
      'MSFT',  // Microsoft  
      'GOOGL', // Alphabet
      'TSLA',  // Tesla
      'AMZN',  // Amazon
      'NVDA',  // NVIDIA
      'META',  // Meta
      'AMD'    // AMD
    ];

    console.log('🎯 4단계 자동 전환 시스템 시작 (5분 간격)');
    
    // 즉시 첫 수집 실행
    await this.collectFinalData(targetSymbols);
    
    // 5분 간격으로 지속 수집
    setInterval(async () => {
      console.log(`\n📅 ${new Date().toLocaleString()} - 4단계 자동 전환 시스템 실행`);
      await this.collectFinalData(targetSymbols);
    }, 5 * 60 * 1000); // 5분 = 300,000ms
  }

  // 현재 캐시된 데이터 모두 조회
  getAllCachedData() {
    const allData = {};
    for (const [key, data] of this.dataCache) {
      allData[key] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(key)
      };
    }
    return allData;
  }

  // 특정 심볼의 현재 데이터 조회
  getCurrentData(symbol) {
    const cacheKey = `final_${symbol}`;
    return this.dataCache.get(cacheKey);
  }

  // 4단계 시스템 상태 조회
  getSystemStatus() {
    const cachedSymbols = this.dataCache.size;
    const sourceMetrics = Object.fromEntries(this.sourceMetrics);
    
    return {
      systemName: '4단계 자동 전환 시스템',
      cachedSymbols: cachedSymbols,
      sourceMetrics: sourceMetrics,
      alphaVantageUsage: this.alphaVantageUsage,
      fallbackChain: [
        'Yahoo Finance (무제한)',
        'Investing.com (웹스크래핑)',
        'Finviz (웹스크래핑)',
        'Alpha Vantage (25회/일)'
      ],
      stabilityLevel: 'maximum'
    };
  }
}

module.exports = FinalDataProvider;
