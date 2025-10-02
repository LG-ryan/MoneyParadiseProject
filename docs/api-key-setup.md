# Alpha Vantage API 키 설정

## 🔑 받으신 API 키 정보
- **API Key**: `YCN5UGRTXB1ZF74P`
- **제공업체**: Alpha Vantage
- **사용 가능량**: 개인 개발자용 무료 (월 5회 호출 제한 없음)

## ⚙️ 환경 설정 파일 수정 방법

### .env 파일에 실제 API 키 입력
프로젝트 루트 폴더의 `.env` 파일을 열어서 다음 줄을 수정하세요:

```
ALPHA_VANTAGE_API_KEY=YCN5UGRTXB1ZF74P
```

기존에 `demo_key_for_testing` 이라고 되어 있다면 `YCN5UGRTXB1ZF74P`로 변경하면 됩니다.

## 🚀 설정 완료 후 테스트

### 1단계: 서버 재시작
API 키 설정 후 서버를 다시 실행해야 합니다:

```powershell
# 터미널에서 서버 중지 (Ctrl+C) 후 재실행
cd C:\Users\ryanj\MoneyParadiseProject\src\backend
$env:SERVER_PORT=3001
& "C:\Program Files\nodejs\node.exe" server.js
```

### 2단계: 실제 데이터 확인
서버가 시작되면 터미널에 다음과 같은 메시지가 나와야 합니다:

```
🧪 Alpha Vantage API 테스트 시작...
📊 BTC 데이터 조회 테스트...
✅ BTC: 최신 가격 $97,250.50 (2024-01-02 15:30:00)
📊 AAPL 데이터 조회 테스트...
✅ AAPL: 최신 가격 $193.85 (2024-01-02 15:30:00)
✅ Alpha Vantage API 연결 성공!
```

### 3단계: 브라우저에서 실시간 데이터 확인
- **http://localhost:3001/api/v1/market-data** - 모든 실시간 데이터
- **http://localhost:3001/api/v1/market-data/AAPL** - Apple 주식 실시간 가격
- **http://localhost:3001/api/v1/market-data/BTC** - Bitcoin 실시간 가격

이제 데모 데이터가 아닌 **실제 시장 데이터**를 받아올 수 있습니다! 🎉

## 🎯 성공 확인
터미널에서 `✅ Alpha Vantage API 연결 성공!` 메시지가 나오고, 브라우저에서 실제 거래 시간의 가격이 표시되면 Story 1.2 완료입니다!
