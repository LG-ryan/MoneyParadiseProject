// 실시간 데이터 프로바이더 - 평생 무료 최적화
// 야후 파이낸스 + Alpha Vantage 이중 백업 시스템

const axios = require('axios');

class RealTimeDataProvider {
  constructor() {
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.updateInterval = null;
    
    // 평생 무료 데이터 소스들
    this.dataSources = {
      yahooFinance: {
        baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
        delay: '15-20분', // 실제로는 더 빠름
        free: true,
        reliable: true
      },
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        delay: '20-30분',
        free: true,
        reliable: true,
        apiKey: 'YCN5UGRTXB1ZF74P'
      }
    };
  }

  // 최적화된 업데이트 간격 계산
  getOptimalUpdateInterval() {
    const now = new Date();
    const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = usTime.getDay(); // 0=일요일
    const hour = usTime.getHours();
    
    // 미국거래시간 (월-금 9:30-16:00 EST)
    const isTradingHours = (day >= 1 && day <= 5) && (hour >= 9 && hour <= 16);
    
    // 프리마킷/애프터마킷 (확장시간)
    const isExtendedHours = (day >= 1 && day <= 5) && 
                          ((hour >= 4 && hour < 9) || (hour > 16 && hour <= 20));
    
    if (isTradingHours) {
      return 30000; // 거래시간: 30초 간격 (최대 실시간성)
    } else if (isExtendedHours) {
      return 60000; // 확장시간: 1분 간격
    } else {
      return 300000; // 폐장/주말: 5분 간격
    }
  }

  // 야후 파이낸스 데이터 (더 실시간에 가까움)
  async getYahooFinanceData(symbol) {
    try {
      const url = `${this.dataSources.yahooFinance.baseUrl}/${symbol}`;
      const params = {
        range: '1d',
        interval: '1m',
        includePrePost: 'true'
      };

      console.log(`🌐 Yahoo Finance 호출: ${symbol}`);
      
      const response = await axios.get(url, { params });
      
      if (!response.data.chart.result || response.data.chart.result.length === 0) {
        throw new Error(`Yahoo Finance: ${symbol} 데이터 없음`);
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      const volumes = result.indicators.quote[0].volume;
      
      // 최신 데이터 찾기
      let latestIndex = closes.length - 1;
      while (latestIndex >= 0 && (closes[latestIndex] === null || closes[latestIndex] === undefined)) {
        latestIndex--;
      }

      if (latestIndex < 0) {
        throw new Error(`${symbol}: 유효한 가격 데이터 없음`);
      }

      const latestTimestamp = timestamps[latestIndex];
      const latestPrice = closes[latestIndex];
      const latestVolume = volumes[latestIndex];

      return {
        symbol: symbol,
        currentPrice: latestPrice,
        volume: latestVolume,
        lastRefreshed: new Date(latestTimestamp * 1000).toISOString(),
        source: 'Yahoo Finance',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ Yahoo Finance ${symbol} 실패:`, error.message);
      throw error;
    }
  }

  // Alpha Vantage 데이터 (백업용)
  async getAlphaVantageData(symbol) {
    try {
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
        throw new Error(`${symbol} 시간 시리즈 데이터 없음`);
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

    } catch (error) {
      console.error(`❌ Alpha Vantage ${symbol} 실패:`, error.message);
      throw error;
    }
  }

  // 최적 데이터 소스 자동 선택
  async getBestAvailableData(symbol) {
    const cacheKey = `${symbol}_realtime`;
    
    // 캐시된 데이터 확인 (30초 내면 캐시 사용)
    const cachedData = this.dataCache.get(cacheKey);
    const lastUpdate = this.lastUpdateTimes.get(cacheKey);
    
    if (cachedData && lastUpdate && Date.now() - lastUpdate < 30000) {
      console.log(`⚡ ${symbol}: 캐시된 데이터 사용 (${Math.round((Date.now() - lastUpdate)/1000)}초 전)`);
      return cachedData;
    }

    console.log(`🔄 ${symbol}: 새로운 데이터 수집 시작...`);

    // 두 소스를 병렬로 시도
    const promises = [
      this.getYahooFinanceData(symbol).catch(e => ({error: e.message, source: 'Yahoo'})),
      this.getAlphaVantageData(symbol).catch(e => ({error: e.message, source: 'Alpha'}))

    ];

    const results = await Promise.all(promises);
    
    // Yahoo Finance 우선 (더 실시간에 가까움)
    const yahooResult = results[0];
    const alphaResult = results[1];

    if (!yahooResult.error) {
      console.log(`✅ ${symbol}: Yahoo Finance 성공 - $${yahooResult.currentPrice}`);
      this.dataCache.set(cacheKey, yahooResult);
      this.lastUpdateTimes.set(cacheKey, Date.now());
      return yahooResult;
    }

    if (!alphaResult.error) {
      console.log(`✅ ${symbol}: Alpha Vantage 백업 성공 - $${alphaResult.currentPrice}`);
      this.dataCache.set(cacheKey, alphaResult);
      this.lastUpdateTimes.set(cacheKey, Date.now());
      return alphaResult;
    }

    throw new Error(`${symbol}: 모든 데이터 소스 실패`);
  }

  // 모니터링 대상 심볼들
  getTargetSymbols() {
    return [
      'AAPL',  // Apple
      'MSFT',  // Microsoft
      'GOOGL', // Alphabet
      'TSLA',  // Tesla
      'AMZN',  // Amazon
      'NVDA',  // NVIDIA
      'META',  // Meta
      'AMD'    // AMD
    ];
  }

  // 실시간 데이터 수집 시작
  async startRealTimeCollection() {
    console.log('🚀 실시간 데이터 수집 시작...');
    
    // 거래시간에 따른 최적화된 간격으로 업데이트
    const updateInterval = this.getOptimalUpdateInterval();
    
    console.log(`⏰ 수집 간격: ${updateInterval/1000}초 (거래시간에 따라 자동 조정)`);
    
    // 즉시 첫 수집 실행
    await this.collectAllData();
    
    // 자동 업데이트 시작
    this.updateInterval = setInterval(async () => {
      const newInterval = this.getOptimalUpdateInterval();
      
      // 거래시간 변화 감지시 간격 조정
      if (newInterval !== updateInterval) {
        clearInterval(this.updateInterval);
        console.log(`🔄 거래시간 변경 감지 - 새 간격: ${newInterval/1000}초`);
        await this.startRealTimeCollection();
        return;
      }
      
      console.log(`\n📅 ${new Date().toLocaleString()} - 실시간 데이터 수집`);
      await this.collectAllData();
    }, updateInterval);
  }

  // 모든 심볼 데이터 수집
  async collectAllData() {
    const symbols = this.getTargetSymbols();
    const results = {};
    
    // 병렬 처리로 속도 향상
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getBestAvailableData(symbol);
        return { symbol, data, success: true };
      } catch (error) {
        return { symbol, error: error.message, success: false };
      }
    });

    const allResults = await Promise.all(promises);
    
    // 결과 정리 및 로깅
    allResults.forEach(result => {
      if (result.success) {
        results[result.symbol] = {
          price: result.data.currentPrice,
          source: result.data.source,
          lastUpdate: result.data.lastRefreshed
        };
        console.log(`💰 ${result.symbol}: $${result.data.currentPrice} (${result.data.source})`);
      } else {
        results[result.symbol] = {
          error: result.error
        };
        console.log(`❌ ${result.symbol}: ${result.error}`);
      }
    });

    // 성공률 로깅
    const successCount = Object.values(results).filter(r => !r.error).length;
    console.log(`📊 수집 완료: ${successCount}/${symbols.length} (${Math.round(successCount/symbols.length*100)}%)`);
    
    return results;
  }

  // 특정 심볼의 현재 데이터
  getCurrentData(symbol) {
    const cacheKey = `${symbol}_realtime`;
    return this.dataCache.get(cacheKey);
  }

  // 모든 캐시된 데이터
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

  // 수집 중단
  stopCollection() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      console.log('⏹️ 실시간 데이터 수집 중단');
    }
  }
}

module.exports = RealTimeDataProvider;
