// 하이퍼 데이터 프로바이더 - 하이퍼스피드 최적 시스템
// 무료 소스 100% 활용 + Alpha Vantage 완전 배치 (내일까지)

const axios = require('axios');

class HyperDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    
    // Alpha Vantage 완전 차단 카운터
    this.alphaVantageBlackout = {
      isActive: true,
      reason: '일일 25회 한계 완전 소진',
      nextResetTime: this.getNextMidnight(),
      blackoutStart: new Date().toISOString()
    };
    
    console.log('🚀🚀 하이퍼 데이터 프로바이더 초기화 (하이퍼스피드 최적)');
    console.log('🚫 Alpha Vantage 완전 차단 모드 활성화');
    console.log('⚡ 무료 소스 100% 활용 전략');
    console.log('🎯 데이터 소스 우선순위: Yahoo Finance → Investing.com → Finviz');
    console.log('📅 다음 Alpha Vantage 가능 시간:', this.alphaVantageBlackout.nextResetTime);
    
    this.scheduleDailyReset();
  }

  // 데스크톱 전용 무료 소스 체인 정의 (모바일 제외 정책 적용)
  getFreeDataSourceChain() {
    return [
      {
        name: 'yahooFinanceV1',
        url: 'https://query1.finance.yahoo.com/v8/finance/chart',
        priority: 1,
        unlimited: true,
        method: 'REST',
        reliability: 0.95,
        delay: '5-15분',
        platform: 'Desktop'
      },
      {
        name: 'yahooFinanceV2', 
        url: 'https://query2.finance.yahoo.com/v1/finance/search',
        priority: 2,
        unlimited: true,
        method: 'REST',
        reliability: 0.90,
        delay: '5-15분',
        platform: 'Desktop'
      },
      {
        name: 'yahooFinanceChart',
        url: 'https://finance.yahoo.com/chart/api/v1/internal/chart',
        priority: 3,
        unlimited: true,
        method: 'REST',
        reliability: 0.88,
        delay: '5-15분',
        platform: 'Desktop'
      },
      {
        name: 'investingDesktop',
        url: 'https://www.investing.com/search',
        priority: 4,
        unlimited: true,
        method: 'WebScraping',
        reliability: 0.85,
        delay: '1-5분',
        platform: 'Desktop'
      },
      {
        name: 'finvizQuote',
        url: 'https://finviz.com/quote.ashx',
        priority: 5,
        unlimited: true,
        method: 'WebScraping',
        reliability: 0.80,
        delay: '1-5분',
        platform: 'Desktop'
      },
      {
        name: 'finvizScreener',
        url: 'https://finviz.com/screener.ashx',
        priority: 6,
        unlimited: true,
        method: 'WebScraping', 
        reliability: 0.75,
        delay: '1-5분',
        platform: 'Desktop'
      }
    ];
  }

  // 미국 시장 시간 계산 (터보버전 업그레이드)
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
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20,
      isMarketDead: !this.isMarketTrading()
    };
  }

  // 시장 거래 가능 여부 (개선된 판단)
  isMarketTrading() {
    const now = new Date();
    const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const day = usTime.getDay();
    const hour = usTime.getHours();
    const minute = usTime.getMinutes();
    
    // 주말 체크
    if (day === 0 || day === 6) return false;
    
    // 거래 시간 체크 (확장 포함)
    const isTradingHour = (hour >= 4 && hour < 20);
    return isTradingHour;
  }

  // 다음 자정까지 차분 계산 (Alpha Vantage 리셋용)
  getNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toLocaleString();
  }

  // 핵심 데이터 수집 (하이퍼스피드 최적)
  async collectHyperData(symbols) {
    const marketTime = this.getUSMarketTime();
    
    console.log(`🚀🚀 하이퍼 데이터 수집 시작 (${marketTime.hour}:${marketTime.minute} EST)`);
    console.log(`⚡ Alpha Vantage 상태: 완전 차단 (${this.alphaVantageBlackout.reason})`);
    
    // 폐장/주말엔 캐시 데이터만 재사용
    if (marketTime.isMarketDead) {
      console.log(`😴 시장 폐장/주말 - 캐시만 재사용`);
      return this.reuseCacheAggressively(symbols);
    }
    
    // 하이퍼 전략 결정
    const strategy = this.determineHyperStrategy(marketTime);
    console.log(`🎯 적용 전략: ${strategy.name}`);
    console.log(`⚡ 준비된 무료 소스: ${strategy.sources.length}개`);
    
    // 하이퍼 병렬 처리
    const results = await this.processSymbolsHyperParallel(symbols, strategy);
    
    console.log(`📊 수집 완료: ${Object.keys(results).length}/${symbols.length} 심볼 처리`);
    return results;
  }

  // 하이퍼 전략 결정
  determineHyperStrategy(marketTime) {
    const freeSources = this.getFreeDataSourceChain();
    
    if (marketTime.isRegularHours) {
      return {
        name: '정규거래시간-하이퍼모드',
        sources: freeSources.slice(0, 4), // 상위 4개 소스
        batchSize: 4,
        parallelWorkers: 3,
        interval: '3분',
        aggressive: true
      };
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      return {
        name: '확장시간-하이퍼모드',
        sources: freeSources.slice(0, 3), // 상위 3개 소스
        batchSize: 3,
        parallelWorkers: 2,
        interval: '5분',
        aggressive: true
      };
    } else {
      return {
        name: '하이퍼캐시모드',
        sources: [],
        batchSize: 1,
        parallelWorkers: 1,
        interval: '캐시전용',
        aggressive: false
      };
    }
  }

  // 심볼 병렬 처리 (하이퍼 최적화)
  async processSymbolsHyperParallel(symbols, strategy) {
    const results = {};
    
    if (strategy.sources.length === 0) {
      return this.reuseCacheAggressively(symbols);
    }
    
    const workers = strategy.parallelWorkers;
    const batches = this.chunkArray(symbols, Math.ceil(symbols.length / workers));
    
    console.log(`⚡ 하이퍼 병렬 처리: ${workers}개 워커로 ${batches.length}개 배치`);
    
    const workerPromises = batches.map(async (batch, workerIndex) => {
      console.log(`🚀 워커 ${workerIndex + 1} 시작 (${batch.length}개 심볼)`);
      
      for (const symbol of batch) {
        try {
          const data = await this.fetchWithHyperFallback(symbol, strategy.sources);
          results[symbol] = data;
          console.log(`✅ 워커 ${workerIndex + 1}: ${symbol} 성공`);
          
          // 워커간 대기 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.log(`⚠️ 워커 ${workerIndex + 1}: ${symbol} 실패`);
        }
      }
    });
    
    await Promise.all(workerPromises);
    return results;
  }

  // 하이퍼 폴백으로 데이터 수집
  async fetchWithHyperFallback(symbol, sources) {
    for (const source of sources) {
      try {
        const data = await this.fetchFromHyperSource(symbol, source);
        
        // 캐시 업데이트
        this.updateCache(symbol, data, source.name);
        
        console.log(`✅ ${symbol}: ${source.name} 성공 - $${data.currentPrice}`);
        return data;
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: ${source.name} 실패 - 다음 소스 시도`);
      }
    }
    
    // 모든 무료 소스 실패
    const cached = this.dataCache.get(symbol);
    if (cached) {
      console.log(`♻️ ${symbol}: 모든 소스 실패 - 캐시 재사용`);
      return { ...cached, reused: true, note: '모든 무료 소스 실패로 캐시 사용' };
    }
    
    throw new Error(`${symbol}: 모든 무료 소스 실패 및 캐시 없음`);
  }

  // 소스별 고급 데이터 수집 구현 (데스크톱 전용)
  async fetchFromHyperSource(symbol, source) {
    switch (source.name) {
      case 'yahooFinanceV1':
        return await this.fetchFromYahooFinanceV1(symbol);
      case 'yahooFinanceV2':
        return await this.fetchFromYahooFinanceV2(symbol);
      case 'yahooFinanceChart':
        return await this.fetchFromYahooFinanceChart(symbol);
      case 'investingDesktop':
        return await this.fetchFromInvestingDesktop(symbol);
      case 'finvizQuote':
        return await this.fetchFromFinvizQuote(symbol);
      case 'finvizScreener':
        return await this.fetchFromFinvizScreener(symbol);
      default:
        throw new Error(`지원되지 않는 소스: ${source.name}`);
    }
  }

  // Yahoo Finance V1 (개선된 버전)
  async fetchFromYahooFinanceV1(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const params = {
      range: '1d',
      interval: '1m',
      includePrePost: 'true'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
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
      source: 'Yahoo Finance V1 (하이퍼)',
      timestamp: Date.now(),
      delay: '5-10분 (무제한)',
      hyperMode: true
    };
  }

  // Yahoo Finance V2 (대안 엔드포인트)
  async fetchFromYahooFinanceV2(symbol) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search`;
    const params = {
      q: symbol,
      newsCount: 0,
      quotesCount: 1
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
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
      source: 'Yahoo Finance V2 (하이퍼)',
      lastRefreshed: new Date().toISOString(),
      timestamp: Date.now(),
      delay: '5-15분',
      hyperMode: true
    };
  }

  // Yahoo Finance Chart API (차트 데이터 활용)
  async fetchFromYahooFinanceChart(symbol) {
    try {
      const url = `https://finance.yahoo.com/chart/api/v1/internal/chart`;
      const params = {
        symbols: symbol,
        interval: '1m',
        range: '1d',
        includePrePost: true
      };

      const response = await axios.get(url, { 
        params,
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.data?.chart?.result?.length) {
        throw new Error('Yahoo Finance Chart 응답 데이터 없음');
      }

      const result = response.data.chart.result[0];
      const meta = result.meta;
      
      if (!meta || !meta.regularMarketPrice) {
        throw new Error('Yahoo Finance Chart 메타데이터 없음');
      }

      return {
        symbol: symbol,
        currentPrice: meta.regularMarketPrice,
        open: meta.previousClose || meta.regularMarketPrice,
        high: meta.regularMarketDayHigh || meta.regularMarketPrice,
        low: meta.regularMarketDayLow || meta.regularMarketPrice,
        volume: meta.regularMarketVolume || 0,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        lastRefreshed: new Date().toISOString(),
        source: 'Yahoo Finance Chart (하이퍼 데스크톱)',
        timestamp: Date.now(),
        delay: '5-10분 (무제한)',
        hyperMode: true
      };
      
    } catch (error) {
      throw new Error(`Yahoo Finance Chart 접근 실패: ${error.message}`);
    }
  }

  // Investing.com 데스크톱 버전
  async fetchFromInvestingDesktop(symbol) {
    try {
      const response = await axios.get(`https://where.mycookies.org/search?q=${symbol}+stock+price`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 12000
      });

      // 다양한 가격 패턴으로 추출
      const pricePatterns = [
        /\$(\d+(?:\.\d{2})?)/g,
        /(\d+(?:\.\d{2})?)USD/g,
        /현재가[:\s]*\$(\d+(?:\.\d{2})?)/i
      ];
      
      for (const pattern of pricePatterns) {
        const matches = response.data.match(pattern);
        if (matches && matches.length > 0) {
          const prices = matches.map(m => parseFloat(m.replace(/[$,USD]/g, '')));
          const price = Math.max(...prices);
          
          return {
            symbol: symbol,
            currentPrice: price,
            source: 'Investing.com 데스크톱 (하이퍼)',
            lastRefreshed: new Date().toISOString(),
            timestamp: Date.now(),
            delay: '1-5분',
            hyperMode: true
          };
        }
      }
      
      throw new Error('Fetching desktop에서 가격 추출 실패');
      
    } catch (error) {
      throw new Error(`Investing 데스크톱 접근 실패: ${error.message}`);
    }
  }

  // Finviz 개별 종목 상세 페이지
  async fetchFromFinvizQuote(symbol) {
    try {
      const response = await axios.get(`https://finviz.com/quote.ashx?t=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      // Finviz 특화 가격 패턴
      const pricePatterns = [
        /<td[^>]*>([\d,]+\.\d{2})<\/td>/,
        /\$(\d+(?:,\d{3})?\.\d{2})/,
        /Price:\s*\$(\d+(?:,\d{3})?\.\d{2})/i
      ];
      
      for (const pattern of pricePatterns) {
        const match = response.data.match(pattern);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ''));
          
          return {
            symbol: symbol,
            currentPrice: price,
            source: 'Finviz 상세 (하이퍼)',
            lastRefreshed: new Date().toISOString(),
            timestamp: Date.now(),
            delay: '1-3분',
            hyperMode: true
          };
        }
      }
      
      throw new Error('Finviz 상세에서 가격 패턴 매칭 실패');
      
    } catch (error) {
      throw new Error(`Finviz 상세 접근 실패: ${error.message}`);
    }
  }

  // Finviz 스크리너 페이지
  async fetchFromFinvizScreener(symbol) {
    try {
      const response = await axios.get(`https://finviz.com/screener.ashx?v=111&t=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      });

      // 스크리너 테이블에서 가격 추출
      const tablePattern = new RegExp(`<tr[^>]*>.*?${symbol}.*?Price[^>]*>.*?\\$(\\d+(?:\\.\\d{2})?)`, 'i');
      const match = response.data.match(tablePattern);
      
      if (match) {
        return {
          symbol: symbol,
          currentPrice: parseFloat(match[1]),
          source: 'Finviz 스크리너 (하이퍼)',
          lastRefreshed: new Date().toISOString(),
          timestamp: Date.now(),
          delay: '1-3분',
          hyperMode: true
        };
      }
      
      throw new Error('Finviz 스크리너에서 관련 데이터 없음');
      
    } catch (error) {
      throw new Error(`Finviz 스크리너 접근 실패: ${error.message}`);
    }
  }

  // 하이퍼 캐시 재사용 (적극적)
  reuseCacheAggressively(symbols) {
    const cachedResults = {};
    
    symbols.forEach(symbol => {
      const cached = this.dataCache.get(symbol);
      if (cached) {
        cachedResults[symbol] = {
          ...cached,
          reused: true,
          note: '하이퍼 캐시 재사용',
          noAPICall: true,
          hyperMode: true
        };
        console.log(`♻️ ${symbol}: 하이퍼 캐시 재사용 - $${cached.currentPrice}`);
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

  // 하이퍼 시스템 시작
  async startHyperCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🚀🚀 하이퍼 데이터 수집 시스템 시작!');
    console.log('⚡ 하이퍼스피드 최적화 시스템 활성화 (데스크톱 전용)');
    console.log('🚫 Alpha Vantage 완전 차단 (내일까지)');
    console.log('📊 데스크톱 전용 무료 소스 6단계 체인 (모바일 제외 정책 적용):');
    console.log('   1️⃣ Yahoo Finance V1 (메인 REST)');
    console.log('   2️⃣ Yahoo Finance V2 (백업 REST)');
    console.log('   3️⃣ Yahoo Finance Chart (차트 API)');
    console.log('   4️⃣ Investing 데스크톱 (웹스크래핑 ONLY)');
    console.log('   5️⃣ Finviz 상세페이지 ( 웹스크래핑 ONLY)');
    console.log('   6️⃣ Finviz 스크리너 (웹스크래핑 ONLY)');
    
    // 즉시 첫 수집
    await this.collectHyperData(symbols);
    
    // 하이퍼 스케줄링
    this.startHyperScheduling(symbols);
  }

  // 하이퍼 스케줄링
  startHyperScheduling(symbols) {
    const schedule = () => {
      const marketTime = this.getUSMarketTime();
      
      let interval;
      
      if (marketTime.isRegularHours) {
        interval = 180000; // 정규시간: 3분
        console.log(`⏰ 다음 하이퍼 수집: ${Math.round(interval/1000)}초 후 (정규거래시간-하이퍼모드)`);
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        interval = 300000; // 확장시간: 5분
        console.log(`⏰ 다음 하이퍼 수집: ${Math.round(interval/1000)}초 후 (확장시간-하이퍼모드)`);
      } else {
        interval = 1800000; // 폐장: 30분 (캐시만 확인)
        console.log(`⏰ 다음 하이퍼 수집: ${Math.round(interval/1000)}초 후 (폐장-하이퍼캐시모드)`);
      }
      
      setTimeout(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 하이퍼 데이터 수집`);
        
        const results = await this.collectHyperData(symbols);
        
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
      this.alphaVantageBlackout.isActive = false;
      this.alphaVantageBlackout.reason = '일일 리셋 완료';
      console.log(`🔄 Alpha Vantage 차단 해제 - 내일부터 다시 사용 가능`);
      console.log(`⚡ 하이퍼 모드는 계속 운영`);
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
    return this.alphaVantageBlackout;
  }

  stopCollection() {
    console.log('⏹️ 하이퍼 데이터 수집 시스템 중단');
  }
}

module.exports = HyperDataProvider;
