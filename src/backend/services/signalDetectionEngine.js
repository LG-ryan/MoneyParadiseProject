// 하이브리드 신호 탐지 엔진 - PRD 기반 실시간 신호 분석
// TD Sequential + RSI + 거래량 + 매물대 + 이동평균 + 지지저항 통합 시스템

class SignalDetectionEngine {
  constructor() {
    this.activeSignals = new Map();
    this.historicalData = new Map();
    this.indicatorCache = new Map();
    
    // PRD 명세된 8개 핵심 지표
    this.coreIndicators = {
      tdSequential: { weight: 0.25, description: '토마스 데마크 시퀀셜' },
      rsi: { weight: 0.20, description: 'RSI 신뢰도 높음' },
      volumeProfile: { weight: 0.15, description: '매물대(VRVP)' },
      volumeMA: { weight: 0.10, description: '거래량과 평균 거래량선' },
      fairValueGaps: { weight: 0.10, description: 'Fair Value Gaps' },
      movingAverages: { weight: 0.10, description: '주요 이동평균선' },
      supportResistance: { weight: 0.05, description: '주요 지지선(전고점)' },
      trendlines: { weight: 0.05, description: '주요 빗각라인(전저점→전고점)' }
    };
    
    // BOS/CHoCH 고급 분석
    this.advancedAnalysis = {
      bos: { description: 'Break of Structure (추세 구조 브레이크)' },
      choch: { description: 'Change of Character (추세 전환)' }
    };
    
    // 신호 설정 (사용자 조정 가능)
    this.signalSettings = {
      minimumIndicators: 2, // 최소 일치 지표 수 (임계값)
      confidenceThreshold: 0.75, // 신뢰도 임계값
      timeframeMultiplier: 1.2, // 타임프레임별 가중치
      emailThreshold: 0.80 // 이메일 발송 임계값
    };
    
    console.log('🧠 하이브리드 신호 탐지 엔진 초기화');
    console.log('📊 PRD 핵심 지표 8개 로드됨');
    console.log('⚡ BOS/CHoCH 고급 분석 준비');
    console.log('🎯 투자 인사이트 생성 시스템 활성화');
  }

  // 실시간 신호 분석 실행
  async analyzeRealtimeSignals(marketData) {
    console.log('\n🧠 실시간 하이브리드 신호 분석 시작');
    
    const signals = new Map();
    
    // 각 심볼별로 신호 분석
    for (const [symbol, data] of Object.entries(marketData)) {
      try {
        const analysisResult = await this.analyzeSymbolSignals(symbol, data);
        
        if (analysisResult && analysisResult.confidence >= this.signalSettings.confidenceThreshold) {
          signals.set(symbol, analysisResult);
          console.log(`🎯 ${symbol}: 신호 탐지됨 (신뢰도: ${Math.round(analysisResult.confidence * 100)}%)`);
        }
        
      } catch (error) {
        console.log(`⚠️ ${symbol}: 신호 분석 실패 - ${error.message}`);
      }
    }
    
    // 활성 신호 업데이트
    this.updateActiveSignals(signals);
    
    // 강한 신호에 대한 이메일 알림 확인
    await this.checkEmailNotifications(signals);
    
    console.log(`📊 신호 분석 완료: ${signals.size}개 신호 탐지됨`);
    return signals;
  }

