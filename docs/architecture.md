# MoneyParadise 기술 아키텍처 설계

## 전체 시스템 아키텍처

### 시스템 구성도
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TradingView   │    │  MoneyParadise  │    │   External      │
│   Platform      │    │  Core Platform  │    │   Services       │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Pine Script  │◄┼────┼►│Backend API  │ │    │ │Financial    │ │
│ │Indicators   │ │    │ │             │ │    │ │Data APIs    │ │
│ └─────────────┘ │    │ ├─────────────┤ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ │Web Dashboard│ │    │ ┌─────────────┐ │
│ │Chart        │◄┼────┼►│             │ │    │ │Payment     │ │
│ │Integration  │ │    │ └─────────────┘ │    │ │(Stripe)    │ │
│ └─────────────┘ │    │ ┌─────────────┐ │    │ └─────────────┘ │
└─────────────────┘    │ │Database     │ │    │ ┌─────────────┐ │
                      │ │(Portfolio)  │ │    │ │Auth (OAuth) │ │
                      │ └─────────────┘ │    │ └─────────────┘ │
                      └─────────────────┘    └─────────────────┘
```

## 기술 스택 세부 설계

### 1. TradingView Pine Script 컴포넌트

#### 핵심 Pine Script 지표 구조
```pinescript
// 고급 지표 템플릿 예시
//@version=5
indicator("MoneyParadise - Advanced Volume Profile", shorttitle="MP-AVP")

// 입력 파라미터
volume_threshold = input.float(0.5, "Volume Threshold", minval=0.1, maxval=2.0)
timeframe_multiplier = input.int(1, "Timeframe Multiplier", minval=1, maxval=24)

// 핵심 계산 로직
volume_profile = ta.pivots(volume, volume_threshold)
momentum_score = ta.rsi(close, 14) * volume_profile

// 시각화
plot(momentum_score, title="MP Momentum Score", color=color.blue)
hline(50, "Neutral Level", color=color.gray, linestyle=hline.style_dashed)

// 알림 시스템
alertcondition(momentum_score > 80, title="Overbought Alert", message="MP: Overbought Signal")
alertcondition(momentum_score < 20, title="Oversold Alert", message="MP: Oversold Signal")
```

#### 개발 표준
- **버전 관리**: Pine Script v5 최신 문법 사용
- **성능 최적화**: ta.* 함수 우선 사용으로 계산 효율성 확보
- **모듈성**: 재사용 가능한 함수 라이브러리 구축
- **문서화**: 주석을 통한 상세한 사용법 제공

### 2. 백엔드 아키텍처

#### API 서버 설계 (Node.js + Express)
```javascript
// 프로젝트 구조
backend/
├── src/
│   ├── controllers/
│   │   ├── indicators.js          // 지표 관리
│   │   ├── portfolios.js          // 포트폴리오 관리
│   │   ├── backtesting.js         // 백테스팅
│   │   └── auth.js                // 인증
│   ├── services/
│   │   ├── tradingview.js          // TradingView 연동
│   │   ├── financial-data.js       // 금융 데이터 서비스
│   │   ├── backtesting-engine.js   // 백테스팅 엔진
│   │   └── portfolio-optimizer.js  // 포트폴리오 최적화
│   ├── models/
│   │   ├── User.js                 // 사용자 모델
│   │   ├── Portfolio.js            // 포트폴리오 모델
│   │   ├── Indicator.js            // 지표 모델
│   │   └── BacktestResult.js       // 백테스팅 결과 모델
│   ├── middleware/
│   │   ├── auth.js                 // 인증 미들웨어
│   │   ├── rate-limiting.js        // 요청 제한
│   │   └── cors.js                 // CORS 설정
│   ├── routes/
│   │   ├── auth.js                 // 인증 라우트
│   │   ├── indicators.js           // 지표 라우트
│   │   ├── portfolios.js           // 포트폴리오 라우트
│   │   └── backtesting.js          // 백테스팅 라우트
│   └── utils/
│       ├── validation.js           // 입력 검증
│       ├── encryption.js           // 암호화
│       └── logger.js               // 로깅
├── pine-scripts/                   // Pine Script 파일들
├── tests/                          // 테스트 코드
├── docs/                          // API 문서
└── config/                        // 설정 파일
```

#### 핵심 API 엔드포인트
```javascript
// REST API 설계 예시
const express = require('express');
const router = express.Router();

// 지표 관리 API
router.get('/api/indicators', getIndicators);           // 사용 가능한 지표 목록
router.get('/api/indicators/:id', getIndicator);       // 특정 지표 상세 정보
router.post('/api/indicators/:id/backtest', runBacktest); // 백테스팅 실행
router.get('/api/indicators/:id/performance', getPerformance); // 성과 데이터

