// 미국 주식시장 시간 기준 최적화된 데이터 프로바이더
// 일일 500회 제한을 고려한 스마트 호출 시스템

const axios = require('axios');

class OptimizedDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    this.dailyCallCount = 0;
    this.maxDailyCalls = 400; // 안전 마진을 두고 400회로 제한
    this.resetTime = null;
    
    this.dataSources = {
      yahooFinance: {
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        free: true,
        reliable: true,
        noDailyLimit: true // Yahoo Finance는 일일 제한 없음
      },
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: 'YCN5UGRTXB1ZF74P',
        free: true,
        dailyLimit: 500,
        usedToday: 0
      }
    };

    // 일일 카운터 리셋 예약
    this.scheduleDailyReset();
  }

  // 미국 동부시간 기준 현재 시간 계산
  getUSMarketTime() {
    const now = new Date();
    const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    return {
      datetime: usTime,
      day: usTime.getDay(), // 0=일요일, 1=월요일...
      hour: usTime.getHours(),
      minute: usTime.getMinutes(),
      isTradingDay: usTime.getDay() >= 1 && usTime.getDay() <= 5, // 월-금
      isPreMarket: usTime.getHours() >= 4 && usTime.getHours() < 9, // 4:00-9:00 AM EST
      isRegularHours: usTime.getHours() >= 9 && usTime.getHours() < 16 && usTime.getMinutes() >= 30, // 9:30-16:00 EST
      isAfterMarket: usTime.getHours() >= 16 && usTime.getHours() < 20, // 4:00-8:00 PM EST
      isMarketClosed: usTime.getHours() < 4 || usTime.getHours() >= 20
    };
  }

  // 하루 중 남은 시간과 남은 호출 계산
  calculateOptimalInterval() {
    const marketTime = this.getUSMarketTime();
    const currentHour = marketTime.hour;
    const currentMinute = marketTime.minute;
    
    // 폐장/주말 시간 계산
    const minutesUntilOpen = this.getMinutesUntilMarketOpen(marketTime);
    const minutesUntilClose = this.getMinutesUntilMarketClose(marketTime);
    
    // 거래시간이 아닌 경우 계산 없음
    if (marketTime.isMarketClosed && marketTime.day !== 0) { // 일요일 제외
      return { interval: 300000, reason: '폐장/주말 - 5분 간격' }; // 5분
    }

    // Alpha Vantage 사용량 확인
    const alphaUsagePercent = this.dataSources.alphaVantage.usedToday / this.dataSources.alphaVantage.dailyLimit;
    
    // 하루 시간 계산 (거래일 기준)
    const tradingDayHours = this.getTradingDayHours();
    const remainingHours = this.getRemainingTradingHours(marketTime);
    
    if (remainingHours <= 0) {
      return { interval: 600000, reason: '폐장 임박 - 10분 간격' };
    }

    // 남은 시간 동안 Alpha Vantage를 최대한 분산하여 사용
    const suggestedInterval = this.calculateSmartInterval(remainingHours, alphaUsagePercent);
    
    return {
      interval: suggestedInterval,
      reason: `거래시간 최적화 - ${Math.round(suggestedInterval/1000)}초 간격 (사용률: ${Math.round(alphaUsagePercent*100)}%)`
    };
  }

  // 스마트 간격 계산
  calculateSmartInterval(remainingHours, usagePercent) {
    const remainingMinutes = remainingHours * 60;
    const apiCallsPerUpdate = 8; // 모니터링 심볼 수
    
    // 사용률이 높으면 간격 늘림
    if (usagePercent > 0.8) {
      // 80% 이상 사용 시 10분 간격
      return Math.max(600000, remainingMinutes * 60000 / 50); // 최소 10분
    } else if (usagePercent > 0.6) {
      // 60-80% 사용 시 5분 간격
      return Math.max(300000, remainingMinutes * 60000 / 100);
    } else if (usagePercent > 0.4) {
      // 40-60% 사용 시 2분 간격
      return Math.max(120000, remainingMinutes * 60000 / 200);
    } else {
      // 40% 미만 사용 시 1분 간격
      return Math.max(60000, remainingMinutes * 60000 / 300);
    }
  }

  // 거래시간까지 남은 시간 계산
  getMinutesUntilMarketOpen(marketTime) {
    if (!marketTime.isTradingDay) return 0;
    
    let targetHour = 9;
    let targetMinute = 0; // 프리마킷 시작
    
    const currentHour = marketTime.hour;
    const currentMinute = marketTime.minute;
    
    if (currentHour < 4) {
      return (targetHour * 60 + targetMinute) - (currentHour * 60 + currentMinute);
    } else if (currentHour >= 20) {
      // 다음날 오픈까지
      return (24 - currentHour) * 60 - currentMinute + targetHour * 60 + targetMinute;
    }
    
    return 0; // 이미 거래시간이나 프리마킷 시간
  }

  // 거래 종료까지 남은 시간 계산
  getMinutesUntilMarketClose(marketTime) {
    if (!marketTime.isTradingDay) return 0;
    
    const closeHour = 16; // 정규 시간 종료
    const currentHour = marketTime.hour;
    const currentMinute = marketTime.minute;
    
    if (currentHour >= closeHour) return 0;
    
    return (closeHour * 60) - (currentHour * 60 + currentMinute);
  }

  // 거래일 총 시간 계산
  getTradingDayHours() {
    return 13.5; // 프리마킷(4시) + 정규시간(9:30-16:00) + 애프터마킷(16-20시) = 13.5시간
  }

  // 남은 거래시간 계산
  getRemainingTradingHours(marketTime) {
    if (!marketTime.isTradingDay) return 0;
    
    const currentTotalMinutes = marketTime.hour * 60 + marketTime.minute;
    
    // 프리마킷 시작부터 현재까지
    if (marketTime.hour >= 4 && marketTime.hour < 9) {
      return (20 - marketTime.hour) - (marketTime.minute / 60);
    } 
    // 정규시간
    else if (marketTime.hour >= 9 && marketTime.hour < 16) {
      return (16 - marketTime.hour) + (marketTime.minute > 30 ? 0 : 0.5) - (marketTime.minute / 60) + 4; // 애프터마킷 포함
    }
    // 애프터마킷
    else if (marketTime.hour >= 16 && marketTime.hour < 20) {
      return (20 - marketTime.hour) - (marketTime.minute / 60);
    }
    
    return 0;
  }

  // Alpha Vantage 호출 가능 여부 확인
  canUseAlphaVantage() {
    const alphaUsed = this.dataSources.alphaVantage.usedToday;
    const alphaLimit = this.dataSources.alphaVantage.dailyLimit;
    const usagePercent = alphaUsed / alphaLimit;
    
    return {
      canUse: alphaUsed < alphaLimit - 10, // 10회 안전 마진
      usagePercent: usagePercent,
      remaining: alphaLimit - alphaUsed,
      threshold: usagePercent > 0.85 ? '높음' : usagePercent > 0.6 ? '보통' : '낮음'
    };
  }

  // 통합 데이터 수집 (소스별 최적화)
  async collectOptimizedData(symbols) {
    const alphaStatus = this.canUseAlphaVantage();
    const marketTime = this.getUSMarketTime();
    
    console.log(`\n📊 시장 상황 분석 (${marketTime.hour}:${marketTime.minute} EST)`);
    console.log(`🟢 거래일: ${marketTime.isTradingDay ? 'YES' : 'NO'}`);
    console.log(`📈 거래시간: ${marketTime.isRegularHours ? 'YES' : 'NO'}`);
    console.log(`⚡ Alpha Vantage 사용량: ${Math.round(alphaStatus.usagePercent * 100)}% (${alphaStatus.remaining}회 남음)`);
    
    // 거래시간이 아니면 간격 늘림
    if (!marketTime.isTradingDay || marketTime.isMarketClosed) {
      console.log(`😴 폐장/주말 시간 - 최소 업데이트만 유지`);
      return {};
    }

    // Alpha Vantage 제한 고려
    if (!alphaStatus.canUse && alphaStatus.usagePercent > 0.9) {
      console.log(`⚠️ Alpha Vantage 제한 임박 - Yahoo Finance만 사용`);
      return await this.collectYahooFinanceData(symbols);
    }

    // 정규 거래시간은 더 자주, 확장시간은 덜 자주
    const updateStrategy = this.getUpdateStrategy(marketTime, alphaStatus);
    
    console.log(`🎯 수집 전략: ${updateStrategy.description}`);
    
    // 새로운 데이터만 수집
    const needUpdates = this.getSymbolsNeedingUpdate(symbols);
    
    if (needUpdates.length === 0) {
      console.log(`⚡ 모든 데이터 신선함 - 스킵`);
      return this.getAllCachedData();
    }

    console.log(`🔄 업데이트 필요: ${needUpdates.length}/${symbols.length} 개 심볼`);

    return await this.collectSmartData(needUpdates, updateStrategy);
  }

  // 업데이트 전략 결정
  getUpdateStrategy(marketTime, alphaStatus) {
    const isActiveTrading = marketTime.isRegularHours;
    const alphaRisk = alphaStatus.usagePercent;
    
    if (isActiveTrading && alphaRisk < 0.4) {
      return {
        description: '정규 거래시간 (Alpha Vantage 적극 활용)',
        useAlpha: true,
        parallelLimit: 4, // 병렬 처리 수 제한
        priority: 'realtime'
      };
    } else if (isActiveTrading && alphaRisk < 0.7) {
      return {
        description: '정규 거래시간 (Alpha Vantage 신중 사용)',
        useAlpha: true,
        parallelLimit: 2,
        priority: 'balanced'
      };
    } else if (alphaRisk < 0.9) {
      return {
        description: '확장시간 (Yahoo Finance 우선)',
        useAlpha: true,
        parallelLimit: 1,
        priority: 'conservative'
      };
    } else {
      return {
        description: 'API 제한 예비안 (Yahoo Finance만)',
        useAlpha: false,
        parallelLimit: 6,
        priority: 'emergency'
      };
    }
  }

  // 업데이트가 필요한 심볼 식별
  getSymbolsNeedingUpdate(symbols) {
    const now = Date.now();
    const marketTime = this.getUSMarketTime();
    const cacheThreshold = marketTime.isRegularHours ? 60000 : 300000; // 정규시간 1분, 다른시간 5분
    
    return symbols.filter(symbol => {
      const cacheKey = `${symbol}_optimized`;
      const lastUpdate = this.lastUpdateTimes.get(cacheKey);
      return !lastUpdate || (now - lastUpdate) > cacheThreshold;
    });
  }

  // 스마트 데이터 수집
  async collectSmartData(symbols, strategy) {
    const results = {};
    
    if (strategy.useAlpha && symbols.length > strategy.parallelLimit) {
      // 병렬 처리 제한으로 배치 처리
      for (let i = 0; i < symbols.length; i += strategy.parallelLimit) {
        const batch = symbols.slice(i, i + strategy.parallelLimit);
        const batchResults = await this.processBatch(batch, strategy);
        Object.assign(results, batchResults);
        
        if (i + strategy.parallelLimit < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        }
      }
    } else {
      results = await this.processBatch(symbols, strategy);
    }

    return results;
  }

  // 배치 처리
  async processBatch(symbols, strategy) {
    const promises = symbols.map(symbol => 
      this.getBestAvailableDataForSymbol(symbol, strategy)
    );

    const results = await Promise.all(promises);
    
    // 결과 정리
    const processedResults = {};
    results.forEach((result, index) => {
      processedResults[symbols[index]] = result;
    });

    return processedResults;
  }

  // 심볼별 최적 데이터 수집
  async getBestAvailableDataForSymbol(symbol, strategy) {
    try {
      // 캐시 확인
      const cacheKey = `${symbol}_optimized`;
      const cached = this.dataCache.get(cacheKey);
      
      if (cached && (Date.now() - this.lastUpdateTimes.get(cacheKey)) < 30000) {
        return { ...cached, cached: true };
      }

      // 데이터 소스 결정
      let data;
      
      if (strategy.useAlpha) {
        try {
          data = await this.getAlphaVantageData(symbol);
          this.dataSources.alphaVantage.usedToday++;
        } catch (error) {
          console.log(`⚠️ Alpha Vantage 실패, Yahoo Finance 백업: ${symbol}`);
          data = await this.getYahooFinanceData(symbol);
        }
      } else {
      
        data = await this.getYahooFinanceData(symbol);
      }

      // 캐시 저장
      this.dataCache.set(cacheKey, data);
      this.lastUpdateTimes.set(cacheKey, Date.now());

      return { ...data, cached: false };

    } catch (error) {
      console.error(`❌ ${symbol} 수집 실패:`, error.message);
      return { error: error.message };
    }
  }

  // Yahoo Finance 데이터 수집
  async getYahooFinanceData(symbol) {
    const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
    const params = {
      range: '1d',
      interval: '1m',
      includePrePost: 'true'
    };

    const response = await axios.get(url, { params });
    
    if (!response.data.chart.result || response.data.chart.result.length === 0) {
      throw new Error('Yahoo Finance: 데이터 없음');
    }

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const volumes = result.indicators.quote[0].volume;
    
    let latestIndex = closes.length - 1;
    while (latestIndex >= 0 && (closes[latestIndex] === null || closes[latestIndex] === undefined)) {
      latestIndex--;
    }

    if (latestIndex < 0) {
      throw new Error('유효한 가격 데이터 없음');
    }

    return {
      symbol: symbol,
      currentPrice: closes[latestIndex],
      volume: volumes[latestIndex],
      lastRefreshed: new Date(timestamps[latestIndex] * 1000).toISOString(),
      source: 'Yahoo Finance',
      timestamp: Date.now()
    };
  }

  // Alpha Vantage 데이터 수집
  async getAlphaVantageData(symbol) {
    const params = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol,
      interval: '5min',
      apikey: this.dataSources.alphaVantage.apiKey,
      outputsize: 'compact'
    };

    const response = await axios.get(this.dataSources.alphaVantage.baseUrl, { params });
    
    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const timeSeriesData = response.data['Time Series (5min)'];
    if (!timeSeriesData) {
      throw new Error('시간 시리즈 데이터 없음');
    }

    const latestTimeKey = Object.keys(timeSeriesData)[0];
    const latestData = timeSeriesData[latestTimeKey];

    return {
      symbol: symbol,
      currentPrice: parseFloat(latestData['4. close']),
      volume: parseFloat(latestData['5. volume']),
      lastRefreshed: latestTimeKey,
      source: 'Alpha Vantage',
      timestamp: Date.now()
    };
  }

  // 일일 카운터 리셋 스케줄
  scheduleDailyReset() {
    const marketTime = this.getUSMarketTime();
    
    // 매일 자정에 Alpha Vantage 카운터 리셋
    const resetTime = new Date();
    resetTime.setHours(0, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1);
    
    const msUntilReset = resetTime - new Date();
    
    setTimeout(() => {
      this.dataSources.alphaVantage.usedToday = 0;
      console.log(`🔄 Alpha Vantage 일일 카운터 리셋`);
      this.scheduleDailyReset(); // 다음 리셋 스케줄
    }, msUntilReset);

    console.log(`⏰ Alpha Vantage 카운터 리셋 예약: ${resetTime.toLocaleString()}`);
  }

  // 모든 캐시된 데이터 조회
  getAllCachedData() {
    const allData = {};
    for (const [key, data] of this.dataCache) {
      allData[key] = {
        ...data,
        cachedAt: this.lastUpdateTimes.get(key),
        ageMinutes: Math.round((Date.now() - this.lastUpdateTimes.get(key)) / 60000)
      };
    }
    return allData;
  }

  // 특정 심볼 데이터 조회
  getCurrentData(symbol) {
    const cacheKey = `${symbol}_optimized`;
    return this.dataCache.get(cacheKey);
  }

  // 최적화된 시작
  async startOptimizedCollection() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD'];
    
    console.log('🚀 최적화된 데이터 수집 시작...');
    
    // 즉시 첫 수집
    await this.collectOptimizedData(symbols);
    
    // 동적 간격으로 자동 업데이트
    this.startDynamicUpdates(symbols);
  }

  // 동적 업데이트 스케줄링
  startDynamicUpdates(symbols) {
    const updateSchedule = () => {
      const optimalConfig = this.calculateOptimalInterval();
      
      console.log(`⏰ ${optimalConfig.reason}`);
      
      clearInterval(this.updateInterval);
      
      this.updateInterval = setInterval(async () => {
        console.log(`\n📅 ${new Date().toLocaleString()} - 최적화된 데이터 수집`);
        await this.collectOptimizedData(symbols);
      }, optimalConfig.interval);
      
      // 다음 업데이트 전략 검토를 위한 시간 설정
      setTimeout(updateSchedule, optimalConfig.interval);
    };

    updateSchedule();
  }

  // 수집 중단
  stopCollection() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      console.log('⏹️ 최적화된 데이터 수집 중단');
    }
  }
}

module.exports = OptimizedDataProvider;
