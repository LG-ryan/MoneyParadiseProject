# MoneyParadise Docker 개발 환경 설정

## 🐳 Docker 설치 필요

Docker Desktop이 설치되지 않은 상태입니다. 다음 단계를 따라 설치해주세요:

### Windows용 Docker Desktop 설치

#### 1. Docker Desktop 다운로드
```
공식 사이트: https://www.docker.com/products/docker-desktop
다운로드: "Download for Windows" 버튼 클릭
```

#### 2. 설치 요구사항 확인
- Windows 10 64-bit: Pro, Enterprise, or Education (Build 15063 이상)
- 또는 Windows 11 64-bit
- WSL 2 기능 활성화 필요
- BIOS에서 Hyper-V 및 Containers 기능 지원

#### 3. 설치 과정
1. 다운로드한 Docker Desktop Installer 실행
2. "Use WSL 2 instead of Hyper-V" 옵션 체크 권장
3. 설치 완료 후 시스템 재시작

#### 4. 설치 확인
```powershell
# PowerShell에서 실행
docker --version
docker-compose --version
```

### 🚀 Docker 설치 완료 후 다음 단계

설치가 완료되면 다음 명령어들을 실행해보세요:

```powershell
# 1. Node.js 22 Alpine 이미지 다운로드
docker pull node:22-alpine

# 2. MoneyParadise 백엔드 폴더로 이동
cd src\backend

# 3. Docker 컨테이너 내에서 npm install 실행
docker run -it --rm -v ${PWD}:/app -w /app node:22-alpine npm install

# 4. 개발 서버 실행 (샘플)
docker run -it --rm -p 3000:3000 -v ${PWD}:/app -w /app node:22-alpine npm start
```

### 🔧 대안: Docker 없이 진행하기

Docker 설치가 복잡하다면, Node.js를 직접 설치해서 진행할 수도 있습니다:

#### 직접 Node.js 설치
```
다운로드: https://nodejs.org/
설치 후: PowerShell 재시작
확인: node --version, npm --version
```

그 다음 바로 다음 명령어들 실행:
```powershell
cd src\backend
npm install
npm start
```

### 📝 현재 상황

**Story 1.1 상태**: 95% 완료 ✅
- 코드 작성 완료
- 설정 파일 완료  
- 실행 환경만 남음 (Docker 또는 Node.js 설치)

Docker 또는 Node.js 설치가 완료되면 즉시 **Story 1.2: Alpha Vantage API 연동**으로 진행 가능합니다!

---

어떤 방법으로 진행하시겠어요?
1. **Docker Desktop 설치** (더 깔끔한 환경)
2. **Node.js 직접 설치** (빠른 진행)