  // 심볼별 신호 분석
  async analyzeSymbolSignals(symbol, marketData) {
    const indicators = {};
    let totalScore = 0;
    let matchedIndicators = 0;
    
    // 1. TD Sequential 분석
    const tdResult = await this.analyzeTDSequential(symbol, marketData);
    if (tdResult.signal) {
      indicators.tdSequential = tdResult;
      totalScore += tdResult.confidence * this.coreIndicators.tdSequential.weight;
      matchedIndicators++;
    }
    
    // 2. RSI 분석
    const rsiResult = await this.analyzeRSI(symbol, marketData);
    if (rsiResult.signal) {
      indicators.rsi = rsiResult;
      totalScore += rsiResult.confidence * this.coreIndicators.rsi.weight;
      matchedIndicators++;
    }
    
    // 3. 거래량 프로필 분석
    const volumeResult = await this.analyzeVolumeProfile(symbol, marketData);
    if (volumeResult.signal) {
      indicators.volumeProfile = volumeResult;
      totalScore += volumeResult.confidence * this.coreIndicators.volumeProfile.weight;
      matchedIndicators++;
    }
    
    // 4. 이동평균 분석
    const maResult = await this.analyzeMovingAverages(symbol, marketData);
    if (maResult.signal) {
      indicators.movingAverages = maResult;
      totalScore += maResult.confidence * this.coreIndicators.movingAverages.weight;
      matchedIndicators++;
    }
    
    // 5. 지지저항 분석
    const srResult = await this.analyzeSupportResistance(symbol, marketData);
    if (srResult.signal) {
      indicators.supportResistance = srResult;
      totalScore += srResult.confidence * this.coreIndicators.supportResistance.weight;
      matchedIndicators++;
    }
    
    // 6. BOS/CHoCH 고급 분석
    const advancedResult = await this.analyzeBOSCHoCH(symbol, marketData);
    if (advancedResult.signal) {
      indicators.advancedAnalysis = advancedResult;
    }
    
    // 최소 지표 수 체크
    if (matchedIndicators < this.signalSettings.minimumIndicators) {
      return null;
    }
    
    // 신호 강도 계산
    const confidence = Math.min(totalScore, 1.0);
    const signalStrength = this.calculateSignalStrength(confidence, matchedIndicators);
    
    // 예측 타임라인 생성
    const predictionTimeline = this.generatePredictionTimeline(symbol, indicators);
    
    // 투자 전략 제안
    const investmentStrategy = this.generateInvestmentStrategy(symbol, indicators, confidence);
    
    return {
      symbol: symbol,
      confidence: confidence,
      signalStrength: signalStrength,
      matchedIndicators: matchedIndicators,
      indicators: indicators,
      predictionTimeline: predictionTimeline,
      investmentStrategy: investmentStrategy,
      timestamp: new Date().toISOString(),
      reasoning: this.generateReasoning(indicators),
      priority: signalStrength === 'STRONG' ? 'HIGH' : signalStrength === 'MEDIUM' ? 'MEDIUM' : 'LOW'
    };
  }

  // TD Sequential 분석 구현
  async analyzeTDSequential(symbol, data) {
    try {
      // 실제 구현에서는 과거 데이터가 필요하지만, 현재는 시뮬레이션
      const currentPrice = data.currentPrice;
      const previousClose = data.open || currentPrice;
      const change = currentPrice - previousFinish;
      const changePercent = (change / (previousClose || 1)) * 100;
      
      // TD Sequential 기본 로직 (단순화된 버전)
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      if (changePercent > 3) {
        signal = true;
        confidence = 0.85;
        reasoning = `강한 상승 모멘텀 감지 (${changePercent.toFixed(2)}% 상승)`;
      } else if (changePercent < -3) {
        signal = true;
        confidence = 0.80;
        reasoning = `강한 하락 모멘텀 감지 (${changePercent.toFixed(2)}% 하락)`;
      } else if (Math.abs(changePercent) > 1) {
        signal = true;
        confidence = 0.70;
        reasoning = `중간 모멘텀 변화 (${changePercent.toFixed(2)}%)`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: changePercent,
        indicator: 'TD Sequential',
        weight: this.coreIndicators.tdSequential.weight
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `TD Sequential 분석 실패: ${error.message}` };
    }
  }

  // RSI 분석 구현
  async analyzeRSI(symbol, data) {
    try {
      const currentPrice = data.currentPrice;
      // RSI는 보통 과거 14일 데이터가 필요하지만, 현재는 가격 변화로 시뮬레이션
      let rsiValue = 50; // 기본값
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      // 가격 변화에 따른 RSI 추정
      if (data.changePercent > 2) {
        rsiValue = 75; // 오버바이 상태 경향
        signal = true;
        confidence = 0.80;
        reasoning = `RSI 과매수 구간 진입 추정 (상승 모멘텀 강함)`;
      } else if (data.changePercent < -2) {
        rsiValue = 25; // 오버솔드 상태 경향
        signal = true;
        confidence = 0.80;
        reasoning = `RSI 과매도 구간 진입 추정 (하락 모멘텀 강함)`;
      } else if (Math.abs(data.changePercent) > 1) {
        rsiValue = data.changePercent > 0 ? 60 : 40;
        signal = true;
        confidence = 0.65;
        reasoning = `RSI 중간 구간 변화 감지`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: rsiValue,
        indicator: 'RSI',
        weight: this.coreIndicators.rsi.weight
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `RSI 분석 실패: ${error.message}` };
    }
  }

