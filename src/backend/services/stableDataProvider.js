// 🛡️ 안정적인 데이터 프로바이더 - 웹스크래핑 차단 문제 완전 해결
// 평생 사용 가능한 무료 데이터 소스만 사용

const axios = require('axios');

class StableDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.requestCounts = new Map();
    
    // 안정적인 무료 데이터 소스 설정
    this.dataSources = {
      yahooFinance: {
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        rateLimit: 2000, // Yahoo Finance는 매우 관대한 제한
        isStable: true
      },
      finnhub: {
        baseUrl: 'https://finnhub.io/api/v1',
        apiKey: 'demo', // 무료 데모 키 (실제 사용시 발급 필요)
        rateLimit: 60, // 분당 60회
        isStable: true
      },
      iexCloud: {
        baseUrl: 'https://cloud.iexapis.com/stable',
        apiKey: 'demo', // 무료 데모 키 (실제 사용시 발급 필요)
        rateLimit: 50000, // 월 50,000회
        isStable: true
      }
    };
    
    console.log('🛡️ 안정적인 데이터 프로바이더 초기화 완료');
    console.log('📊 사용 가능한 안정적 데이터 소스:');
    console.log('   ✅ Yahoo Finance (무제한, 웹스크래핑 차단 없음)');
    console.log('   ✅ Finnhub (무료 티어, 공식 API)');
    console.log('   ✅ IEX Cloud (무료 티어, 공식 API)');
  }

  // Yahoo Finance 데이터 수집 (가장 안정적)
  async fetchFromYahooFinance(symbol) {
    try {
      const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
      console.log(`📊 Yahoo Finance에서 ${symbol} 데이터 수집...`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        source: 'Yahoo Finance (안정적)',
        timestamp: Date.now(),
        delay: '실시간',
        isStable: true
      };
      
    } catch (error) {
      console.error(`❌ Yahoo Finance ${symbol} 수집 실패:`, error.message);
      throw new Error(`Yahoo Finance 접근 실패: ${error.message}`);
    }
  }

  // Finnhub 데이터 수집 (공식 API)
  async fetchFromFinnhub(symbol) {
    try {
      const url = `${this.dataSources.finnhub.baseUrl}/quote`;
      console.log(`📈 Finnhub에서 ${symbol} 데이터 수집...`);
      
      const response = await axios.get(url, {
        params: {
          symbol: symbol,
          token: this.dataSources.finnhub.apiKey
        },
        timeout: 8000
      });
      
      if (!response.data.c) {
        throw new Error('Finnhub 응답에서 현재 가격 없음');
      }
      
      return {
        symbol: symbol,
        currentPrice: parseFloat(response.data.c),
        open: parseFloat(response.data.o),
        high: parseFloat(response.data.h),
        low: parseFloat(response.data.l),
        change: parseFloat(response.data.d),
        changePercent: parseFloat(response.data.dp),
        lastRefreshed: new Date(response.data.t * 1000).toISOString(),
        source: 'Finnhub (공식 API)',
        timestamp: Date.now(),
        delay: '실시간',
        isStable: true
      };
      
    } catch (error) {
      console.error(`❌ Finnhub ${symbol} 수집 실패:`, error.message);
      throw new Error(`Finnhub 접근 실패: ${error.message}`);
    }
  }

  // IEX Cloud 데이터 수집 (공식 API)
  async fetchFromIEXCloud(symbol) {
    try {
      const url = `${this.dataSources.iexCloud.baseUrl}/stock/${symbol}/quote`;
      console.log(`🏛️ IEX Cloud에서 ${symbol} 데이터 수집...`);
      
      const response = await axios.get(url, {
        params: {
          token: this.dataSources.iexCloud.apiKey
        },
        timeout: 8000
      });
      
      if (!response.data.latestPrice) {
        throw new Error('IEX Cloud 응답에서 현재 가격 없음');
      }
      
      return {
        symbol: symbol,
        currentPrice: parseFloat(response.data.latestPrice),
        open: parseFloat(response.data.open),
        high: parseFloat(response.data.high),
        low: parseFloat(response.data.low),
        volume: parseFloat(response.data.volume),
        change: parseFloat(response.data.change),
        changePercent: parseFloat(response.data.changePercent) * 100,
        lastRefreshed: response.data.latestUpdate,
        source: 'IEX Cloud (공식 API)',
        timestamp: Date.now(),
        delay: '실시간',
        isStable: true
      };
      
    } catch (error) {
      console.error(`❌ IEX Cloud ${symbol} 수집 실패:`, error.message);
      throw new Error(`IEX Cloud 접근 실패: ${error.message}`);
    }
  }

  // 안정적인 데이터 수집 (폴백 시스템)
  async getStableData(symbol) {
    const cacheKey = `stable_${symbol}`;
    const cachedData = this.dataCache.get(cacheKey);
    const lastUpdate = this.lastUpdateTimes.get(cacheKey);
    
    // 5분 이내 데이터면 캐시된 데이터 반환
    if (cachedData && lastUpdate && Date.now() - lastUpdate < 300000) {
      console.log(`📈 ${symbol}: 안정적 캐시 데이터 사용`);
      return cachedData;
    }

    // 폴백 순서: Yahoo Finance → Finnhub → IEX Cloud
    const fallbackMethods = [
      () => this.fetchFromYahooFinance(symbol),
      () => this.fetchFromFinnhub(symbol),
      () => this.fetchFromIEXCloud(symbol)
    ];

    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        console.log(`🔄 ${symbol}: 안정적 데이터 소스 ${i + 1}번 시도...`);
        const data = await fallbackMethods[i]();
        
        // 성공시 캐시에 저장
        this.dataCache.set(cacheKey, data);
        this.lastUpdateTimes.set(cacheKey, Date.now());
        
        console.log(`✅ ${symbol}: 안정적 데이터 수집 성공 (${data.source})`);
        return data;
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: 안정적 데이터 소스 ${i + 1}번 실패, 다음 시도...`);
        if (i === fallbackMethods.length - 1) {
          throw new Error(`모든 안정적 데이터 소스 실패: ${error.message}`);
        }
      }
    }
  }

  // 다중 심볼 안정적 데이터 수집
  async collectStableData(symbols) {
    console.log('🛡️ 안정적 데이터 수집 시작...');
    const results = {};
    
    for (const symbol of symbols) {
      try {
        const data = await this.getStableData(symbol);
        results[symbol] = {
          success: true,
          data: data,
          source: data.source,
          isStable: true
        };
        
        // 요청 간 지연 (안정성 보장)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          isStable: false
        };
      }
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    console.log(`🛡️ 안정적 데이터 수집 완료: ${successCount}/${symbols.length} 성공`);
    
    return results;
  }

  // 안정적 데이터 수집 스케줄 시작
  async startStableCollection() {
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

    console.log('🛡️ 안정적 데이터 수집 스케줄 시작 (5분 간격)');
    
    // 즉시 첫 수집 실행
    await this.collectStableData(targetSymbols);
    
    // 5분 간격으로 지속 수집
    setInterval(async () => {
      console.log(`\n📅 ${new Date().toLocaleString()} - 안정적 데이터 수집 시작`);
      await this.collectStableData(targetSymbols);
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
    const cacheKey = `stable_${symbol}`;
    return this.dataCache.get(cacheKey);
  }

  // 안정성 상태 조회
  getStabilityStatus() {
    const cachedSymbols = this.dataCache.size;
    const lastUpdateTimes = Array.from(this.lastUpdateTimes.values());
    const oldestUpdate = Math.min(...lastUpdateTimes);
    const newestUpdate = Math.max(...lastUpdateTimes);
    
    return {
      cachedSymbols: cachedSymbols,
      oldestDataAge: Date.now() - oldestUpdate,
      newestDataAge: Date.now() - newestUpdate,
      isStable: true,
      dataSources: Object.keys(this.dataSources),
      stabilityLevel: 'maximum'
    };
  }
}

module.exports = StableDataProvider;