// 포트폴리오 관리 API
router.get('/api/portfolios', getUserPortfolios);       // 사용자 포트폴리오 목록
router.post('/api/portfolios', createPortfolio);       // 포트폴리오 생성
router.put('/api/portfolios/:id', updatePortfolio);     // 포트폴리오 업데이트
router.get('/api/portfolios/:id/analysis', analyzePortfolio); // 포트폴리오 분석

// 백테스팅 API
router.post('/api/backtests', runBacktest);            // 백테스팅 실행
router.get('/api/backtests/:id', getBacktestResult);   // 백테스팅 결과 조회

module.exports = router;
```

### 3. 데이터베이스 설계

#### PostgreSQL 스키마 설계
```sql
-- 사용자 관리
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile JSONB,
    subscription_type VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 지표 정보
CREATE TABLE indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    pine_script_code TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    parameters JSONB,
    performance_metrics JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 포트폴리오 구조
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    assets JSONB NOT NULL, -- 자산 구성 정보
    target_allocation JSONB, -- 목표 비중
    current_price_data JSONB, -- 현재 가격 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 백테스팅 결과
CREATE TABLE backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    indicator_id UUID REFERENCES indicators(id),
    parameters JSONB NOT NULL,
    test_period_start DATE NOT NULL,
    test_period_end DATE NOT NULL,
    metrics JSONB NOT NULL, -- 승률, 수익률, 샤프비율 등
    raw_results JSONB, -- 상세 백테스팅 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 지표 사용 로그 (중요)
