# MoneyParadise 최종 MVP 개념

## 루트 기능명
**"Hybrid Arbitrage Signal Detection & Analysis Tool (하이브리드 아비트리지 탐지 분석 도구)"**

## 핵심 가치 제안
비용이 드는 투자 데이터와 기술적 분석의 조합을 하나의 자동 도구로 제공하여 투자자와 함께 실제로 워킹하는 시장 모순을 식별 및 분석해나가는 것이 목표입니다.

## 사용자 여정 (Weekend Analysis Workflow)

### 1. 초기 신호 감지 (전날 오후 자동 업데이트)
```
"새로운 시장 모순 패턴 감지됨"

[주요 신호]
BTC: 급상승 후 급락 패턴 탐지
- 20일 내 40% 상승 + 거래량 400% 증가 + 최근 3일 하락
- 기본 성공률: 62% ±5% (과거 342개 유사 사례)

AAPL: 기술지표 간 모순 탐지  
- RSI 과매수 신호 + MACD 약세 다이버젼스
- 기본 성공률: 58% ±7% (과거 198개 유사 사례)
```

### 2. 웹 대시보드 심화 분석 (주말 아침 분석)

**BTC 분석 화면**
```
[패턴 분석]
✅ 급등 후 급락 패턴 확인 (신뢰도 92%)
📊 과거 유사 사례: 342건
🎯 평균 성공률: 62%

[추가 고려사항 A: 시장 심리]
📈 공포탐욕지수
현재 15/100 (극도 공포 상태)
- 단독 성공률: 78%
- 가중치: +12% 
- 신뢰도: 높음 (과거 5년 데이터)

🤔 함께 고민해볼 점:
"금리 발표 예정 기간과 겹쳐서 추가 변동성 예상됩니다"

[추가 고려사항 B: 기술적 레벨]  
📍 주요 저항선: $28,500 (4% 상방)
📍 주요 지지선: $25,200 (3.5% 하방)
- 단독 성공률: 54% (저항선 근접 불리)
- 가중치: -8%

🤔 함께 고민해볼 점:
"저항선 돌파 시 더 큰 상승 가능성 있지만 실패 시 급락 신호"

[추가 고려사항 C: 거시적 요인]
📅 금리 결정 발표 예정 (72시간 내)
- 불확실성 가중치: ±15%
- 가설: 상승 시 해당 주도급 암호화폐 하락 피할 수 없음

🤔 함께 고민해볼 점:  
"금리가 상승한다면 암호화폐는 어떤 반응일까요? 과거 데이터 분석해볼까요?"

[종합 분석 결과]
최종 승률 범위: 49% ~ 87% (평균 68%)
추천 액션: 신중한 매수 검토 (불확실성 요소 존재)

🎲 함께 평가하기:
분석 가정 설정 → 금리 상승 시나리오 vs 하락 시나리오 결과 비교
```

### 3. TradingView 연동 (분석 완료 후 실행)

```
📊 TradingView 차트에 신호 표시된 상태 확인
🔔 추가 알림 설정: 주요 레벨 돌파 시 알림
📝 메모링 기능: 내 분석 노트와 함께 이력 저장
```

## 기술적 구현 방향

### 핵심 알림리즘 구조
```python
class HybridArbitrageDetector:
    
    def detect_patterns(self):
        # 스크린링: 급등급락, 기술지표 모순 
        return patterns
        
    def calculate_base_probability(self, pattern):
        # 통계적 패턴 매칭으로 기본 확률 계산
        return base_probability
    
    def analyze_additional_factors(self, symbol, pattern):
        factors = {
            "market_sentiment": self.get_fear_greed_index(),
            "technical_levels": self.calculate_support_resistance(symbol),
            "market_events": self.get_ecocomic_calendar()
        }
        return factors
        
    def hybrid_analysis(self, base_prob, factors):
        # 각 요소별 가중치 적용 및 최종 확률 계산
        final_probability = self.weighted_probability(base_prob, factors)
        return final_assessment
```

### 데이터 소스 계획
- **가격/거래량**: TradingView API 또는 Alpha Vantage
- **공포탐욕지수**: Fear & Greed Index API
- **이코노믹 캘린더**: Investing.com Economic Calendar
- **새로고침 빈도**: 일일 업데이트 (매일 오후 6시 스크론)

### 인터페이스 계획
1. **웹 대시보드** (React 기반)
2. **TradingView 연동**: 주요 신호를 차트에 표시  
3. **모바일 반응형**: 주말 검토 시 모바일에서도 확인 가능

## MVP 개발 범위 (1개월 목표)

### 우선순위 1: 기본 패턴 탐지
- 급등급락 패턴 자동 탐지
- 기본 성공률 계산 (과거 데이터 기반)
- 주요 주식/ETF 100개 정도 스캐닝 대상

### 우선순위 2: 기본 하이브리드 분석
- 공포탐욕지수 연동
- 기본적 기술적 레벨 계산 (지지선/저항선)
- 각 요소별 확률 가중치 제공

### 우선순위 3: 인터페이스 개발  
- 웹 대시보드 기본 구조
- TradingView 신호 연동 기본 기능
- 분석 결과 저장 기능

모든 기능은 **사용자의 의사결정을 대체하지 않고 함께 분석하는 도구**로 설계됩니다.

---

이제 정말 구체적이고 현실적인 MVP 스펙이 나왔네요! 

다음 단계로 실제 개발을 시작할까요? 아니면 이 개념을 더 다듬을 부분이 있으신가요?
