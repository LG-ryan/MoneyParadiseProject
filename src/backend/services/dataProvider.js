// Alpha Vantage Data Provider Service
// Story 1.2: Alpha Vantage API 기본 연동

const alpha = require('alphavantage')({ key: process.env.ALPHA_VANTAGE_API_KEY || 'demo' });
const axios = require('axios');

class DataProviderService {
  constructor() {
    // Alpha Vantage API 호출 완전 중단 - 토큰 없이 오류 발생 방지
    this.apiKey = null; // API 키 비활성화
    this.baseUrl = null; // API 호출 비활성화
    this.dataCache = new Map();
    this.lastUpdateTimes = new Map();
    this.isAlphaVantageDisabled = true; // Alpha Vantage 완전 비활성화
  }

  // 기본 데이터 조회 테스트 (Alpha Vantage 비활성화됨)
  async testBasicDataRetrieval() {
    console.log('🚫 Alpha Vantage API 비활성화됨 - 토큰 없이 오류 방지');
    
    // Alpha Vantage 대신 안정적인 무료 데이터 소스 사용 권장
    console.log('💡 권장 대안:');
    console.log('   📊 Yahoo Finance API (무제한)');
    console.log('   🏛️ IEX Cloud API (무료 티어)');
    console.log('   📈 Finnhub API (무료 티어)');
    console.log('   🌐 Polygon.io API (무료 티어)');
    
    return false; // Alpha Vantage 비활성화로 인해 테스트 불가
  }

  // 실시간 데이터 수집 (Alpha Vantage 비활성화됨)
  async getIntradayData(symbol, interval = '5min', outputsize = 'compact') {
    try {
      // Alpha Vantage API 호출 완전 차단
      if (this.isAlphaVantageDisabled) {
        console.log(`🚫 ${symbol}: Alpha Vantage API 비활성화됨 - 토큰 없이 오류 방지`);
        throw new Error('Alpha Vantage API 비활성화됨 - 안정적인 대안 사용 권장');
      }

      // 메모리 캐시 확인 (Acceptance Criteria 4)
      const cacheKey = `${symbol}_${interval}`;
      const cachedData = this.dataCache.get(cacheKey);
      const lastUpdate = this.lastUpdateTimes.get(cacheKey);
      
      // 5분 이내 데이터면 캐시된 데이터 반환
      if (cachedData && lastUpdate && Date.now() - lastUpdate < 300000) {
        console.log(`📈 ${symbol}: 캐시된 데이터 사용`);
        return cachedData;
      }

      // 이 코드는 실행되지 않음 (Alpha Vantage 비활성화)
      throw new Error('Alpha Vantage API 비활성화됨');
      
      // 응답 구조 디버깅
      console.log(`📋 Alpha Vantage 응답 키:`, Object.keys(response.data));
      
      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage API 오류: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error(`API 제한 초과: ${response.data['Note']}`);
      }

      if (response.data['Information']) {
        console.log(`ℹ️ API 정보:`, response.data['Information']);
      }

      // 올바른 응답 키 사용
      const correctKey = `Time Series (${interval === '5min' ? '5min' : interval.toUpperCase()})`;
      const timeSeriesData = response.data[correctKey];
      
      if (!timeSeriesData) {
        console.log(`📋 사용 가능한 키들:`, Object.keys(response.data));
        console.log(`🔍 찾으려던 키: ${correctKey}`);
        throw new Error(`${symbol}의 시간 시리즈 데이터가 없습니다.`);
      }

      // 데이터 처리 및 메모리 저장
      const latestTimeKey = Object.keys(timeSeriesData)[0];
      const latestData = timeSeriesData[latestTimeKey];
      
      const formattedData = {
        symbol: symbol,
        currentPrice: parseFloat(latestData['4. close']),
        open: parseFloat(latestData['1. open']),
        high: parseFloat(latestData['2. high']),
        low: parseFloat(latestData['3. low']),
        volume: parseFloat(latestData['5. volume']),
        lastRefreshed: latestTimeKey,
        metadata: response.data['Meta Data'],
        timeSeries: timeSeriesData
      };

      // 데이터 저장소 업데이트 (메모리 기반)
      this.dataCache.set(cacheKey, formattedData);
      this.lastUpdateTimes.set(cacheKey, Date.now());

      console.log(`💾 ${symbol} 데이터 캐시에 저장 완료: $${formattedData.currentPrice}`);
      
      return formattedData;
      
    } catch (error) {
      console.error(`❌ ${symbol} 데이터 수집 실패:`, error.message);
      
      // 에러 핸들링 및 리트라이 메커니즘 (Acceptance Criteria 5)
      return await this.handleRetry(symbol, interval, outputsize, error);
    }
  }

  // 재시도 메커니즘 구현 (Acceptance Criteria 5)
  async handleRetry(symbol, interval, outputsize, error, attempt = 1) {
    const maxRetries = 3;
    
    if (attempt > maxRetries) {
      console.error(`🔴 ${symbol}: 최대 재시도 횟수 초과`);
      return null;
    }

    console.log(`🔄 ${symbol}: ${attempt}번째 재시도 (${error.message})`);
    
    // 지수 백오프: 2초, 4초, 8초 간격으로 재시도
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    
    return await this.getIntradayData(symbol, interval, outputsize);
  }

  // 로깅 시스템 구현 (Acceptance Criteria 6)
  async startDataCollectionSchedule() {
    const targetSymbols = [
      'AAPL',  // Apple
      'MSFT',  // Microsoft  
      'GOOGL', // Alphabet
      'TSLA',  // Tesla
      'AMZN',  // Amazon
      'BTC',   // Bitcoin
      'ETH'    // Ethereum
    ];

    console.log('⏰ 데이터 수집 스케줄 시작 (5분 간격)');
    
    // 즉시 첫 수집 실행
    await this.collectAllData(targetSymbols);
    
    // 5분 간격으로 지속 수집
    setInterval(async () => {
      console.log(`\n📅 ${new Date().toLocaleString()} - 정기 데이터 수집 시작`);
      await this.collectAllData(targetSymbols);
    }, 5 * 60 * 1000); // 5분 = 300,000ms
  }

  async collectAllData(symbols) {
    const results = {};
    
    for (const symbol of symbols) {
      try {
        const data = await this.getIntradayData(symbol, '5min', 5);
        results[symbol] = {
          success: !!data,
          price: data?.currentPrice || 0,
          lastUpdate: data?.lastRefreshed || null
        };
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message
        };
      }
      // API 제한 회피를 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 수집 결과 로깅
    console.log('📊 데이터 수집 결과:');
    Object.entries(results).forEach(([symbol, result]) => {
      if (result.success) {
        console.log(`✅ ${symbol}: $${result.price.toFixed(2)} (${result.lastUpdate})`);
      } else {
        console.log(`❌ ${symbol}: ${result.error}`);
      }
    });
    
    return results;
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
    const cacheKey = `${symbol}_5min`;
    return this.dataCache.get(cacheKey);
  }
}

module.exports = DataProviderService;
