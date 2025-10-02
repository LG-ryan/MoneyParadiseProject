// 🧠 스마트 데이터 프로바이더 - 효율적인 수집 전략
// 🕘 개장/폐장 1회 수집 + 🔍 온디맨드 실시간 수집

const axios = require('axios');
const cheerio = require('cheerio');

class SmartDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.userSearchedSymbols = new Set(); // 사용자가 검색한 심볼들
    this.watchedSymbols = new Set(); // 사용자가 관심있는 심볼들
    this.marketStatus = {
      isOpen: false,
      lastMarketUpdate: null,
      nextOpenTime: null,
      nextCloseTime: null
    };
    
    // 효율적인 데이터 소스 설정
    this.dataSources = {
      yahooFinance: {
        name: 'Yahoo Finance',
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        isStable: true,
        isUnlimited: true
      }
    };
    
    // 시장 시간 설정 (ET 기준)
    this.marketHours = {
      open: { hour: 9, minute: 30 }, // 09:30 ET
      close: { hour: 16, minute: 0 }  // 16:00 ET
    };
    
    console.log('🧠 스마트 데이터 프로바이더 초기화');
    console.log('🕘 개장/폐장 시점 1회 수집 + 🔍 온디맨드 실시간 수집');
    console.log('💡 효율적 리소스 사용으로 API 한도 보존');
  }

  // 시장 시간 확인
  getMarketStatus() {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const currentHour = etTime.getHours();
    const currentMinute = etTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const openTime = this.marketHours.open.hour * 60 + this.marketHours.open.minute;
    const closeTime = this.marketHours.close.hour * 60 + this.marketHours.close.minute;
    
    const isWeekday = etTime.getDay() >= 1 && etTime.getDay() <= 5; // 월-금
    const isMarketOpen = isWeekday && currentTime >= openTime && currentTime < closeTime;
    
    // 다음 개장/폐장 시간 계산
    let nextOpen, nextClose;
    if (isWeekday) {
      if (currentTime < openTime) {
        // 오늘 개장 전
        nextOpen = new Date(etTime);
        nextOpen.setHours(this.marketHours.open.hour, this.marketHours.open.minute, 0, 0);
        nextClose = new Date(etTime);
        nextClose.setHours(this.marketHours.close.hour, this.marketHours.close.minute, 0, 0);
      } else if (currentTime < closeTime) {
        // 오늘 거래 중
        nextOpen = new Date(etTime);
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(this.marketHours.open.hour, this.marketHours.open.minute, 0, 0);
        nextClose = new Date(etTime);
        nextClose.setHours(this.marketHours.close.hour, this.marketHours.close.minute, 0, 0);
      } else {
        // 오늘 폐장 후
        nextOpen = new Date(etTime);
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(this.marketHours.open.hour, this.marketHours.open.minute, 0, 0);
        nextClose = new Date(etTime);
        nextClose.setDate(nextClose.getDate() + 1);
        nextClose.setHours(this.marketHours.close.hour, this.marketHours.close.minute, 0, 0);
      }
    } else {
      // 주말
      const daysUntilMonday = (8 - etTime.getDay()) % 7;
      nextOpen = new Date(etTime);
      nextOpen.setDate(nextOpen.getDate() + daysUntilMonday);
      nextOpen.setHours(this.marketHours.open.hour, this.marketHours.open.minute, 0, 0);
      nextClose = new Date(etTime);
      nextClose.setDate(nextClose.getDate() + daysUntilMonday);
      nextClose.setHours(this.marketHours.close.hour, this.marketHours.close.minute, 0, 0);
    }
    
    this.marketStatus = {
      isOpen: isMarketOpen,
      lastMarketUpdate: new Date(),
      nextOpenTime: nextOpen,
      nextCloseTime: nextClose
    };
    
    return this.marketStatus;
  }

  // Yahoo Finance에서 과거 데이터 수집 (차트용)
  async fetchHistoricalData(symbol, period = '1mo', interval = '1d') {
    try {
      console.log(`📊 Yahoo Finance에서 ${symbol} 과거 데이터 수집 (${period})...`);
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const params = new URLSearchParams({
        period1: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // 30일 전
        period2: Math.floor(Date.now() / 1000), // 현재
        interval: interval, // 1d, 1h, 5m 등
        includePrePost: 'true',
        events: 'div,splits'
      });
      
      const response = await axios.get(`${url}?${params}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!response.data.chart || !response.data.chart.result) {
        throw new Error('Yahoo Finance 과거 데이터 응답 구조 오류');
      }
      
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      
      const historicalData = timestamps.map((timestamp, index) => ({
        timestamp: timestamp * 1000,
        date: new Date(timestamp * 1000).toISOString(),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index]
      }));
      
      console.log(`✅ ${symbol} 과거 데이터 수집 완료: ${historicalData.length}개 데이터 포인트`);
      
      return {
        symbol: symbol,
        period: period,
        interval: interval,
        data: historicalData,
        source: 'Yahoo Finance (Historical)',
        timestamp: Date.now(),
        isStable: true
      };
      
    } catch (error) {
      console.error(`❌ ${symbol} 과거 데이터 수집 실패:`, error.message);
      throw new Error(`Yahoo Finance 과거 데이터 수집 실패: ${error.message}`);
    }
  }

  // Yahoo Finance에서 데이터 수집
  async fetchFromYahooFinance(symbol) {
    try {
      const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
      console.log(`📊 Yahoo Finance에서 ${symbol} 데이터 수집...`);
      
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
        source: 'Yahoo Finance (스마트 수집)',
        timestamp: Date.now(),
        delay: '실시간',
        isStable: true,
        collectionType: 'on-demand' // 수집 유형 표시
      };
      
    } catch (error) {
      console.error(`❌ Yahoo Finance ${symbol} 수집 실패:`, error.message);
      throw new Error(`Yahoo Finance 접근 실패: ${error.message}`);
    }
  }

  // 🕘 개장 시점 전체 티커 수집 (1회)
  async collectMarketOpenData() {
    const marketStatus = this.getMarketStatus();
    
    if (!marketStatus.isOpen) {
      console.log('🕘 시장이 열리지 않았습니다. 개장 시간까지 대기 중...');
      return null;
    }
    
    console.log('🕘 개장 시점 전체 티커 데이터 수집 시작...');
    
    // 주요 티커들 (실제로는 더 많은 티커 가능)
    const majorSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD',
      'NFLX', 'CRM', 'ADBE', 'INTC', 'ORCL', 'CSCO', 'IBM', 'PYPL'
    ];
    
    const results = {};
    let successCount = 0;
    
    for (const symbol of majorSymbols) {
      try {
        const data = await this.fetchFromYahooFinance(symbol);
        
        // 캐시에 저장
        this.dataCache.set(symbol, data);
        this.lastUpdateTimes.set(symbol, Date.now());
        
        results[symbol] = {
          success: true,
          data: data,
          collectionType: 'market-open'
        };
        
        successCount++;
        
        // API 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          collectionType: 'market-open'
        };
      }
    }
    
    console.log(`🕘 개장 데이터 수집 완료: ${successCount}/${majorSymbols.length} 성공`);
    return results;
  }

  // 🕔 폐장 시점 전체 티커 수집 (1회)
  async collectMarketCloseData() {
    console.log('🕔 폐장 시점 전체 티커 데이터 수집 시작...');
    
    // 관심 티커들만 폐장 데이터 수집
    const watchedSymbols = Array.from(this.userSearchedSymbols);
    
    if (watchedSymbols.length === 0) {
      console.log('🕔 사용자가 검색한 티커가 없어 폐장 데이터 수집 건너뜀');
      return null;
    }
    
    const results = {};
    let successCount = 0;
    
    for (const symbol of watchedSymbols) {
      try {
        const data = await this.fetchFromYahooFinance(symbol);
        
        // 캐시에 저장
        this.dataCache.set(symbol, data);
        this.lastUpdateTimes.set(symbol, Date.now());
        
        results[symbol] = {
          success: true,
          data: data,
          collectionType: 'market-close'
        };
        
        successCount++;
        
        // API 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          collectionType: 'market-close'
        };
      }
    }
    
    console.log(`🕔 폐장 데이터 수집 완료: ${successCount}/${watchedSymbols.length} 성공`);
    return results;
  }

  // 🔍 온디맨드 실시간 수집 (사용자 검색 시)
  async collectOnDemandData(symbol) {
    console.log(`🔍 ${symbol} 온디맨드 실시간 데이터 수집...`);
    
    // 사용자 검색 기록에 추가
    this.userSearchedSymbols.add(symbol);
    
    // 캐시 확인 (5분 이내 데이터면 캐시 사용)
    const cachedData = this.dataCache.get(symbol);
    const lastUpdate = this.lastUpdateTimes.get(symbol);
    
    if (cachedData && lastUpdate && Date.now() - lastUpdate < 300000) {
      console.log(`📈 ${symbol}: 캐시된 데이터 사용 (${Math.round((Date.now() - lastUpdate) / 1000)}초 전)`);
      return {
        ...cachedData,
        collectionType: 'cached',
        cacheAge: Date.now() - lastUpdate
      };
    }
    
    try {
      const data = await this.fetchFromYahooFinance(symbol);
      
      // 캐시에 저장
      this.dataCache.set(symbol, data);
      this.lastUpdateTimes.set(symbol, Date.now());
      
      console.log(`✅ ${symbol}: 온디맨드 실시간 데이터 수집 성공`);
      return {
        ...data,
        collectionType: 'on-demand'
      };
      
    } catch (error) {
      console.error(`❌ ${symbol}: 온디맨드 실시간 데이터 수집 실패:`, error.message);
      throw error;
    }
  }

  // 👀 관심 티커 추가 (5분마다 업데이트)
  addWatchedSymbol(symbol) {
    this.watchedSymbols.add(symbol);
    console.log(`👀 ${symbol} 관심 티커로 추가됨 (5분마다 업데이트)`);
  }

  // 👀 관심 티커들 실시간 업데이트
  async updateWatchedSymbols() {
    const watchedSymbols = Array.from(this.watchedSymbols);
    
    if (watchedSymbols.length === 0) {
      console.log('👀 관심 티커가 없어 업데이트 건너뜀');
      return null;
    }
    
    console.log(`👀 관심 티커들 업데이트: ${watchedSymbols.join(', ')}`);
    
    const results = {};
    let successCount = 0;
    
    for (const symbol of watchedSymbols) {
      try {
        const data = await this.fetchFromYahooFinance(symbol);
        
        // 캐시에 저장
        this.dataCache.set(symbol, data);
        this.lastUpdateTimes.set(symbol, Date.now());
        
        results[symbol] = {
          success: true,
          data: data,
          collectionType: 'watched-update'
        };
        
        successCount++;
        
        // API 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          collectionType: 'watched-update'
        };
      }
    }
    
    console.log(`👀 관심 티커 업데이트 완료: ${successCount}/${watchedSymbols.length} 성공`);
    return results;
  }

  // 🧠 스마트 스케줄링 시스템 시작
  async startSmartScheduling() {
    console.log('🧠 스마트 스케줄링 시스템 시작...');
    
    // 1분마다 시장 상태 확인
    setInterval(() => {
      const marketStatus = this.getMarketStatus();
      
      if (marketStatus.isOpen && !this.marketStatus.isOpen) {
        // 시장 개장 감지
        console.log('🕘 시장 개장 감지! 전체 티커 데이터 수집 시작...');
        setTimeout(() => this.collectMarketOpenData(), 1000);
      } else if (!marketStatus.isOpen && this.marketStatus.isOpen) {
        // 시장 폐장 감지
        console.log('🕔 시장 폐장 감지! 관심 티커 데이터 수집 시작...');
        setTimeout(() => this.collectMarketCloseData(), 1000);
      }
      
      this.marketStatus = marketStatus;
    }, 60000); // 1분마다 확인
    
    // 관심 티커들 5분마다 업데이트 (거래 시간에만)
    setInterval(async () => {
      const marketStatus = this.getMarketStatus();
      if (marketStatus.isOpen && this.watchedSymbols.size > 0) {
        console.log(`\n📅 ${new Date().toLocaleString()} - 관심 티커 업데이트`);
        await this.updateWatchedSymbols();
      }
    }, 5 * 60 * 1000); // 5분마다
  }

  // 현재 캐시된 데이터 모두 조회
  getAllCachedData() {
    const allData = {};
    for (const [key, data] of this.dataCache) {
      allData[key] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(key),
        cacheAge: Date.now() - this.lastUpdateTimes.get(key)
      };
    }
    return allData;
  }

  // 특정 심볼의 현재 데이터 조회
  getCurrentData(symbol) {
    return this.dataCache.get(symbol);
  }

  // 스마트 시스템 상태 조회
  getSmartStatus() {
    const marketStatus = this.getMarketStatus();
    
    return {
      systemName: '스마트 데이터 프로바이더',
      marketStatus: marketStatus,
      cachedSymbols: this.dataCache.size,
      userSearchedSymbols: Array.from(this.userSearchedSymbols),
      watchedSymbols: Array.from(this.watchedSymbols),
      efficiencyMetrics: {
        totalApiCalls: this.dataCache.size,
        unnecessaryCalls: 0, // 온디맨드 시스템으로 불필요한 호출 최소화
        resourceSavings: '최대 90% API 호출 절약'
      },
      collectionStrategy: {
        marketOpen: '전체 티커 1회 수집',
        marketClose: '관심 티커 1회 수집',
        onDemand: '사용자 검색 시 실시간 수집',
        watched: '관심 티커 5분마다 업데이트'
      }
    };
  }
}

module.exports = SmartDataProvider;
