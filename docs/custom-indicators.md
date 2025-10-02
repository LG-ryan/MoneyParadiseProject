# MoneyParadise 커스텀 지표 개발 요구사항

## MVP 핵심 지표 3개 개발 계획

### 지표 1: Advanced Volume Profile (AVP)
**개발 목표**: 거래량 기반 고급 가격 구조 분석

#### 기능 명세
- **핵심 가치**: 일반 투자자가 접근할 수 없는 전문 투자자 수준의 거래량 분석
- **차별화 포인트**: 단순 볼륨 프로파일이 아닌 동적 가격 단 구조 고급 분석

#### 기술적 구현 요구사항
```pinescript
//@version=5
indicator("MoneyParadise - Advanced Volume Profile", shorttitle="MP-AVP")

// === 입력 파라미터 ===
vp_bar_count = input.int(500, "Volume Profile Bars", minval=100, maxval=1000)
vh_threshold = input.float(1.5, "Volume High Threshold", minval=1.0, maxval=3.0)
dynamic_levels = input.bool(true, "Dynamic Support/Resistance")
risk_ratio = input.float(2.0, "Risk/Reward Ratio", minval=1.0, maxval=5.0)

// === 핵심 계산 ===
// 가격별 거래량 누적 계산
var array<float> price_levels = array.new<float>()
var array<float> volume_levels = array.new<float>()

// 거래량 중심가(VWAP) 계산
vwap_value = ta.vwap(hlc3)

// 동적 범위 계산 (ATR 기반)
atr_value = ta.atr(14)
volatility_adjustment = atr_value * vh_threshold

// === 주요 신호 생성 ===
// 거래량 집중도 분석
volume_spike = volume > volume[1] * vh_threshold

// 가격 단 강도 계산
price_strength = (close - low) / (high - low) * volume
price_weakness = (high - close) / (high - low) * volume

// 동적 지지/저항 레벨
dynamic_resistance = ta.highest(high, 20) * (1 - volatility_adjustment)
dynamic_support = ta.lowest(low, 20) * (1 + volatility_adjustment)

// === 시각화 ===
plot(vwap_value, "VWAP", color=color.blue, linewidth=2)
plot(dynamic_resistance, "Dynamic Resistance", color=color.red)
plot(dynamic_support, "Dynamic Support", color=color.green)

// 거래량 막대 그래프
bgcolor(volume_spike ? color.new(color.yellow, 85) : na)

// === 알림 시스템 ===
// 과매수/과매도 신호
oversold = close < dynamic_support and volume_spike
overbought = close > dynamic_resistance and volume_spike

alertcondition(oversold, "MP: Oversold Volume Signal", "Momentum oversold detected with volume confirmation")
alertcondition(overbought, "MP: Overbought Volume Signal", "Momentum overbought detected with volume confirmation")
```

#### 백테스팅 기준
- **테스트 기간**: 최소 2년 (2022-2024)
- **주요 종목**: S&P500 주요 종목 (AAPL, MSFT, GOOGL, TSLA)
- **성과 목표**: 승률 55% 이상, 샤프 비율 1.2 이상

#### 사용 시나리오
1. **탈출점 식별**: 거래량 급증과 함께 동적 저항/지지 돌파 감지
2. **스웜 매매**: 동적 레벨 근처에서 거래량 기반 진입/청산 신호
3. **리스크 관리**: 동적 레벨 이탈 시 손절매 신호

---

### 지표 2: Multi-Timeframe Momentum (MTM)
**개발 목표**: 개별 투자자가 구현하기 어려운 복합 다중 시간대 모멘텀 분석

#### 기능 명세
- **핵심 가치**: 개별 시간대로 분석하는 한계를 극복하는 종합 모멘텀 분석
- **차별화 포인트**: 3-4개 시간대의 모멘텀을 종합한 비등가 신호

