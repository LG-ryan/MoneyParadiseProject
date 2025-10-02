# Node.js PATH 문제 해결 방법

## 🔧 현재 상황
Node.js가 설치되었지만 환경변수 PATH에 등록되지 않아서 `node`와 `npm` 명령어를 인식하지 못하고 있습니다.

## 🚀 해결 방법 (즉시 실행 가능)

### 방법 1: 전체 경로 사용
터미널에서 다음 명령어를 사용하세요:

```powershell
# 프로젝트 폴더로 이동
cd C:\Users\ryanj\MoneyParadiseProject\src\backend

# Node.js 전체 경로로 실행
& "C:\Program Files\nodejs\node.exe" server.js
```

### 방법 2: 환경변수 영구 추가 (권장)
```powershell
# 현재 세션에서만 PATH 추가
$env:PATH += ";C:\Program Files\nodejs"

# 이후부터는 node 명령어 사용 가능
node --version
npm --version
```

### 방법 3: 시스템 환경변수 영구 설정
1. **Windows 키 + R** → `sysdm.cpl` 입력 → 엔터
2. **고급** 탭 → **환경 변수** 버튼
3. **시스템 변수**에서 `Path` 찾기 → **편집**
4. **새로 만들기** → `C:\Program Files\nodejs` 추가
5. 모든 창 **확인** → PowerShell 재시작

---

## 🎯 즉시 테스트해보세요!

아무 방법이나 사용해서 서버를 실행하고 브라우저에서 확인해보세요:

```powershell
# 현재 PowerShell에서 실행
cd C:\Users\ryanj\MoneyParadiseProject\src\backend
& "C:\Program Files\nodejs\node.exe" server.js
```

서버가 시작되면 브라우저에서:
- http://localhost:3000
- http://localhost:3000/health

이 페이지들이 JSON 응답을 보여주면 Story 1.1 완료입니다!
