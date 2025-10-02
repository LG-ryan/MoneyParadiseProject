# 하이브리드 분석 도구 개념 정립

## 핵심 아이디어

**"통계적 근거 + 주관적 분석을 결합한 투자 분석 동반자"**

### 기능 개요
- **초기 신호**: 통계적 패턴 탐지 (과거 데이터 기반)
- **심화 분석**: 추가 고려사항 A, B, C를 제시하고 각각의 확률/근거 제공
- **공동 의사결정**: 사용자와 함께 각 요소를 평가

## 구체적인 워크플로우 예시

### 신호 발생 시나리오
```
[시스템 감지] BTC 급등 패턴 탐지
├─ 기본 신호: 20일 내 40% 상승 + 거래량 5배 증가 + 최근 2일 하락
├─ 기본 확률: 과거 유사 패턴 342개 중 급락 확률 62% (통계적 근거)

[심화 분석 제공]
├─ 추가 고려사항 A: 공포탐욕지수 = 15 (극도 공포 상태)
│  └─ 확률 가중치: +12% (단독 기준 성공률 78%)
├─ 추가 고려사항 B: 주요 저항선 4% 상방에 위치
│  └─ 확률 가중치: -8% (단독 기준 성공률 54%)
└─ 추가 고려사항 C: 금리 변화 알림 예정 발표 임박 (72시간 내)
    └─ 확률 가중치: ±15% (불확실성 증가)

[최종 종합 평가]
최종 승률: 62% ± 12% ± 8% ± 15% = 범위: 43%~97% (평균 70%)
추천 액션: 신중한 매수 검토 (불확실성 요소 존재)

[함께 고민할 질문들]
- 금리 발표 결과에 대한 트레이더 시장 반응을 어떻게 예상하나요?
- 혹시 기업 실적 발표도 확인해야 할지요?
```

## 기술적 구현 방향

### 1. 핵심 엔진 설계
- **통계 패턴 탐지**: 과거 데이터 기반 패턴 분석
- **확률적 추론**: 각 요소별 확률 계산 및 조합
- **하이브리드 추론**: 통계적 + 시장/거시적 요소 결합

### 2. 사용자 인터페이스 특징
- **TradingView 연동**: 주요 신호를 차트에 직접 표시
- **웹 대시보드**: 심화 분석 결과 및 상세 데이터 제공
- **대화형 분석**: 사용자와 함께 각 요소를 평가

## MVP 핵심 기능 정의

### Phase 1: 패턴 탐지 + 기본 확률 계산
```javascript
// 예시 기능 명세
PatternDetection = {
    detectAbnormalMove: {
        // 급등/급락 패턴 탐지
        priceChange: "±30% in 20 days",
        volumeSpike: "3x average",
        timeframe: "last 50 days"
    },
    calculateProbability: {
        // 과거 데이터 기반 기본 확률
        historicalMatches: "342 similar patterns",
        successRate: "62%",
        confidence: "±5%"
    }
}
```

### Phase 2: 하이브리드 분석 추가
```javascript
// 예시 추가 요소들
AdditionalFactors = {
    fearGreedIndex: {
        weight: "+12% if extreme fear",
        source: "Fear & Greed Index API",
        reliability: "78% standalone accuracy"
    },
    keyLevels: {
        supportResistance: "major S/R levels nearby",
        weight: "±8% based on distance",
        calculation: "fibonacci + pivot points"
    },
    marketEvents: {
        economicCalendar: "scheduled announcements",
        weight: "±15% uncertainty",
        timeline: "next 72 hours"
    }
}
```

### Phase 3: 인터랙티브 분석 도구
- 사용자가 각 요소의 중요도 조절
- "가정" 설정 기능 (예: 금리 상승 시나리오 vs 하락 시나리오)
- 시나리오별 확률 계산 및 결과 비교

## 타겟 자산별 적용

### 주식/ETF 특화 요소
```javascript
StockSpecificFactors = {
    sectorRotation: "sector performance analysis",
    earningsCalendar: "upcoming earnings dates",
    institutionalActivity: "institutional buying/selling patterns",
    marketCapFactors: "large vs small cap dynamics"
}
```

### 구현 우선순위
1. **통계 패턴 탐지** (기본 확률 계산)
2. **주요 차트 레벨 인식** (지지선/저항선)
3. **거래량 패턴 분석**
4. **시장 심리 지표 연동**
5. **이벤트 캘린더 연동**
