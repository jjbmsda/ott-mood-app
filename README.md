# OTT Mood (오늘 뭐 볼까)

Mood-based movie recommendation app.

---

## 한국어

### 소개

오늘 뭐 볼까(OTT Mood)는 사용자의 기분 설문을 기반으로 영화를 추천해주는 모바일 앱입니다.
OTT를 먼저 선택하지 않고, 추천된 영화의 상세 화면에서 시청 가능한 OTT 정보를 안내합니다.

### 주요 기능

- 기분 설문 기반 영화 추천
- TMDB 기반 인기 영화 추천
- 상세 화면에서 시청 가능한 OTT 안내
- 지역 선택 (KR / US)
- 언어 선택 (한국어 / 영어)
- 즐겨찾기
- YouTube 예고편 재생

### 기술 스택

- Expo (React Native)
- JavaScript
- React Navigation
- TMDB API
- AsyncStorage

### 프로젝트 구조

ott-mood-app/

- assets/
- config/
  - tmdb.js
- src/
  - constants/
  - screens/
  - services/
  - styles/
- app.config.js
- package.json
- README.md

### 실행 방법

1. 의존성 설치
   npm install

2. 환경 변수 설정 (.env 파일 생성)
   TMDB_API_KEY=your_tmdb_api_key

3. 실행
   npx expo start

### 배포

- Android: EAS Build → Google Play Console
- iOS: EAS Build → TestFlight → App Store

---

## English

### Overview

OTT Mood is a mobile app that recommends movies based on your mood.
You answer a short survey, receive movie recommendations, and check which OTT platforms are available in the detail screen.

### Features

- Mood-based survey
- Movie recommendations using TMDB
- Streaming availability by region
- Region support (KR / US)
- Language support (Korean / English)
- Favorites
- YouTube trailers

### Tech Stack

- Expo (React Native)
- JavaScript
- React Navigation
- TMDB API
- AsyncStorage

### How to Run

npm install
npx expo start

Create a .env file:
TMDB_API_KEY=your_tmdb_api_key

### License

For personal and educational use.
Movie data provided by TMDB.