  // 거래량 프로필 분석
  async analyzeVolumeProfile(symbol, data) {
    try {
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      // 거래량 분석 로직
      if (data.volume > 1000000) { // 거래량이 높은 경우
        signal = true;
        confidence = 0.75;
        reasoning = `높은 거래량 패턴 감지 (${data.volume.toLocaleString()} 거래량)`;
      } else if (data.volume > 500000) {
        signal = true;
        confidence = 0.60;
        reasoning = `보통 거래량 증가 (${data.volume.toLocaleString()} 거래량)`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: data.volume,
        indicator: 'Volume Profile',
        weight: this.coreIndicators.volumeProfile.weight
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `Volume Profile 분석 실패: ${error.message}` };
    }
  }

  // 이동평균 분석
  async analyzeMovingAverages(symbol, data) {
    try {
      // 실제로는 과거 데이터 기반 MA 계산이 필요
      const currentPrice = data.currentPrice;
      const openPrice = data.open || currentPrice;
      
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      const priceChange = Math.abs(currentPrice - openPrice) / openPrice;
      
      if (priceChange > 0.02) { // 2% 이상 변화
        signal = true;
        confidence = 0.70;
        reasoning = `강한 가격 변화로 이동평균 돌파 가능성`;
      } else if (priceChange > 0.01) {
        signal = true;
        confidence = 0.55;
        reasoning = `중간 가격 변화 감지`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: currentPrice,
        indicator: 'Moving Averages',
        weight: this.coreIndicators.movingAverages.weight
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `Moving Averages 분석 실패: ${error.message}` };
    }
  }

  // 지지저항 분석
  async analyzeSupportResistance(symbol, data) {
    try {
      const currentPrice = data.currentPrice;
      const highPrice = data.high || currentPrice;
      const lowPrice = data.low || currentPrice;
      
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      // 저가와 고가 차이 분석
      const priceRange = highPrice - lowPrice;
      const volatility = priceRange / currentPrice;
      
      if (volatility > 0.03) { // 3% 이상 변동성
        signal = true;
        confidence = 0.65;
        reasoning = `높은 변동성으로 지지/저항 테스트 가능성`;
      } else if (volatility > 0.02) {
        signal = true;
        confidence = 0.50;
        reasoning = `중간 변동성 감지`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: volatility,
        indicator: 'Support/Resistance',
        weight: this.coreIndicators.supportResistance.weight
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `Support/Resistance 분석 실패: ${error.message}` };
    }
  }

  // BOS/CHoCH 고급 분석
  async analyzeBOSCHoCH(symbol, data) {
    try {
      // 실제로는 복잡한 구조 분석이 필요
      const currentPrice = data.currentPrice;
      const changePercent = data.changePercent || 0;
      
      let signal = false;
      let confidence = 0;
      let reasoning = '';
      
      if (Math.abs(changePercent) > 2) {
        signal = true;
        confidence = 0.70;
        reasoning = `강한 추세 변화로 BOS/CHoCH 가능성`;
      }
      
      return {
        signal: signal,
        confidence: confidence,
        reasoning: reasoning,
        currentValue: changePercent,
        indicator: 'BOS/CHoCH',
        weight: 0.15 // 보너스 가중치
      };
      
    } catch (error) {
      return { signal: false, confidence: 0, reasoning: `BOS/CHoCH 분석 실패: ${error.message}` };
    }
  }

  // 신호 강도 계산
  calculateSignalStrength(confidence, matchedIndicators) {
    const strengthScore = confidence * (matchedIndicators / 5) * 100;
    
    if (strengthScore >= 80) return 'STRONG';
    if (strengthScore >= 60) return 'MEDIUM';
    if (strengthScore >= 40) return 'WEAK';
    return 'VERY_WEAK';
  }