#### 기술적 구현 요구사항
```pinescript
//@version=5
indicator("MoneyParadise - Multi-Timeframe Momentum", shorttitle="MP-MTM")

// === 입력 파라미터 ===
short_tf = input.timeframe("5", "Short Timeframe")
medium_tf = input.timeframe("1H", "Medium Timeframe") 
long_tf = input.timeframe("1D", "Long Timeframe")
rsi_length = input.int(14, "RSI Period", minval=5, maxval=50)
weight_short = input.float(0.2, "Short TF Weight", minval=0.1, maxval=0.5)
weight_medium = input.float(0.3, "Medium TF Weight", minval=0.1, maxval=0.5)
weight_long = input.float(0.5, "Long TF Weight", minval=0.1, maxval=0.8)

// === 다중 시간대 모멘텀 계산 ===
// 단기 모멘텀 (현재 시간대)
short_momentum = ta.rsi(close, rsi_length)

// 중기 모멘텀
medium_rsi = request.security(syminfo.tickerid, medium_tf, ta.rsi(close, rsi_length))
medium_momentum = medium_rsi

// 장기 모멘텀  
long_rsi = request.security(syminfo.tickerid, long_tf, ta.rsi(close<｜tool▁call▁begin｜>rsi_length))
long_momentum = long_rsi

// === 종합 모멘텀 점수 계산 ===
composite_momentum = (short_momentum * weight_short) + 
                    (medium_momentum * weight_medium) + 
                    (long_momentum * weight_long)

// 모멘텀 가속도 계산 (변화율)
momentum_acceleration = composite_momentum - composite_momentum[5]

// === 추가 필터링 지표 ===
// 트렌드 강도 계산
trend_strength = (close - ta.sma(close, 20)) / ta.stdev(close, 20)

// 거래량 모멘텀
volume_momentum = volume / ta.sma(volume, 20)

// === 종합 신호 계산 ===
// 강세 신호 조건
bullish_signal = composite_momentum > 50 and 
                momentum_acceleration > 0 and 
                trend_strength > 1 and 
                volume_momentum > 1.2

// 약세 신호 조건
bearish_signal = composite_momentum < 50 and 
                momentum_acceleration < 0 and 
                trend_strength < -1 and 
                volume_momentum > 1.2

// === 시각화 ===
// 메인 모멘텀 라인
plot(composite_momentum, "Composite Momentum", color=color.blue, linewidth=2)
hline(50, "Neutral", color=color.gray, linestyle=hline.style_dashed)
hline(70, "Overbought", color=color.red, linestyle=hline.style_dotted)
hline(30, "Oversold", color=color.green, linestyle=hline.style_dotted)

// 가속도 표시
plot(momentum_acceleration, "Acceleration", color=color.orange, display=display.data_window)

// 배경 색상 신호
bgcolor(bullish_signal ? color.new(color.green, 90) : 
        bearish_signal ? color.new(color.red, 90) : na)

// === 알림 시스템 ===
alertcondition(bullish_signal, "MP: Bullish MTM Signal", 
              "Multi-timeframe momentum indicates bullish continuation")
alertcondition(bearish_signal, "MP: Bearish MTM Signal",
              "Multi-timeframe momentum indicates bearish reversal")
```

#### 백테스팅 기준
- **테스트 대상**: 메이저 크립토페어 (BTC/USD, ETH/USD, 주요 알토코인)
- **시간대 조합**: 5분-1시간-일봉 조합 테스트
- **성과 목표**: 승률 60% 이상, 샤프 비율 1.5 이상

#### 사용 시나리오
1. **진입 타이밍**: 모든 시간대가 강세 정렬일 때 롱 포지션
2. **청산 타이밍**: 단기 모멘텀 약화 시작 시 이익실현
3. **피라미딩**: 강세 신호 지속 시 포지션 추가

---

### 지표 3: Risk-Adjusted Portfolio Signal (RAPS)
**개발 목표**: 개별 종목이 아닌 포트폴리오 관점의 리스크 조정 신호

#### 기능 명세
- **핵심 가치**: 직관적으로 구현하기 어려운 포트폴리오 리스크 관리 신호
- **차별화 포인트**: 개별 종목 변동성을 종합한 포트폴리오 수준의 리스크 분석

