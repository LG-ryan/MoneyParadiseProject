# Story 1.2 Alpha Vantage API 연동 - 테스트 가이드

## 🎯 구현 완료된 기능들

### ✅ Acceptance Criteria 달성 현황
- [x] Alpha Vantage API 접근 토큰 설정 완료 (데모 키 사용)
- [x] 기본 시장 데이터 조회 API 연결 테스트 구현
- [x] 실시간 가격 데이터 수집 시스템 구현 (5분 간격)
- [x] 데이터 저장소 구조 설계 (메모리 기반 캐싱 시스템)
- [x] 에러 핸들링 및 리트라이 메커니즘 구현 (3회 재시도, 지수 백오프)
- [x] 로깅 시스템 기초 구축 (API 호출 상태, 에러 로그)

### 📊 수집 대상 자산
- **주식**: AAPL, MSFT, GOOGL, TSLA, AMZN
- **암호화폐**: BTC, ETH
- **수집 간격**: 5분마다 자동 업데이트

## 🚀 테스트 방법

### 1단계: 서버 재시작
터미널에서 서버를 중지하고 다시 실행하세요:

```powershell
# 서버 중지 (Ctrl+C)
# 그 다음 다시 실행
cd C:\Users\ryanj\MoneyParadiseProject\src\backend
$env:SERVER_PORT=3001
& "C:\Program Files\nodejs\node.exe" server.js
```

### 2단계: 브라우저에서 테스트

#### 🔍 기본 페이지 테스트
- **http://localhost:3001** 접속
- JSON에 새로운 기능들이 표시되는지 확인

#### 📈 데이터 수집 테스트
- **http://localhost:3001/api/v1/market-data** - 모든 캐시된 데이터 조회
- **http://localhost:3001/api/v1/market-data/AAPL** - Apple 주식 데이터 조회  
- **http://localhost:3001/api/v1/market-data/BTC** - Bitcoin 데이터 조회

#### 🔄 데이터 새로고침 테스트
PowerShell에서 다음 명령어로 데이터 수집 강제 실행:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/market-data/refresh" -Method POST
```

### 3단계: 터미널 로그 확인
서버 실행 시 다음과 같은 메시지들이 나와야 합니다:

```
🚀 MoneyParadise Backend Server Started
🧪 Alpha Vantage API 테스트 시작...
📊 BTC 데이터 조회 테스트...
✅ BTC: 최신 가격 $45000.00 (2024-01-02 15:30:00)
⏰ 자동 데이터 수집 스케줄 시작...
📅 정기 데이터 수집 시작
✅ AAPL: $150.00 (2024-01-02 15:35:00)
✅ BTC: $45100.00 (2024-01-02 15:35:00)
```

## 🎯 성공 확인 기준

1. **서버 로그**: Alpha Vantage API 연결 성공 메시지
2. **브라우저**: 주식/암호화폐 데이터가 JSON으로 표시
3. **자동화**: 5분마다 자동 데이터 수집 시작
4. **API 응답**: 온라인으로 실시간 가격 확인 가능

모든 테스트가 성공하면 **Story 1.2 완료**이고 **Story 1.3 (WebSocket 실시간 스트리밍)**으로 진행합니다!