  // 예측 타임라인 생성
  generatePredictionTimeline(symbol, indicators) {
    const signalCount = Object.keys(indicators).length;
    const now = new Date();
    
    if (signalCount >= 3) {
      return {
        timeframe: 'short_term',
        prediction_timing: this.addHours(now, 4).toISOString(), // 4시간 후
        prediction_window: '2-4시간 내 변화 예상',
        confidence_score: 'HIGH'
      };
    } else if (signalCount >= 2) {
      return {
        timeframe: 'medium_term',
        prediction_timing: this.addDays(now, 1).toISOString(), // 다음날
        prediction_window: '내일 중 변화 예상',
        confidence_score: 'MEDIUM'
      };
    } else {
      return {
        timeframe: 'long_term',
        prediction_timing: this.addDays(now, 3).toISOString(), // 3일 후
        prediction_window: '이번 주 내 변화 예상',
        confidence_score: 'LOW'
      };
    }
  }

  // 투자 전략 생성
  generateInvestmentStrategy(symbol, indicators, confidence) {
    const strategy = {
      symbol: symbol,
      recommendation: confidence >= 0.8 ? 'BUY' : confidence <= 0.3 ? 'SELL' : 'HOLD',
      timeframe: confidence >= 0.7 ? 'short_term' : 'medium_term',
      risk_level: confidence >= 0.8 ? 'LOW' : confidence >= 0.6 ? 'MEDIUM' : 'HIGH',
      target_price: this.calculateTargetPrice(symbol, indicators),
     止损价: this.calculateStopLoss(symbol, indicators),
      reason: this.generateStrategyReason(indicators, confidence)
    };
    
    return strategy;
  }

  // 타겟 가격 계산
  calculateTargetPrice(symbol, indicators) {
    // 단순화된 계산 (실제로는 더 복잡한 분석 필요)
    const basePrice = 100; // 임시 가격
    const modifier = Object.keys(indicators).length * 2.5; // 지표 수에 따른 변동
    
    return basePrice * (1 + modifier / 100);
  }

  // 손절가 계산
  calculateStopLoss(symbol, indicators) {
    const basePrice = 100; // 임시 가격
    const risk = Object.keys(indicators).length * 1.5; // 지표 수에 따른 위험도
    
    return basePrice * (1 - risk / 100);
  }

  // 전략 이유 생성
  generateStrategyReason(indicators, confidence) {
    const reasons = [];
    
    Object.entries(indicators).forEach(([name, data]) => {
      if (data.confidence > 0.6) {
        reasons.push(`${data.indicator}: ${data.reasoning}`);
      }
    });
    
    return {
      confidence_interpretation: confidence >= 0.8 ? '매우 강한 신호' : 
                               confidence >= 0.6 ? '강한 신호' : '중간 신호',
      匹配的指标: Object.keys(indicators).join(', '),
      detailed_reasons: reasons
    };
  }

  // 신호 추론 생성
  generateReasoning(indicators) {
    const evidence = [];
    
    Object.entries(indicators).forEach(([name, data]) => {
      evidence.push({
        indicator: data.indicator,
        confidence: Math.round(data.confidence * 100),
        evidence: data.reasoning,
        weight: data.weight
      });
    });
    
    return {
      summary: `${Object.keys(indicators).length}개 지표에서 투자 신호 감지`,
      证据: evidence,
      confidence_level: evidence.length >= 3 ? 'HIGH' : evidence.length >= 2 ? 'MEDIUM' : 'LOW'
    };
  }

  // 활성 신호 업데이트
  updateActiveSignals(signals) {
    signals.forEach((signal, symbol) => {
      this.activeSignals.set(symbol, signal);
    });
    
    // 오래된 신호 정리 (1시간 이상 된 신호 제거)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [symbol, signal] of this.activeSignals) {
      if (new Date(signal.timestamp) < oneHourAgo) {
        this.activeSignals.delete(symbol);
      }
    }
  }

  // 이메일 알림 확인
  async checkEmailNotifications(signals) {
    for (const [symbol, signal] of signals) {
      if (signal.confidence >= this.signalSettings.emailThreshold) {
        console.log(`📧 ${symbol}: 강한 신호 감지 - 이메일 알림 발송 대상`);
        // 실제로는 이메일 발송 로직 구현
      }
    }
  }

  // 유틸리티 함수들
  addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  }

  addDays(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  // 공개 메서드들
  getActiveSignals() {
    return Array.from(this.activeSignals.values());
  }

  getSignalSettings() {
    return this.signalSettings;
  }

  updateSignalSettings(newSettings) {
    this.signalSettings = { ...this.signalSettings, ...newSettings };
  }
}

module.exports = SignalDetectionEngine;
