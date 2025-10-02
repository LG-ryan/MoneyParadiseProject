// 최종 터보 데이터 프로바이더 - 4단계 자동 전환 시스템
// Yahoo Finance → Investing.com → Finviz → Alpha Vantage 폴백 체인

const axios = require('axios');

class TurboDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    
    // Alpha Vantage 사용량 추적 (25회/일 제한)
    this.alphaVantageUsage = {
      dailyLimit: 25,
      usedToday: 0,
      blackoutAt: 20, // 20회부터 차단
      lastReset: new Date().toDateString()
    };
    
    console.log('🚀 터보 데이터 프로바이더 초기화');
    console.log('📊 사용 전략: Yahoo Finance → Investing.com → Finviz → Alpha Vantage');
    console.log('⚡ Alpha Vantage 제한 경계선: 20회/일 (5회 안전 마진)');
    
    this.scheduleDailyReset();
  }

  // 4단계 폴백 체인 정의
  getDataSourceChain() {
    return [
      {
        name: 'yahooFinance',
        url: 'https://query1.finance.yahoo.com/v8/finance/chart',
        priority: 1,
        unlimited: true,
        delay: '5-15분',
        reliability: 0.95
      },
      {
        name: 'investing',
        url: 'https://www.investing.com/search',
        priority: 2,
        unlimited: true,
        delay: '1-5분',
        reliability: 0.85,
        scraping: true
      },
      {
        name: 'finviz',
        url: 'https://finviz.com/quote.ashx',
        priority: 3,
        unlimited: true,
        delay: '1-5분',
        reliability: 0.80,
        scraping: true
      },
      {
        name: 'alphaVantage',
        url: 'https://www.alphavantage.co/query',
        priority: 4,
        limited: true,
        delay: '15분+',
        reliability: 0.90,
        apiKey: 'YCN5UGRTXB1ZF74P',
        dailyLimit: 25
      }
    ];
  }

  // 미국 시장 시간 계산
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
      isRegularHours: usTime.getHours() >= 9 && usTime.getMinutes() >= 30 && usTime.getHours() < 16,
      isAfterMarket: usTime.getHours() >= 16 && usTime.getHours() < 20,
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20
    };
  }

  // Alpha Vantage 사용 가능 여부 확인
  canUseAlphaVantage() {
    const today = new Date().toDateString();
    
    // 날짜 리셋 체크
    if (this.alphaVantageUsage.lastReset !== today) {
      this.alphaVantageUsage.usedToday = 0;
      this.alphaVantageUsage.lastReset = today;
      console.log(`🔄 Alpha Vantage 카운터 리셋 완료`);
    }
    
    return {
      canUse: this.alphaVantageUsage.usedToday < this.alphaVantageUsage.blackoutAt,
      used: this.alphaVantageUsage.usedToday,
      limit: this.alphaVantageUsage.dailyLimit,
      remaining: this.alphaVantageUsage.blackoutAt - this.alphaVantageUsage.usedToday,
      danger: this.alphaVantageUsage.usedToday >= this.alphaVantageUsage.blackoutAt
    };
  }

  // 터보 데이터 수집 (4단계 자동 전환)
  async collectTurboData(symbols) {
    const marketTime = this.getUSMarketTime();
    const alphaStatus = this.canUseAlphaVantage();
    
    console.log(`🚀 터보 데이터 수집 시작 (${marketTime.hour}:${marketTime.minute} EST)`);
    console.log(`⚡ Alpha Vantage 상태: ${alphaStatus.remaining}회 남음 (${alphaStatus.used}/${alphaStatus.limit})`);
    
    // 폐장/주말엔 캐시 데이터만 반환
    if (!marketTime.isTradingDay || marketTime.isMarketClosed) {
      console.log(`😴 폐장/주말 - 캐시된 데이터 재사용`);
      return this.reuseCachedData(symbols);
    }
    
    // 거래 시간대별 전략
    const strategy = this.determineStrategy(marketTime, alphaStatus);
    console.log(`🎯 적용 전략: ${strategy.name}`);
    
    // 배치별로 처리
    const results = await this.processSymbolsBatch(symbols, strategy);
    
    console.log(`📊 수집 완료: ${Object.keys(results).length}/${symbols.length} 심볼 처리`);
    return results;
  }

  // 전략 결정
  determineStrategy(marketTime, alphaStatus) {
    if (marketTime.isRegularHours && alphaStatus.canUse) {
      return {
        name: '정규거래시간-절약모드',
        batchSize: 3,
        primarySources: ['yahooFinance', 'investing'],
        fallbackSources: ['finviz', 'alphaVantage'],
        interval: '4분',
        conservative: true
      };
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      return {
        name: '확장시간-초절약모드',
        batchSize: 2,
        primarySources: ['yahooFinance', 'investing'],
        fallbackSources: ['finviz'],
        interval: '8분',
        conservative: true
      };
    } else {
      return {
        name: '캐시재사용모드',
        batchSize: 1,
        primarySources: [],
        fallbackSources: [],
        interval: '캐시만사용',
        conservative: true
      };
    }
  }

  // 심볼 배치 처리
  async processSymbolsBatch(symbols, strategy) {
    const results = {};
    const batchSize = strategy.batchSize;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      console.log(`⏳ 배치 ${Math.floor(i/batchSize)+1}/${Math.ceil(symbols.length/batchSize)} 처리`);
      
      // 배치 펼리 처리
      const batchPromises = batch.map(symbol => 
        this.fetchWithFallbackChain(symbol, strategy)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // 결과 저장
      batch.forEach((symbol, index) => {
        results[symbol] = batchResults[index];
      });
      
      // 배치간 대기
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  // 폴백 체인으로 데이터 수집
  async fetchWithFallbackChain(symbol, strategy) {
    const dataSources = [...strategy.primarySources, ...strategy.fallbackSources];
    
    for (const sourceName of dataSources) {
      try {
        // Alpha Vantage 사용 가능 여부 사전 체크
        if (sourceName === 'alphaVantage') {
          const alphaStatus = this.canUseAlphaVantage();
          if (!alphaStatus.canUse) {
            console.log(`🚫 ${symbol}: Alpha Vantage 사용 제한으로 스킵`);
            continue;
          }
        }

        const data = await this.fetchFromSource(symbol, sourceName);
        
        // Alpha Vantage 사용량 추적
        if (sourceName === 'alphaVantage') {
          this.alphaVantageUsage.usedToday++;
          console.log(`⭐ ${symbol}: Alpha Vantage 성공 (${this.alphaVantageUsage.usedToday}/20)`);
        }
        
        // 캐시 업데이트
        this.updateCache(symbol, data, sourceName);
        
        console.log(`✅ ${symbol}: ${sourceName} 성공 - $${data.currentPrice}`);
        return data;
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: ${sourceName} 실패 - 다음 소스 시도`);
      }
    }
    
    // 모든 소스 실패
    const cached = this.dataCache.get(symbol);
    if (cached) {
      console.log(`♻️ ${symbol}: 모든 소스 실패 - 캐시된 데이터 사용`);
      return { ...cached, reused: true, note: '모든 소스 실패로 캐시 사용' };
    }
    
    throw new Error(`${symbol}: 모든 데이터 소스 실패 및 캐시 없음`);
  }

  // 소스별 데이터 수집 구현
  async fetchFromSource(symbol, sourceName) {
    switch (sourceName) {
      case 'yahooFinance':
        return await this.fetchFromYahooFinance(symbol);
      case 'investing':
        return await this.fetchFromInvesting(symbol);
      case 'finviz':
        return await this.fetchFromFinviz(symbol);
      case 'alphaVantage':
        return await this.fetchFromAlphaVantage(symbol);
      default:
        throw new Error(`지원되지 않는 소스: ${sourceName}`);
    }
  }

  // Yahoo Finance 데이터 수집 (주 소스)
  async fetchFromYahooFinance(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const params = {
      range: '1d',
      interval: '1m',
      includePrePost: 'true'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data.chart?.result?.length) {
      throw new Error('Yahoo Finance 응답 데이터 없음');
    }

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    let latestIndex = quotes.close.length - 1;
    while (latestIndex >= 0 && quotes.close[latestIndex] === null) {
      latestIndex--;
    }

    if (latestIndex < 0) {
      throw new Error('유효한 Yahoo Finance 가격 데이터 없음');
    };

    const price = quotes.close[latestIndex];
    const open = quotes.open[latestIndex] || price;

    return {
      symbol: symbol,
      currentPrice: price,
      open: open,
      high: quotes.high[latestIndex] || price,
      low: quotes.low[latestIndex] || price,
      volume: quotes.volume[latestIndex] || 0,
      change: price - open,
      changePercent: ((price - open) / open) * 100,
      lastRefreshed: new Date(timestamps[latestIndex] * 1000).toISOString(),
      source: 'Yahoo Finance',
      timestamp: Date.now(),
      delay: '5-10분 (무제한)'
    };
  }

  // Investing.com 웹스크래핑
  async fetchFromInvesting(symbol) {
    try {
      const response = await axios.get(`https://www.investing.com/search/?q=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });

      // 가격 패턴 추출
      const pricePattern = /\$(\d+(?:\.\d{2})?)/g;
      const matches = response.data.match(pricePattern);
      
      if (matches && matches.length > 0) {
        const prices = matches.map(m => parseFloat(m.replace('$', '')));
        const price = Math.max(...prices);
        
        return {
          symbol: symbol,
          currentPrice: price,
          source: 'Investing.com (웹스크래핑)',
          lastRefreshed: new Date().toISOString(),
          timestamp: Date.now(),
          delay: '1-3분',
          note: '웹 스크래핑 데이터'
        };
      }
      
      throw new Error('Investing.com에서 가격 추출 실패');
      
    } catch (error) {
      throw new Error(`Investing.com 접근 실패: ${error.message}`);
    }
  }

  // Finviz 웹스크래핑
  async fetchFromFinviz(symbol) {
    try {
      const response = await axios.get(`https://finviz.com/quote.ashx?t=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      });

      const pricePattern = /\$(\d+(?:\.\d{2})?)/;
      const match = response.data.match(pricePattern);
      
      if (match) {
        return {
          symbol: symbol,
          currentPrice: parseFloat(match[1]),
          source: 'Finviz (웹스크래핑)',
          lastRefreshed: new Date().toISOString(),
          timestamp: Date.now(),
          delay: '1-5분',
          note: '빠른 백업 소스'
        };
      }
      
      throw new Error('Finviz에서 가격 패턴 매칭 실패');
      
    } catch (error) {
      throw new Error(`Finviz 접근 실패: ${error.message}`);
    }
  }

  // Alpha Vantage 데이터 수집 (비활성화됨)
  async fetchFromAlphaVantage(symbol) {
    console.log(`🚫 ${symbol}: Alpha Vantage API 비활성화됨 - 토큰 없이 오류 방지`);
    throw new Error('Alpha Vantage API 비활성화됨 - 안정적인 대안 사용 권장');
    
    // 아래 코드는 실행되지 않음 (Alpha Vantage 비활성화)
    /*
    const params = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol,
      interval: '5min',
      apikey: 'DISABLED',
      outputsize: 'compact'
    };

    const response = await axios.get('https://www.alphavantage.co/query', { 
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
      timestamp: Date.now(),
      delay: '15분+ 지연'
    };
    */
  }

  // 캐시된 데이터 재사용
  reuseCachedData(symbols) {
    const cachedResults = {};
    
    symbols.forEach(symbol => {
      const cached = this.dataCache.get(symbol);
      if (cached) {
        cachedResults[symbol] = {
          ...cached,
          reused: true,
          note: '폐장시간 캐시 재사용',
          noAPICall: true
        };
        console.log(`♻️ ${symbol}: 캐시 재사용 - $${cached.currentPrice}`);
      } else {
        console.log(`❓ ${symbol}: 캐시 없음`);
      }
    });
    
    return cachedResults;
  }

  // 캐시 업데이트
  updateCache(symbol, data, source) {
    this.dataCache.set(symbol, data);
    this.lastUpdateTimes.set(symbol, Date.now());
  }

  // 터보 시스템 시작
  async startTurboCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🚀 터보 데이터 수집 시스템 시작!');
    console.log('⚡ 4단계 자동 전환 시스템 활성화');
    console.log('📊 폴백 우선순위:');
    console.log('   1️⃣ Yahoo Finance (무제한, 5-15분 지연)');
    console.log('   2️⃣ Investing.com (웹스크래핑, 1-5분 지연)');
    console.log('   3️⃣ Finviz (웹스크래핑, 1-5분 지연)');
    console.log('   4️⃣ Alpha Vantage (절약적 사용, 15분+ 지연)');
    
    // 즉시 첫 수집
    await this.collectTurboData(symbols);
    
    // 터보 스케줄링
    this.startTurboScheduling(symbols);
  }

  // 터보 스케줄링
  startTurboScheduling(symbols) {
    const schedule = () => {
      const marketTime = this.getUSMarketTime();
      const alphaStatus = this.canUseAlphaVantage();
      
      let interval;
      
      if (marketTime.isRegularHours) {
        interval = alphaStatus.canUse ? 240000 : 180000; // 정규시간: 4분 또는 3분
        console.log(`⏰ 다음 터보 수집: ${Math.round(interval/1000)}초 후 (정규거래시간)`);
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        interval = alphaStatus.canUse ? 480000 : 360000; // 확장시간: 8분 또는 6분
        console.log(`⏰ 다음 터보 수집: ${Math.round(interval/1000)}초 후 (확장시간)`);
      } else {
        interval = 3600000; // 폐장: 60분 (캐시만 확인)
        console.log(`⏰ 다음 터보 수집: ${Math.round(interval/1000)}초 후 (폐장 - 캐시만)`);
      }
      
      setTimeout(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 터보 데이터 수집`);
        await this.collectTurboData(symbols);
        schedule(); // 다음 스케줄 설정
      }, interval);
    };

    schedule();
  }

  // 일일 리셋 스케줄
  scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow - now;
    
    setTimeout(() => {
      this.alphaVantageUsage.usedToday = 0;
      this.alphaVantageUsage.lastReset = new Date().toDateString();
      console.log(`🔄 Alpha Vantage 카운터 리셋 - 새벽부터 다시 시작`);
      this.scheduleDailyReset();
    }, msUntilReset);
  }

  // 공개 메서드들
  getAllCachedData() {
    const allData = {};
    for (const [symbol, data] of this.dataCache) {
      allData[symbol] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(symbol),
        ageMinutes: Math.round((Date.now() - this.lastUpdateTimes.get(symbol)) / 60000)
      };
    }
    return allData;
  }

  getCurrentData(symbol) {
    return this.dataCache.get(symbol);
  }

  getAlphaVantageStatus() {
    return this.canUseAlphaVantage();
  }

  stopCollection() {
    console.log('⏹️ 터보 데이터 수집 시스템 중단');
  }
}

module.exports = TurboDataProvider;
