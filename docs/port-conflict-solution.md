# 포트 충돌 해결 방법

## 🚨 현재 상황
포트 3000번이 이미 사용 중이어서 새로운 서버가 실행되지 않습니다.

## 🔧 해결 방법들

### 방법 1: 기존 프로세스 종료 (권장)
```powershell
# 포트 3000 사용 중인 프로세스 찾기
netstat -ano | findstr :3000

# PID 확인 후 해당 프로세스 종료 (PID는 위 명령어 결과에서 마지막 숫자)
taskkill /PID [PID번호] /F
```

### 방법 2: 다른 포트 사용
```powershell
# 환경변수로 다른 포트 설정
$env:SERVER_PORT=3001
& "C:\Program Files\nodejs\node.exe" server.js
```

### 방법 3: 간단한 방법 - 다른 포트로 서버 수정
.env 파일에서 포트를 3001로 변경:

```
SERVER_PORT=3001
```

---

## 🎯 즉시 해결 방법 (추천)

터미널에서 다음을 실행하세요:

```powershell
# 1. 포트 3000 사용 중인 프로세스 찾기
netstat -ano | findstr :3000

# 2. 결과에서 마지막 숫자 (PID) 복사 후 다음 실행
taskkill /PID [여기에_PID_번호] /F

# 3. 서버 다시 실행
& "C:\Program Files\nodejs\node.exe" server.js
```

또는 더 간단하게:

```powershell
# 포트 3001로 서버 실행
$env:SERVER_PORT=3001
& "C:\Program Files\nodejs\node.exe" server.js
```

그러면 브라우저에서 **http://localhost:3001** 로 접속하시면 됩니다!