CREATE TABLE indicator_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    indicator_id UUID REFERENCES indicators(id),
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'added', 'removed', 'backtested'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 최적화
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_backtest_results_user_id ON backtest_results(user_id);
CREATE INDEX idx_backtest_results_indicator_id ON backtest_results(indicator_id);
CREATE INDEX idx_indicator_usage_log_user_id ON indicator_usage_log(user_id);
CREATE INDEX idx_indicator_usage_log_indicator_id ON indicator_usage_log(indicator_id);
```

### 4. 프론트엔드 아키텍처

#### React.js 애플리케이션 구조
```javascript
// 프로젝트 구조
frontend/
├── src/
│   ├── components/
│   │   ├── common/               // 공통 컴포넌트
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── indicators/           // 지표 관련 컴포넌트
│   │   │   ├── IndicatorCard.jsx
│   │   │   ├── IndicatorList.jsx
│   │   │   ├── PineScriptEditor.jsx
│   │   │   └── InstallationGuide.jsx
│   │   ├── portfolios/           // 포트폴리오 관련 컴포넌트
│   │   │   ├── PortfolioCard.jsx
│   │   │   ├── AssetList.jsx
│   │   │   ├── AllocationChart.jsx
│   │   │   └── RiskAnalysis.jsx
│   │   ├── backtesting/          // 백테스팅 관련 컴포넌트
│   │   │   ├── BacktestForm.jsx
│   │   │   ├── PerformanceChart.jsx
│   │   │   ├── MetricsTable.jsx
│   │   │   └── ReportDownload.jsx
│   │   └── dashboard/            // 대시보드 컴포넌트
│   │       ├── OverviewWidget.jsx
│   │       ├── AlertsPanel.jsx
│   │       └── Recommendations.jsx
│   ├── pages/
│   │   ├── Home.jsx              // 메인 페이지
│   │   ├── Indicators.jsx        // 지표 목록 페이지
│   │   ├── Portfolio.jsx         // 포트폴리오 관리 페이지
│   │   ├── Backtest.jsx          // 백테스팅 페이지
│   │   ├── Dashboard.jsx         // 대시보드 페이지
│   │   ├── Login.jsx             // 로그인 페이지
│   │   └── Pricing.jsx           // 요금제 페이지
│   ├── hooks/
│   │   ├── useAuth.js            // 인증 훅
│   │   ├── useIndicators.js      // 지표 데이터 훅
│   │   ├── usePortfolios.js      // 포트폴리오 데이터 훅
│   │   └── useBacktest.js        // 백테스팅 훅
│   ├── services/
│   │   ├── api.js                // API 서비스
│   │   ├── auth.js               // 인증 서비스
│   │   ├── indicators.js         // 지표 서비스
│   │   ├── portfolios.js         // 포트폴리오 서비스
│   │   └── backtesting.js        // 백테스팅 서비스
│   ├── utils/
│   │   ├── validation.js         // 폼 검증
│   │   ├── formatting.js         // 데이터 포매팅
│   │   └── constants.js          // 상수
│   ├── styles/
│   │   ├── globals.css           // 전역 스타일
│   │   ├── components/           // 컴포넌트별 스타일
│   │   └── themes/              // 테마 설정
│   └── App.jsx                   // 메인 앱 컴포넌트
├── public/
│   ├── pine-scripts/             // Pine Script 다운로드 파일들
│   └── docs/                     // 사용가이드 문서
└── package.json
```

#### 핵심 컴포넌트 예시
```jsx
// IndicatorCard.jsx - 지표 카드 컴포넌트
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const IndicatorCard = ({ indicator, onInstall, onBacktest }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{indicator.name}</CardTitle>
        <p className="text-sm text-gray-600">{indicator.category}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">{indicator.description}</p>
        <div className="flex gap-2">
          <Button onClick={() => onInstall(indicator)}>Install to TradingView</Button>
          <Button variant="outline" onClick={() => onBacktest(indicator)}>Backtest</Button>
        </div>
        {indicator.performance_metrics && (
          <div className="mt-4 text-xs text-gray-500">
            Win Rate: {indicator.performance_metrics.win_rate}% | 
            Avg Return: {indicator.performance_metrics.avg_return}%
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndicatorCard;
```

### 5. 데이터 플로우 및 연동

#### TradingView 연동 플로우
```javascript
// TradingView 통합 서비스
class TradingViewService {
  // Pine Script 코드 생성 및 배포
  async generatePineScript(indicatorConfig) {
    const script = this.compilePineScript(indicatorConfig);
    return await this.deployToTradingView(script);
  }

  // 실시간 데이터 가져오기
  async getRealTimeData(symbol, timeframe) {
    // TradingView API 또는 외부 데이터 제공자 사용
    return await this.fetchMarketData(symbol, timeframe);
  }

  // 차트 알림 워크퍼로우 연동
  async setupWebhookAlert(indicatorId, userId) {
    return await this.createTradingViewAlert(indicatorId, userId);
  }
}
```

#### 백테스팅 엔진 설계
```javascript
// 백테스팅 엔진 서비스
class BacktestingEngine {
  async runBacktest(config) {
    const {
      indicatorId,
      symbol,
      timeframe,
      startDate,
      endDate,
      parameters
    } = config;

    // 1. 과거 데이터 로드
    const historicalData = await this.loadHistoricalData(symbol, timeframe, startDate, endDate);
    
    // 2. 지표 계산 실행
    const indicatorResults = await this.calculateIndicator(historicalData, parameters);
    
    // 3. 성과 메트릭 계산
    const metrics = this.calculateMetrics(indicatorResults);
    
    // 4. 결과 저장 및 반환
    const result = await this.saveBacktestResult({
      indicatorId,
      metrics,
      parameters,
      historicalData: indicatorResults
    });

    return result;
  }

  calculateMetrics(results) {
    return {
      total_return: this.calculateTotalReturn(results),
      win_rate: this.calculateWinRate(results),
      sharpe_ratio: this.calculateSharpeRatio(results),
      max_drawdown: this.calculateMaxDrawdown(results),
      avg_trade_duration: this.calculateAvgTradeDuration(results)
    };
  }
}
```

### 6. 보안 및 성능 최적화

#### 보안 조치
- **인증**: JWT 토큰 기반 인증, refresh token 자동 갱신
- **데이터 암호화**: 포트폴리오 데이터 암호화 저장
- **API 보안**: Rate limiting, CORS 설정, SQL injection 방지
- **개인정보**: GDPR 준수, 최소한의 데이터 수집

#### 성능 최적화
- **캐싱**: Redis를 이용한 API 응답 캐싱
- **데이터베이스**: 인덱스 최적화, 쿼리 성능 튜닝
- **정적 자산**: CDN을 통한 Pine Script 파일 배포
- **실시간 데이터**: WebSocket을 통한 효율적인 실시간 업데이트

### 7. 배포 및 인프라

#### 개발/스테이징/프로덕션 환경
- **개발**: 로컬 Docker 환경
- **스테이징**: AWS ECS + RDS
- **프로덕션**: AWS ECS + RDS + CloudFront

#### CI/CD 파이프라인
```yaml
# GitHub Actions 워크플로우 예시
name: Deploy MoneyParadise

on:
  push:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          cd backend && npm test
          cd frontend && npm test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: |
          docker build -t moneyparadise-staging .
          docker push moneyparadise-staging:latest

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          docker build -t moneyparadise-prod .
          docker push moneyparadise-prod:latest
```

## 요약

MoneyParadise의 기술 아키텍처는 다음과 같은 특징을 가집니다:

1. **TradingView 중심**: Pine Script를 통한 네이티브 교통사이즈
2. **확장 가능한 백엔드**: Node.js + PostgreSQL 기반의 견고한 API
3. **사용자 친화적 프론트엔드**: React.js 기반의 직관적인 웹 인터페이스
4. **강력한 백테스팅**: 독립적인 백테스팅 엔진
5. **보안 중심**: 투자자 자금과 관련된 데이터 보호 우선

이 아키텍처는 MVP 단계에서는 단순하면서도, 향후 스케일업에 필요한 모든 기본 요소를 포함하고 있습니다.