#### 기술적 구현 요구사항
```pinescript
//@version=5
indicator("MoneyParadise - Risk-Adjusted Portfolio Signal", shorttitle="MP-RAPS")

// === 입력 파라미터 ===
portfolio_symbols = input.string("AAPL,MSFT,GOOGL", "Portfolio Symbols (comma separated)")
risk_threshold = input.float(2.0, "Risk Threshold (Standard Deviations)", minval=1.0, maxval=5.0)
correlation_lookback = input.int(30, "Correlation Lookback Period", minval=10, maxval=100)
rebalance_threshold = input.float(0.15, "Rebalance Threshold (%)", minval=0.05, maxval=0.30)

// === 포트폴리오 데이터 로드 ===
// 설정된 심볼들을 배열로 분리
symbol_array = str.split(portfolio_symbols, ",")

// 각 종목의 데이터 로드 (최대 5개 종목까지만 처리)
get_symbol_data(symbol) =>
    request.security(symbol, timeframe.period, close)

// 포트폴리오 성과 계산
portfolio_return = 0.0
symbol_count = 0

// 심볼별 데이터 수집 및 포트폴리오 수익률 계산
if array.size(symbol_array) > 0
    first_symbol = array.get(symbol_array, 0)
    if array.size(symbol_array) > 1
        second_symbol = array.get(symbol_array, 1)
        if array.size(symbol_array) > 2
            third_symbol = array.get(symbol_array, 2)
            // 최대 3개 종목으로 제한 (핑 호출 최적화)

// === 포트폴리오 리스크 메트릭 계산 ===
// 포트폴리오 변동성 (샘플 공분산)
portfolio_volatility = ta.stdev(close, 20) / close

// 베타 계산 (시장 대비 민감도)
market_return = ta.change(close, 20) / close[20]
stock_return = ta.change(close, 20) / close[20]
beta = ta.correlation(market_return, stock_return, 20) * portfolio_volatility

// 샤프 비율 추정
risk_free_rate = 0.02 // 연 2% 가정
excess_return = stock_return - risk_free_rate
sharpe_ratio = excess_return / portfolio_volatility

// === 포트폴리오 최적화 신호 ===
// Value at Risk (VaR) 계산
confidence_level = 0.05 // 95% 신뢰구간
var_estimate = close * portfolio_volatility * 2.33 // 정규분포 가정

// 최적 포지션 사이즈 계산
optimal_position = sharpe_ratio / (portfolio_volatility * risk_threshold)

// 리밸런싱 필요성 판단
current_allocation = 1.0 // 단일 종목 가정, 실제로는 다중 종목 배분 비율 계산
optimal_allocation = optimal_position
allocation_drift = math.abs(current_allocation - optimal_allocation)

rebalance_needed = allocation_drift > rebalance_threshold

// === 리스크 관리 신호 ===
// 하방 리스크 감지
downside_risk = ta.correlation(stock_return, ta.min(stock_return, 0), 30)
maximum_drawdown = ta.min(stock_return, 10) / 10

// 포트폴리오 Heat 압력 신호
heat_signal = portfolio_volatility > portfolio_volatility[1] and 
             portfolio_volatility[1] > portfolio_volatility[2]

// === 시각화 ===
plot(sharpe_ratio, "Portfolio Sharpe Ratio", color=color.blue)
hline(1.0, "Good Sharpe (1.0)", color=color.green, linestyle=hline.style_dotted)
hline(2.0, "Excellent Sharpe (2.0)", color=color.yellow, linestyle=hline.style_dotted)

plot(beta, "Portfolio Beta", color=color.purple, display=display.data_window)
hline(1.0, "Market Beta", color=color.gray, linestyle=hline.style_dashed)

plot(optimal_position, "Optimal Position Size", color=color.orange)
plot(current_allocation, "Current Allocation", color=color.red)

// 리스크 상태 배경
bgcolor(rebalance_needed ? color.new(color.yellow, 85) : na)
bgcolor(heat_signal ? color.new(color.red, 90) : na)

// === 알림 시스템 ===
alertcondition(rebalance_needed, "MP: Portfolio Rebalance Needed", 
              "Portfolio allocation drift exceeds threshold")
alertcondition(heat_signal, "MP: Portfolio Heat Alert", 
              "Portfolio volatility spike detected")
alertcondition(sharpe_ratio < 0.5, "MP: Low Sharpe Alert", 
              "Portfolio Sharpe ratio below optimal level")
```

#### 백테스팅 기준  
- **포트폴리오 구성**: S&P500 하위 2분의 1에서 10개 종목 랜덤 샘플링
- **리스크 프레임워크**: 포트폴리오 VaR 5% 이하 유지
- **성과 목표**: 샤프 비율 평균 1.5 이상, 최대 드로우다운 10% 이하

#### 사용 시나리오
1. **리스크 모니터링**: 실시간 포트폴리오 리스크 추적
2. **자동 리밸런싱**: 목표 배분 이탈 시 알림
3. **헤지 신호**: Market Stress 상황에서 헤지 필요성 판단

---

## 개발 우선순위 및 타임라인

### Phase 1 (MVP - 8주)
- **주차 1-2**: AVP 개발 및 백테스팅
- **주차 3-4**: MTM 개발 및 백테스팅  
- **주차 5-6**: RAPS 개발 및 백테스팅
- **주차 7-8**: 통합 테스트 및 최적화

### 품질 보장 기준
1. **코드 검토**: 각 지표는 백테스팅 성과 기준 통과 후 릴리스
2. **성과 지표**: 각 지표별 최소 성과 기준 설정 및 모니터링
3. **사용성**: 비전문가도 이해할 수 있는 설명 및 사용 가이드 작성

### 향후 확장 계획
- **고급 지표**: 커너럴레이션 베이스 트레이딩 시그널
- **AI 기반**: 머신러닝 패턴 인식 지표
- **커뮤니티**: 사용자 제작 지표 호스팅

이 3개 지표는 MoneyParadise의 핵심 가치를 충분히 드러내면서도, MVP로서 구현 가능한 범위에 맞춰 설계되었습니다.
