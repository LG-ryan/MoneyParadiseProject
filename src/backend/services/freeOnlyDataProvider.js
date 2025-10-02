// 무료 전용 데이터 프로바이더 - Alpha Vantage 완전 제외
// Yahoo Finance → Investing.com → Finviz (4단계 자동 전환)

const axios = require('axios');

class FreeOnlyDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    
    // Alpha Vantage 완전 제외 선언
    this.alphaVantageExclusion = {
      isExcluded: true,
      reason: '오늘 일일 25회 한도 완전 소진',
      exclusionDate: new Date().toISOString(),
      nextAvailable: this.getNextMidnight()
    };
    
    console.log('🔥 무료 전용 데이터 프로바이더 초기화');
    console.log('🚫 Alpha Vantage 완전 제외 (오늘 더 이상 사용 안함)');
    console.log('⚡ 무료 소스 100% 활용 전략');
    console.log('🎯 4단계 자동 전환: Yahoo Finance → Investing.com → Finviz');
    console.log('📅 다음 Alpha Vantage 사용 가능 시간:', this.alphaVantageExclusion.nextAvailable);
    
    this.scheduleDailyReset();
  }

  // 무료 전용 소스 체인 정의 (Alpha Vantage 완전 제외)
  getFreeOnlySourceChain() {
    return [
      {
        name: 'yahooFinanceV1',
        url: 'https://query1.finance.yahoo.com/v8/finance/chart',
        priority: 1,
        unlimited: true,
        method: 'REST',
        reliability: 0.95,
        delay: '5-15분',
        description: '메인 주식 시세 API'
      },
      {
        name: 'yahooFinanceV2', 
        url: 'https://query2.finance.yahoo.com/v1/finance/search',
        priority: 2,
        unlimited: true,
        method: 'REST',
        reliability: 0.90,
        delay: '5-15분',
        description: '백업 검색 API'
      },
      {
        name: 'investingDesktop',
        url: 'https://www.investing.com/search',
        priority: 3,
        unlimited: true,
        method: 'WebScraping',
        reliability: 0.85,
        delay: '1-5분',
        description: '투자 정보 웹스크래핁'
      },
      {
        name: 'finvizQuote',
        url: 'https://finviz.com/quote.ashx',
        priority: 4,
        unlimited: true,
        method: 'WebScraping',
        reliability: 0.80,
        delay: '1-5분',
        description: '빠른 백업 소스'
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
      isWeekend: usTime.getDay() === 0 || usTime.getDay() === 6,
      isTradingDay: usTime.getDay() >= 1 && usTime.getDay() <= 5,
      isPreMarket: usTime.getHours() >= 4 && usTime.getHours() < 9,
      isRegularHours: usTime.getHours() >= 9 && usTime.getMinutes() >= 30 && usTime.getHours() < 16,
      isAfterMarket: usTime.getHours() >= 16 && usTime.getHours() < 20,
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20 || usTime.getDay() === 0 || usTime.getDay() === 6
    };
  }

  // 다음 자정까지 차분 계산 (Alpha Vantage 리셋용)
  getNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toLocaleString();
  }

  // 무료 전용 데이터 수집
  async collectFreeOnlyData(symbols) {
    const marketTime = this.getUSMarketTime();
    
    console.log(`🔥 무료 전용 데이터 수집 시작 (${marketTime.hour}:${marketTime.minute} EST)`);
    console.log(`🚫 Alpha Vantage 상태: 완전 제외 (${this.alphaVantageExclusion.reason})`);
    
    // 폐장/주말엔 캐시 데이터만 재사용
    if (marketTime.isMarketClosed) {
      console.log(`😴 시장 폐장/주말 - 캐시만 재사용`);
      return this.reuseCache(symbols);
    }
    
    // 무료 전용 전략 결정
    const strategy = this.determineFreeOnlyStrategy(marketTime);
    console.log(`🎯 적용 전략: ${strategy.name}`);
    console.log(`⚡ 무료 소스 ${strategy.sources.length}개 준비 완료`);
    
    // 무료 소스만으로 병렬 처리
    const results = await this.processSymbolsFreeOnly(symbols, strategy);
    
    console.log(`📊 수집 완료: ${Object.keys(results).length}/${symbols.length} 심볼 처리`);
    return results;
  }

  // 무료 전용 전략 결정
  determineFreeOnlyStrategy(marketTime) {
    const freeSources = this.getFreeOnlySourceChain();
    
    if (marketTime.isRegularHours) {
      return {
        name: '정규거래시간-무료모드',
        sources: freeSources.slice(0, 4), // 전체 무료 소스 사용
        batchSize: 3,
        parallelWorkers: 2,
        interval: '4분',
        aggressive: false
      };
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      return {
        name: '확장시간-무료모드',
        sources: freeSources.slice(0, 3), // 상위 3개 소스만
        batchSize: 2,
        parallelWorkers: 2,
        interval: '6분',
        aggressive: false
      };
    } else {
      return {
        name: '무료캐시모드',
        sources: [],
        batchSize: 1,
        parallelWorkers: 1,
        interval: '캐시전용',
        aggressive: false
      };
    }
  }

  // 심볼 무료 전용 처리
  async processSymbolsFreeOnly(symbols, strategy) {
    const results = {};
    
    if (strategy.sources.length === 0) {
      return this.reuseCache(symbols);
    }
    
    const workers = strategy.parallelWorkers;
    const batches = this.chunkArray(symbols, Math.ceil(symbols.length / workers));
    
    console.log(`🔥 무료 전용 병렬 처리: ${workers}개 워커로 ${batches.length}개 배치`);
    
    const workerPromises = batches.map(async (batch, workerIndex) => {
      console.log(`🔥 워커 ${workerIndex + 1} 시작 (${batch.length}개 심볼) - 무료 소스만 사용`);
      
      for (const symbol of batch) {
        try {
          const data = await this.fetchWithFreeOnlyFallback(symbol, strategy.sources);
          results[symbol] = data;
          console.log(`✅ 워커 ${workerIndex + 1}: ${symbol} 성공 (무료 소스)`);
          
          // 워커간 대기 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.log(`⚠️ 워커 ${workerIndex + 1}: ${symbol} 실패 - 캐시 확인`);
          // 실패시 캐시 확인
          const cached = this.dataCache.get(symbol);
          if (cached) {
            results[symbol] = { ...cached, reused: true, note: '무료 소스 실패로 캐시 사용' };
            console.log(`♻️ 워커 ${workerIndex + 1}: ${symbol} 캐시 재사용`);
          }
        }
      }
    });
    
    await Promise.all(workerPromises);
    return results;
  }

  // 무료 소스 폴백으로 데이터 수집
  async fetchWithFreeOnlyFallback(symbol, sources) {
    for (const source of sources) {
      try {
        console.log(`🔥 ${symbol}: ${source.name} 시도 중...`);
        const data = await this.fetchFromFreeSource(symbol, source);
        
        // 캐시 업데이트
        this.updateCache(symbol, data, source.name);
        
        console.log(`✅ ${symbol}: ${source.name} 성공 - $${data.currentPrice}`);
        return data;
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: ${source.name} 실패 - ${error.message}`);
      }
    }
    
    throw new Error(`${symbol}: 모든 무료 소스 실패`);
  }

  // 소스별 무료 데이터 수집 구현
  async fetchFromFreeSource(symbol, source) {
    switch (source.name) {
      case 'yahooFinanceV1':
        return await this.fetchFromYahooFinanceV1(symbol);
      case 'yahooFinanceV2':
        return await this.fetchFromYahooFinanceV2(symbol);
      case 'investingDesktop':
        return await this.fetchFromInvestingDesktop(symbol);
      case 'finvizQuote':
        return await this.fetchFromFinvizQuote(symbol);
      default:
        throw new Error(`지원되지 않는 무료 소스: ${source.name}`);
    }
  }

  // Yahoo Finance V1 (메인 무료 소스)
  async fetchFromYahooFinanceV1(symbol) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!response.data.chart?.result?.length) {
      throw new Error('Yahoo Finance V1 응답 데이터 없음');
    }

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    let latestIndex = quotes.close.length - 1;
    while (latestIndex >= 0 && quotes.close[latestIndex] === null) {
      latestIndex--;
    }

    if (latestIndex < 0) {
      throw new Error('Yahoo Finance V1 유효한 가격 데이터 없음');
    }

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
      source: '🔥 Yahoo Finance V1 (무료 전용)',
      timestamp: Date.now(),
      delay: '5-10분 (무제한)',
      freeOnly: true
    };
  }

  // Yahoo Finance V2 (백업 무료 소스)
  async fetchFromYahooFinanceV2(symbol) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search`;
    const params = {
      q: symbol,
      newsCount: 0,
      quotesCount: 1
    };

    const response = await axios.get(url, { 
      params,
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data.finance?.result?.length) {
      throw new Error('Yahoo Finance V2 응답 데이터 없음');
    }

    const result = response.data.finance.result;
    const quote = result.find(item => item.type === 'EQUITY');
    
    if (!quote) {
      throw new Error(`Yahoo Finance V2에서 ${symbol} 주식 데이터 없음`);
    }

    const price = quote.regularMarketPrice || quote.price;

    return {
      symbol: symbol,
      currentPrice: price,
      source: '🔥 Yahoo Finance V2 (무료 전용)',
      lastRefreshed: new Date().toISOString(),
      timestamp: Date.now(),
      delay: '5-15분',
      freeOnly: true
    };
  }

  // Investing.com 데스크톱 웹스크래핑 (무료 전용)
  async fetchFromInvestingDesktop(symbol) {
    try {
      const response = await axios.get(`https://www.investing.com/search/?q=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      });

      // 다양한 가격 패턴으로 추출
      const pricePatterns = [
        /\$(\d+(?:\.\d{2})?)/g,
        /Price:\s*\$(\d+(?:\.\d{2})?)/i,
        /(\d+(?:\,?\d{3})?\.\d{2})/g
      ];
      
      for (const pattern of pricePatterns) {
        const matches = response.data.match(pattern);
        if (matches && matches.length > 0) {
          const prices = matches.map(m => parseFloat(m.replace(/[$,]/g, '')));
          const validPrices = prices.filter(p => p > 0 && p < 10000); // 주식 가격 범위 검증
          
          if (validPrices.length > 0) {
            const price = Math.max(...validPrices);
            
            return {
              symbol: symbol,
              currentPrice: price,
              source: '🔥 Investing.com 데스크톱 (무료 전용)',
              lastRefreshed: new Date().toISOString(),
              timestamp: Date.now(),
              delay: '1-3분',
              freeOnly: true
            };
          }
        }
      }
      
      throw new Error('Investing 데스크톱에서 유효한 가격 추출 실패');
      
    } catch (error) {
      throw new Error(`Investing 데스크톱 접근 실패: ${error.message}`);
    }
  }

  // Finviz 웹스크래핑 (무료 전용 백업)
  async fetchFromFinvizQuote(symbol) {
    try {
      const response = await axios.get(`https://finviz.com/quote.ashx?t=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      });

      // Finviz 가격 패턴
      const pricePatterns = [
        /class="[^"]*" style="[^"]*">\$(\d+(?:\.\d{2})?)</,
        /\$(\d+(?:\.\d{2})?)\s*</,
        /Price[^>]*>\$(\d+(?:\.\d{2})?)/
      ];
      
      for (const pattern of pricePatterns) {
        const match = response.data.match(pattern);
        if (match) {
          const price = parseFloat(match[1]);
          
          if (price > 0 && price < 10000) { // 유효한 주식 가격 범위
            return {
              symbol: symbol,
              currentPrice: price,
              source: '🔥 Finviz 백업 (무료 전용)',
              lastRefreshed: new Date().toISOString(),
              timestamp: Date.now(),
              delay: '1-3분',
              freeOnly: true
            };
          }
        }
      }
      
      throw new Error('Finviz에서 유효한 가격 패턴 매칭 실패');
      
    } catch (error) {
      throw new Error(`Finviz 접근 실패: ${error.message}`);
    }
  }

  // 캐시 재사용
  reuseCache(symbols) {
    const cachedResults = {};
    
    symbols.forEach(symbol => {
      const cached = this.dataCache.get(symbol);
      if (cached) {
        cachedResults[symbol] = {
          ...cached,
          reused: true,
          note: '무료 전용 캐시 재사용',
          noAPICall: true,
          freeOnly: true
        };
        console.log(`♻️ ${symbol}: 무료 전용 캐시 재사용 - $${cached.currentPrice}`);
      } else {
        console.log(`❓ ${symbol}: 캐시 없음`);
      }
    });
    
    return cachedResults;
  }

  // 배열 청크분할 유틸리티
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // 캐시 업데이트
  updateCache(symbol, data, source) {
    this.dataCache.set(symbol, data);
    this.lastUpdateTimes.set(symbol, Date.now());
  }

  // 무료 전용 시스템 시작
  async startFreeOnlyCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🔥 무료 전용 데이터 수집 시스템 시작!');
    console.log('🚫 Alpha Vantage 완전 제외 (오늘 더 이상 사용 안함)');
    console.log('⚡ 무료 소스 4단계 자동 전환 전략:');
    console.log('   🔥 1단계: Yahoo Finance V1 (메인 무료소스)');
    console.log('   🔥 2단계: Yahoo Finance V2 (백업 무료소스)');
    console.log('   🌐 3단계: Investing.com 데스크톱 (웹스크래핑)');
    console.log('   📊 4단계: Finviz 백업 (웹스크래핑)');
    console.log('⭐ Alpha Vantage 차단 상태: 완전 제외');
    
    // 즉시 첫 수집
    await this.collectFreeOnlyData(symbols);
    
    // 무료 전용 스케줄링
    this.startFreeOnlyScheduling(symbols);
  }

  // 무료 전용 스케줄링
  startFreeOnlyScheduling(symbols) {
    const schedule = () => {
      const marketTime = this.getUSMarketTime();
      
      let interval;
      
      if (marketTime.isRegularHours) {
        interval = 240000; // 정규시간: 4분
        console.log(`⏰ 다음 무료 전용 수집: ${Math.round(interval/1000)}초 후 (정규거래시간)`);
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        interval = 360000; // 확장시간: 6분
        console.log(`⏰ 다음 무료 전용 수집: ${Math.round(interval/1000)}초 후 (확장거래시간)`);
      } else {
        interval = 1800000; // 폐장: 30분 (캐시만 확인)
        console.log(`⏰ 다음 무료 전용 수집: ${Math.round(interval/1000)}초 후 (폐장-캐시모드)`);
      }
      
      setTimeout(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 무료 전용 데이터 수집`);
        
        const results = await this.collectFreeOnlyData(symbols);
        
        schedule(); // 다음 스케줄 설정
      }, interval);
    };

    schedule();
  }

  // 일일 리셋 스케줄 (Alpha Vantage 해제용)
  scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow - now;
    
    setTimeout(() => {
      this.alphaVantageExclusion.isExcluded = false;
      this.alphaVantageExclusion.reason = '일일 리셋 완료';
      console.log(`🔄 Alpha Vantage 제외 해제 - 내일부터 다시 사용 가능`);
      console.log(`🔥 무료 전용 모드는 계속 운영`);
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
    return this.alphaVantageExclusion;
  }

  stopCollection() {
    console.log('⏹️ 무료 전용 데이터 수집 시스템 중단');
  }
}

module.exports = FreeOnlyDataProvider;
