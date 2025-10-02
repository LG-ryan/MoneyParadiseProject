// 데이터가 가장 중요한 MoneyParadise 최종 솔루션
// API 제한 25회/일을 고려한 최적화된 시스템

const axios = require('axios');

class UltimateDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    
    // 실제 Alpha Vantage 제한 확인됨: 25회/일
    this.alphaVantageUsage = {
      dailyLimit: 25,
      usedToday: 0,
      lastReset: new Date().toDateString(),
      blackout: false // 제한 도달시 사용 금지
    };
    
    // 우선순위별 데이터 소스 전략
    this.dataStrategies = {
      // Yahoo Finance (무제한) - 주 소스
      primary: {
        source: 'yahooFinance',
        reliability: 0.9,
        free: true,
        unlimited: true,
        priority: 1
      },
      
      // Investing.com 스크래핑 - 백업 1순위  
      backup1: {
        source: 'investing',
        reliability: 0.85,
        free: true,
        unlimited: true,
        priority: 2,
        scraping: true
      },
      
      // Finviz 스크래핑 - 백업 2순위
      backup2: {
        source: 'finviz',
        reliability: 0.8,
        free: true,
        unlimited: true,
        priority: 3,
        scraping: true
      },
      
      // Alpha Vantage - 마지막 옵션 (25회/일 제한)
      last: {
        source: 'alphaVantage',
        reliability: 0.9,
        free: true,
        limited: true,
        priority: 4,
        dailyLimit: 25,
        apiKey: 'YCN5UGRTXB1ZF74P'
      }
    };
    
    // 하루 카운터 리셋 스케줄
    this.scheduleDailyReset();
    
    console.log('🚀 최종 솔루션: 데이터 우선 전력 보존 전략');
    console.log('📊 Alpha Vantage 제한: 25회/일 (실제 확인됨)');
    console.log('🛡️ 무제한 소스 우선 활용 전략');
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
      this.alphaVantageUsage.blackout = false;
      this.alphaVantageUsage.lastReset = new Date().toDateString();
      console.log(`🔄 Alpha Vantage 카운터 리셋 완료 - 오늘 처음부터 다시 시작`);
      this.scheduleDailyReset(); // 다음 날 리셋도 설정
    }, msUntilReset);

    console.log(`⏰ Alpha Vantage 리셋 예약: ${tomorrow.toLocaleString()}`);
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
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20,
      weekDay: usTime.toLocaleString('en-US', { weekday: 'long' })
    };
  }

  // 마지막 폐장 시간 계산 (현재 시간 기준)
  getLastMarketClose() {
    const usTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const marketTime = new Date(usTime);
    
    // 오늘이 거래일이고 오후 4시 이후라면 오늘 4시
    if (marketTime.getDay() >= 1 && marketTime.getDay() <= 5 && marketTime.getHours() >= 16) {
      marketTime.setHours(16, 0, 0, 0); // 오늘 오후 4시
      return marketTime;
    }
    
    // 그렇지 않다면 직전 거래일 오후 4시 계산
    const lastClose = new Date(marketTime);
    
    // 금요일까지 역산해서 마지막 거래일 찾기
    let daysBack = 1;
    if (marketTime.getDay() === 0) { // 일요일
      daysBack = 3; // 금요일까지
    } else if (marketTime.getDay() === 6) { // 토요일  
      daysBack = 2; // 금요일까지
    } else if (marketTime.getDay() === 1) { // 월요일
      daysBack = 4; // 지난 금요일까지
    }
    
    lastClose.setDate(lastClose.getDate() - daysBack);
    lastClose.setHours(16, 0, 0, 0); // 직전 거래일 오후 4시
    
    return lastClose;
  }

  // Alpha Vantage 사용 가능 여부 (극도로 보수적 - 개장 시간 집중)
  canUseAlphaVantage() {
    const today = new Date().toDateString();
    const marketTime = this.getUSMarketTime();
    
    // 날짜가 바뀌었다면 카운터 리셋
    if (this.alphaVantageUsage.lastReset !== today) {
      this.alphaVantageUsage.usedToday = 0;
      this.alphaVantageUsage.blackout = false;
      this.alphaVantageUsage.lastReset = today;
    }
    
    const usagePercent = this.alphaVantageUsage.usedToday / this.alphaVantageUsage.dailyLimit;
    const remaining = this.alphaVantageUsage.dailyLimit - this.alphaVantageUsage.usedToday;
    
    // 개장 시간 집중 전략: 중요한 거래 시간에만 사용
    let conservativeLimit;
    
    if (marketTime.isRegularHours) {
      // 정규 거래시간(9:30-16:00) - 6.5시간 동안 매우 절약
      // 총 방송시간에 걸쳐 균등 분배하여 하루 종일 안정적인 데이터 확보
      conservativeLimit = Math.floor(this.alphaVantageUsage.dailyLimit * 0.6); // 15회 (60%)
    } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
      // 확장 시간 - 매우 보수적 (새벽/저녁시간)
      conservativeLimit = Math.floor(this.alphaVantageUsage.dailyLimit * 0.4); // 10회 (40%)
    } else {
      // 폐장/주말 - 사용 안함
      conservativeLimit = Math.floor(this.alphaVantageUsage.dailyLimit * 0.2); // 5회 (20%)
    }
    
    return {
      canUse: this.alphaVantageUsage.usedToday < conservativeLimit && !this.alphaVantageUsage.blackout,
      usagePercent: usagePercent,
      remaining: remaining,
      conservativeRemaining: conservativeLimit - this.alphaVantageUsage.usedToday,
      status: usagePercent > 0.6 ? '위험' : usagePercent > 0.4 ? '주의' : '안전',
      todayUsage: this.alphaVantageUsage.usedToday,
      totalLimit: this.alphaVantageUsage.dailyLimit,
      blackout: this.alphaVantageUsage.blackout,
      focusStrategy: marketTime.isRegularHours ? '정규거래시간 집중' : '절약 모드'
    };
  }

  // 최적 데이터 수집 전략
  async collectUltimateData(symbols) {
    const marketTime = this.getUSMarketTime();
    const alphaStatus = this.canUseAlphaVantage();
    
    console.log(`🚀 최종 데이터 수집 전략 실행 (${marketTime.hour}:${marketTime.minute} EST)`);
    console.log(`📅 ${marketTime.weekDay}, ${marketTime.isTradingDay ? '거래일' : '비거래일'}`);
    console.log(`⏰ 거래시간: ${marketTime.isRegularHours ? '정규' : marketTime.isPreMarket ? '프리마킷' : marketTime.isAfterMarket ? '애프터마킷' : '폐장'}`);
    console.log(`🟢 Alpha Vantage 상태: ${alphaStatus.status} (${alphaStatus.remaining}회 남음, ${alphaStatus.todayUsage}/${alphaStatus.totalLimit} 사용)`);

    // 거래시간이 아닌 경우 마지막 데이터 재사용 (추가 API 호출 없음)
    if (!marketTime.isTradingDay || marketTime.isMarketClosed) {
      console.log(`😴 폐장/주말 - 마지막 폐장 데이터 재사용 (API 호출 금지)`);
      const cachedResults = {};
      
      symbols.forEach(symbol => {
        const cached = this.dataCache.get(symbol);
        if (cached) {
          // 캐시된 데이터가 폐장 이후 데이터인지 확인
          const cachedTime = new Date(cached.lastRefreshed);
          const now = new Date();
          
          // 캐시된 데이터가 폐장 시간 이후라면 추가 업데이트 불필요
          if (cachedTime >= this.getLastMarketClose()) {
            cachedResults[symbol] = {
              ...cached,
              reused: true,
              note: '폐장 후 데이터 - 업데이트 불필요',
              noAPICall: true
            };
            console.log(`♻️ ${symbol}: 폐장 데이터 재사용 - $${cached.currentPrice} (추가 호출 안함)`);
          } else {
            // 너무 오래된 캐시라면 업데이트 필요
            cachedResults[symbol] = cached;
            console.log(`🔄 ${symbol}: 오래된 캐시 - 업데이트 필요`);
          }
        } else {
          console.log(`❓ ${symbol}: 캐시 없음 - 폐장시간이지만 첫 호출 필요`);
        }
      });
      
      return cachedResults;
    }

    // 무제한 소스 우선 전략
    const strategy = this.determineOptimalStrategy(marketTime, alphaStatus);
    console.log(`🎯 적용 전략: ${strategy.description}`);

    // 우선순위 큐 설정
    const priorityQueue = this.buildPriorityQueue(symbols, strategy, marketTime);
    console.log(`📊 우선순위 큐 처리: ${priorityQueue.length}개 심볼`);

    // 배치 처리로 최적화
    const results = await this.processPriorityQueue(priorityQueue, strategy);
    
    // 결과 요약
    const successCount = Object.values(results).filter(r => !r.error).length;
    console.log(`📈 최종 결과: ${successCount}/${symbols.length} 성공 (${Math.round(successCount/symbols.length*100)}%)`);
    console.log(`⚡ Alpha Vantage 사용량: ${alphaStatus.todayUsage} → ${this.alphaVantageUsage.usedToday}회`);
    
    return results;
  }

  // 최적 전략 결정
  determineOptimalStrategy(marketTime, alphaStatus) {
    const isActiveMarketTime = marketTime.isRegularHours;
    const alphaAvailable = alphaStatus.canUse;
    
    if (isActiveMarketTime && alphaAvailable) {
      return {
        description: '정규 거래시간 + Alpha Vantage 신중 사용',
        useAlphaVantage: true,
        batchSize: 3, // 정규시간에는 3개씩
        checkFrequency: 'high',
        primarySource: 'yahooFinance',
        fallbackChain: ['yahooFinance', 'investing', 'finviz', 'alphaVantage']
      };
    } else if (isActiveMarketTime && !alphaAvailable) {
      return {
        description: '정규 거래시간 + 무제한 소스만 사용',
        useAlphaVantage: false,
        batchSize: 4, // Alpha Vantage 없으면 더 많은 배치
        checkFrequency: 'very-high',
        primarySource: 'yahooFinance',
        fallbackChain: ['yahooFinance', 'investing', 'finviz']
      };
    } else if (!isActiveMarketTime && alphaAvailable) {
      return {
        description: '확장시간 + Alpha Vantage 희귀 사용',
        useAlphaVantage: true,
        batchSize: 2,
        checkFrequency: 'medium',
        primarySource: 'yahooFinance',
        fallbackChain: ['yahooFinance', 'investing']
      };
    } else {
      return {
        description: '확장시간 + Alpha Vantage 보존',
        useAlphaVantage: false,
        batchSize: 3,
        checkFrequency: 'low',
        primarySource: 'yahooFinance',
        fallbackChain: ['yahooFinance', 'investing']
      };
    }
  }

  // 우선순위 큐 구축
  buildPriorityQueue(symbols, strategy, marketTime) {
    const queue = [];
    
    symbols.forEach(symbol => {
      let priority = 50; // 기본 우선순위
      
      // 거래시간에 따른 우선순위 조정
      if (marketTime.isRegularHours) {
        priority += 30;
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        priority += 10;
      }
      
      // 중요도별 우선순위 (TSLA, NVDA 등 기술주 우선)
      const importanceBonus = {
        'AAPL': 25, 'MSFT': 25, 'GOOGL': 20, 'AMZN': 20,
        'TSLA': 30, 'NVDA': 30, 'META': 25, 'AMD': 25
      };
      priority += importanceBonus[symbol] || 15;
      
      queue.push({ symbol, priority });
    });
    
    // 우선순위 순으로 정렬
    return queue.sort((a, b) => b.priority - a.priority);
  }

  // 우선순위 큐 처리
  async processPriorityQueue(queue, strategy) {
    const results = {};
    const batchSize = strategy.batchSize;
    
    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);
      
      console.log(`⏳ 배치 ${Math.floor(i/batchSize)+1}/${Math.ceil(queue.length/batchSize)} 처리중...`);
      
      // 첫 번째 심볼은 우선순위 높은 소스로, 나머지는 백업으로
      const batchPromises = batch.map(async (item, index) => {
        if (index === 0) {
          // 첫 번째는 주 소스부터 시도
          return await this.fetchDataWithFallback(item.symbol, strategy.fallbackChain);
        } else {
          // 나머지는 빠른 백업 소스들만 시도
          const quickFallback = strategy.fallbackChain.slice(0, 2);
          return await this.fetchDataWithFallback(item.symbol, quickFallback);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // 결과 병합
      batchResults.forEach((result, index) => {
        results[batch[index].symbol] = result;
      });
      
      // 배치 간 대기 (API 부하 방지)
      if (i + batchSize < queue.length) {
        console.log(`⏸️ 다음 배치까지 2초 대기...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  // 폴백 체인으로 데이터 수집
  async fetchDataWithFallback(symbol, fallbackChain) {
    for (const sourceName of fallbackChain) {
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
        
        // Alpha Vantage 사용시 카운터 증가
        if (sourceName === 'alphaVantage') {
          this.alphaVantageUsage.usedToday++;
          console.log(`⭐ ${symbol}: Alpha Vantage 성공 (${this.alphaVantageUsage.usedToday}/${this.alphaVantageUsage.dailyLimit})`);
        } else {
          console.log(`✅ ${symbol}: ${sourceName} 성공`);
        }

        // 캐시 업데이트
        this.updateCache(symbol, data);
        
        return data;
        
      } catch (error) {       
        console.log(`⚠️ ${symbol}: ${sourceName} 실패 - 다음 소스 시도`);
      }
    }
    
    // 모든 소스 실패
    throw new Error(`${symbol}: 모든 데이터 소스 실패`);
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
        throw new Error(`지원하지 않는 소스: ${sourceName}`);
    }
  }

  // Yahoo Finance 강화된 데이터 수집
  async fetchFromYahooFinance(symbol) {
    const url = `${this.dataStrategies.primary.source === 'yahooFinance' ? 'https://query1.finance.yahoo.com/v8/finance/chart' : ''}/${symbol}`;
    const params = {
      range: '1d',
      interval: '1m',
      includePrePost: 'true',
      events: 'div,splits'
    };

    const response = await axios.get(url, { 
      params,
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data.chart || !response.data.chart.result || response.data.chart.result.length === 0) {
      throw new Error('Yahoo Finance 응답 데이터 없음');
    }

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    let latestIndex = quotes.close.length - 1;
    while (latestIndex >= 0 && quotes.close[latestIndex] === null) {
      latestIndex--;
    }

    if (latestIndex < 0) {
      throw new Error('유효한 Yahoo Finance 가격 데이터 없음');
    }

    const price = quotes.close[latestIndex];
    const open = quotes.open[latestIndex] || price;
    const change = price - open;
    const changePercent = (change / open) * 100;

    return {
      symbol: symbol,
      currentPrice: price,
      open: open,
      high: quotes.high[latestIndex] || price,
      low: quotes.low[latestIndex] || price,
      volume: quotes.volume[latestIndex] || 0,
      change: change,
      changePercent: changePercent,
      lastRefreshed: new Date(timestamps[latestIndex] * 1000).toISOString(),
      source: 'Yahoo Finance',
      timestamp: Date.now(),
      delay: '5-10분'
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

      // 간단한 가격 패턴 매칭 (실제 구현에서는 더 정교한 파싱 필요)
      const pricePattern = /\$(\d+(?:\.\d{2})?)/g;
      const matches = response.data.match(pricePattern);
      
      if (matches && matches.length > 0) {
        // 가장 높은 값 선택 (보통 가장 최신 가격)
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

  // Alpha Vantage (매우 제한적 사용)
  async fetchFromAlphaVantage(symbol) {
    const status = this.canUseAlphaVantage();
    if (!status.canUse) {
      throw new Error('Alpha Vantage 일일 제한 도달');
    }

    const params = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol,
      interval: '5min',
      apikey: this.dataStrategies.last.apiKey,
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
      changePercent: ((parseFloat(latestData['4. close']) - parseFloat(latestData['1. open'])) / parseFloat(latestData['. open'])) * 100,
      lastRefreshed: latestTimeKey,
      source: 'Alpha Vantage (25회/일 제한)',
      timestamp: Date.now(),
      delay: '5-20분'
    };
  }

  // 캐시 업데이트
  updateCache(symbol, data) {
    this.dataCache.set(symbol, data);
    this.lastUpdateTimes.set(symbol, Date.now());
  }

  // 캐시 신선도 체크
  isCacheFresh(symbol, maxAgeMinutes = 5) {
    const lastUpdate = this.lastUpdateTimes.get(symbol);
    if (!lastUpdate) return false;
    
    return (Date.now() - lastUpdate) < (maxAgeMinutes * 60 * 1000);
  }

  // 최종 수집 시작
  async startUltimateCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🚀 MoneyParadise 최종 데이터 수집 시스템 시작!!');
    console.log('🎯 최우선 원칙: 데이터를 최대한 보존하면서 최대한 빈번하게');
    console.log('📊 적용된 전략:');
    console.log('   • Yahoo Finance 무제한 활용');
    console.log('   • 웹스크래핑 백업 시스템');
    console.log('   • Alpha Vantage 20회 이하로 보존 (25회 중)');
    console.log('   • 거래시간별 적응적 배치 처리');
    console.log('   • 우선순위 기반 선택적 업데이트');
    
    // 즉시 첫 수집
    await this.collectUltimateData(symbols);
    
    // 적응적 스케줄링 시작
    this.startAdaptiveScheduling(symbols);
  }

  // 개장 시간 집중 스케줄링 (25회를 균등하게 분산)
  startAdaptiveScheduling(symbols) {
    const schedule = () => {
      const marketTime = this.getUSMarketTime();
      const alphaStatus = this.canUseAlphaVantage();
      
      // 하루 25회를 전략적으로 분산
      let interval;
      
      if (marketTime.isRegularHours) {
        // 정규 거래시간 (9:30-16:00) = 6.5시간 = 390분
        // 15회를 390분에 분산하면 약 26분 간격이 이상적
        interval = alphaStatus.canUse ? 300000 : 240000; // 5분 또는 4분
        console.log(`⏰ 다음 스케줄: ${Math.round(interval/1000)}초 후 (정규거래시간 - 26분 간격으로 절약)`);
      } else if (marketTime.isPreMarket || marketTime.isAfterMarket) {
        // 확장 시간 = 새벽 4시-9:30, 오후 4시-8시 = 약 6시간
        // 10회를 6시간에 분산하면 약 36분 간격
        interval = alphaStatus.canUse ? 600000 : 480000; // 10분 또는 8분
        console.log(`⏰ 다음 스케줄: ${Math.round(interval/1000)}초 후 (확장시간 - 36분 간격으로 최소)`);
      } else {
        // 폐장/주말: 캐시만 사용, Alpha Vantage 사용 금지
        interval = 3600000; // 폐장/주말: 60분 (매우 긴 간격, 캐시만 확인)
        console.log(`⏰ 다음 스케줄: ${Math.round(interval/1000)}초 후 (폐장/주말 - 캐시만 사용, Alpha Vantage 사용 안함)`);
      }
      
      setTimeout(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 개장 시간 집중 데이터 수집`);
        
        console.log(`🎯 사용 전략: ${alphaStatus.focusStrategy}`);
        console.log(`⚡ Alpha Vantage 남은 사용량: ${alphaStatus.conservativeRemaining}/${alphaStatus.totalLimit}회`);
        
        const results = await this.collectUltimateData(symbols);
        
        // 사용량 경고
        if (alphaStatus.usagePercent > 0.5) {
          console.log(`⚠️ Alpha Vantage 사용량이 ${Math.round(alphaStatus.usagePercent * 100)}% 도달 - 더욱 절약 필요`);
        }
        
        schedule(); // 다음 스케줄 설정
      }, interval);
    };

    schedule();
  }

  // 공개 메서드들
  getAllCachedData() {
    const allData = {};
    for (const [symbol, data] of this.dataCache) {
      allData[symbol] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(symbol),
        ageMinutes: Math.round((Date.now() - this.lastUpdateTimes.get(symbol)) / 60000),
        fresh: this.isCacheFresh(symbol)
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
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('⏹️ 최종 최적화 데이터 수집 중단');
  }
}

module.exports = UltimateDataProvider;
