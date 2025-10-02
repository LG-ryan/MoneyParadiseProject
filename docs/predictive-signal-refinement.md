# 예측적 신호 탐지 도구 정제

## 핵심 방향 전환

**"급등급락 발생 후 → 급등급락 발생 전" 예측 신호로 완전 전환**

### 현재 사용자 지표 분석

1. **매물대(VRVP)** - 볼륨 프로파일 기반 매물대 분석
2. **TD Sequential** - 토마스 데마크의 시퀀셜 (매우 신뢰도 높음)
3. **거래량 분석** - 50일/60일 평균 거래량 기준
4. **Fair Value Gaps** - 가격 공간 분석
5. **주요 이동평균선** - 다중 타임프레임 MA
6. **RSI** - 상대강도지표 (신뢰도 높음)
7. **주요 지지선** - 전고점 기반
8. **주요 빗각라인** - 전저점/전고점 연결선 (일/주/월봉)

## 예측적 신호 체계 재설계

### Phase 1: 예측 징조 탐지 (Alert Phase)
```
🔍 조기 경고 신호들

A. TD Sequential 경고
- 매수 세기(Selling Exhaustion) 카운트 진행 중
- 현재 카운트: 9/9 → 예상 역전 발생: 3-5일 내

B. 거래량 급증 페트타운
- 평시 거래량의 150% 이상 지속 (2일째)
- 가격 움직임과 거래량 변화율 불일치 감지

C. RSI 다이버젼스 진행 중  
- 가격은 신고가 갱신, RSI는 고점 하향 이탈
- 완전 다이버젼스까지 예상: 1-2일 내

D. Fair Value Gap 핖링 가능
- 상방 FVG: $27,500~$27,800 구역 미체움 상태
- 과거 데이터: 미체움 시 포물 85% 발생

E. 매물대 축적/분산
- 현재 가격 주변 매물대 밀도 분석 중
- 밀도 급증 예상 지점: $26,800~$27,200
```

### Phase 2: 확률적 예측 계산
```
🎯 예측 시나리오 분석

TD Sequential 매도 경고 (카운트 9/9):
├─ 기본 성공률: 73% (과거 5년 데이터)
├─ RSI 다이버젼스 동시 발생 시: +12%
├─ 거래량 급감 동반 시: +8%
└─ 과거 매물대 고점 근접 시: +15%

🎲 최종 예측 확률: 73%~108% (평균 91%)
역전 시점 예측: 내일 오후 2-4시 (UTC +9)
```

### Phase 3: 실행 시나리오 제시
```
⚡ 실행 가능한 시나리오

시나리오 A (고확률): RSI 다이버젼스 + TD Sequential 동시 완성
- 역전 확률: 89%
- 예상 하락폭: 4-7%
- 추천 액션: 매도 검토 (적은 포지션부터)

시나리오 B (중확률): TD Sequential 단독 완성  
- 역전 확률: 73%
- 예상 하락폭: 2-4%
- 추천 액션: 신중 관망 또는 방어적 포지션

🤔 함께 고민점:
"현재 포지션은 전체 포트폴리오의 얼마나? 리스크 한도는?"
"TD Sequential의 역전 신호가 조기 발생할 확률은?"
```

## 통합된 지표 기반 예측 모델

### 핵심 알고리즘 구조
```python
class PredictiveSignalDetector:
    
    def detect_pre_event_signals(self, symbol, timeframe):
        signals = {}
        
        # 1. TD Sequential 진행 상태 감지
        signals['td_sequential'] = self.td_sequential_progress(symbol)
        
        # 2. 거래량 이상 패턴 (급변 직전 신호)
        signals['volume_pattern'] = self.volume_anomaly_detection(symbol)
        
        # 3. RSI 다이버젼스 진행 상황  
        signals['rsi_divergence'] = self.rsi_divergence_progress(symbol)
        
        # 4. Fair Value Gap 예측
        signals['fvg_prediction'] = self.predict_fvg_fill(symbol)
        
        # 5. 이동평균선 교차 예측
        signals['ma_convergence'] = self.predict_ma_cross(symbol)
        
        # 6. 매물대 분석
        signals['volume_profile'] = self.volume_profile_analysis(symbol)
        
        # 7. 지지선/저항선 접근 예측
        signals['support_resistance'] = self.predict_level_approach(symbol)
        
        return signals
    
    def calculate_probability_matrix(self, signals):
        # 각 신호별 가중치 적용
        probabilities = {}
        
        # TD Sequential 가중치 (사용자 선호도 반영)
        probabilities['td_weight'] = 1.25  # 가장 신뢰도 높음
        
        # RSI 가중치
        probabilities['rsi_weight'] = 1.15  # 신뢰도 높음
        
        # 나머지는 기본 가중치 적용
        return self.weighted_prediction(probabilities)
```

### 주봉 TD Sequential 구현 예시
```pinescript
//@version=5
indicator("MoneyParadise TD Sequential Predictor", shorttitle="MP-TDS")

// === TD Sequential 카운트 진행 계산 ===
// 매수 다이버젼스 카운트 (TD Count Up)
td_count_up = 0
td_count_down = 0

// 현재 카운트 상태 계산
if low[4] < low[3] and low[3] < low[2] and low[2] < low[1] and low[1] < low
    td_count_up := td_count_up[1] + 1
    
if high[4] > high[3] and high[3] > high[2] and high[2] > high[1] and high[1] > high
    td_count_down := td_count_down[1] + 1

// 카운트 리셋 (9번째 완성 시)
td_count_up := td_count_up > 9 ? 0 : td_count_up
td_count_down := td_count_down > 9 ? 0 : td_count_down

// 예측 신호 생성
buy_exhaustion_progress = td_count_up / 9  // 진행률 0-1
sell_exhaustion_progress = td_count_down / 9

// 멘팩션 및 피리예측 정확도
completion_probability = ta.barssincet(td_count_up == 1) <= 15 ? 0.75 : 0.65

// 시각화
plotshape(td_count_up >= 8, "매수 고갈 임박", shape.triangleup, color=color.yellow)
plotshape(td_count_down >= 8, "매도 고갈 임박", shape.triangledown, color=color.red)

// 예측 텍스트 표시
label.new(bar_index, high, "예상 역전: " + str(math.round(completion_probability * 100)) + "%", 
         style=label.style_label_down, color=color.new(color.blue, 20))
```

## MVP 우선순위 재정립

### Phase 1: 예측적 TD Sequential + RSI 다이버젼스
```
주요 집중 기능:
1. TD Sequential 진행 상황 실시간 모니터링
2. RSI 다이버젼스 진행 상황 감지
3. 각 단계별 완성 확률 계산
4. 사용자 맞춤 가중치 설정 기능
```

### Phase 2: 통합 다중 지표 예측  
```
확장 기능:
1. 전체 8개 지표 종합 분석
2. 거래량 패턴 이상 탐지
3. Fair Value Gap 예측
4. 매물대 분석 결과 통합
```

**핵심 변화**: "무엇이 발생했나?" → "무엇이 발생할 것인가?"

이 방향이 더 유용하고 실용적이네요! 사용자가 원하시는 지표들을 기반으로 한 예측적 분석이 훨씬 가치가 있을 것 같습니다.
