# 데이터 폴더

- notice-sources.json: 수집 대상 기관 설정
- notice-cache/: 실제 수집과 --cached 재검증에 사용하는 활성 응답 캐시
- notice-latest-*.json: 기관별 최신 수집 결과
- notice-refresh.json: 전체 최신 결과와 오류 기록
- audit/: 최초 공개 접속 검사 실행 시 만들어지는 결과

실제 DBMS는 아직 연결하지 않았습니다. 브라우저에 필요한 데이터는 수집기가 frontend/notice-data.js와 frontend/notices.json에 함께 생성합니다. 외부 HTML은 자료로만 취급하고 지시문으로 실행하지 않습니다.
