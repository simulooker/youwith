# 카카오 로그인 연결

코드는 연결 준비가 되어 있으나, 실제 카카오 앱 키와 시크릿을 입력하기 전에는 카카오 로그인이 동작하지 않습니다. 로컬 검사는 가짜 공급자 응답으로만 실행했으며 실제 카카오 계정 로그인을 성공했다고 보장하지 않습니다.

## 카카오디벨로퍼스에서 한 번 설정

1. https://developers.kakao.com 에 로그인하고 YouWith 앱을 생성하거나 기존 앱을 선택합니다.
2. 앱 관리의 **카카오 로그인 → 사용 설정 → ON**을 설정합니다.
3. **앱 → 플랫폼 키 → REST API 키 → 리다이렉트 URI**에 아래 주소를 정확하게 등록합니다.

   `http://127.0.0.1:4174/auth/kakao/callback`

4. REST API 키와 그 키의 클라이언트 시크릿을 확인합니다. 클라이언트 시크릿은 ON으로 유지합니다. JavaScript 키·어드민 키를 대신 넣으면 안 됩니다.
5. 이 프로젝트의 `db/auth-settings.json`을 PC에서 열고 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`의 빈 값을 채웁니다. 실제 값은 채팅·스크린샷·GitHub에 올리지 않습니다. 파일은 Git 제외 대상이고 웹 공개 폴더 밖에 있습니다.
6. 실행 중인 서버를 종료하고 `npm run dev`로 다시 실행한 뒤 http://127.0.0.1:4174 에서 카카오 로그인을 누릅니다. localhost와 127.0.0.1은 서로 다른 주소이므로 등록 주소와 접속 주소를 맞춥니다.

서버 환경변수 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`로도 지정할 수 있습니다. 환경변수가 파일보다 우선하며 `.env` 파일을 자동으로 읽지는 않습니다. 비어 있는 설정 예제는 `server/auth-settings.example.json`에 있습니다.

닉네임·이메일·전화번호·친구목록·메시지 권한을 추가로 요구하지 않습니다. 카카오 회원번호를 서버에서 확인하고 사이트 회원번호에 연결합니다. 카카오 액세스 토큰과 리프레시 토큰은 저장하지 않습니다. 테스트 앱은 앱에 등록한 멤버만 로그인할 수 있으므로 일반 부원이 로그인하지 못하면 앱 종류와 테스트 멤버 설정도 확인합니다.

## 운영진 승인

처음 카카오 로그인을 마치면 **승인 대기**와 `부원-…` 접수번호를 보여줍니다. 신청자가 접수번호를 운영진에게 알려주면 운영진이 실제 부원인지 확인한 뒤 다음 명령을 실행합니다.

```powershell
npm run members:list
npm run members:approve -- 내부회원ID
```

목록에는 내부 회원 ID·접수번호·승인 여부·카카오 회원번호가 표시됩니다. 접수번호로 신청자를 대조하고 첫 번째 열의 내부 회원 ID를 승인 명령에 넣습니다. 사용자는 승인 후 카카오 로그인을 다시 하면 됩니다. 첫 운영자도 같은 방법으로 승인합니다. 현재 관리 명령은 서버를 관리할 수 있는 운영진이 터미널에서 실행합니다.

승인 취소:

```powershell
npm run members:revoke -- 내부회원ID
```

승인 취소는 기존 세션을 삭제하며 모든 접근에서 승인 여부를 재검사합니다. 카카오 계정과 기존 아이디 계정은 이름이나 이메일로 자동 합치지 않습니다. 기존 아이디·비밀번호 로그인은 접어둔 메뉴로 유지합니다.

## 외부 배포

배포 주소가 정해지면 HTTPS 리다이렉트 URI를 카카오에 추가하고 `KAKAO_REDIRECT_URI`도 같은 주소로 변경합니다. HTTPS 역방향 프록시 뒤에서 `--secure-cookie`로 실행하고 원래 Host를 보존합니다. 프록시 접근 로그에도 콜백 쿼리를 저장하지 않도록 URL 경로만 기록합니다. 기본 Python 서버 로그에서는 쿼리를 제외합니다. GitHub Pages만으로는 이 인증 서버를 실행할 수 없습니다.

로그아웃은 YouWith 세션을 종료합니다. 기기의 카카오계정 전체에서 로그아웃하는 기능은 아닙니다. 승인 대기 계정의 임의 접수번호는 실명이 아니므로 부원 확인은 별도로 해야 합니다.

공식 문서: [설정하기](https://developers.kakao.com/docs/ko/kakaologin/prerequisite), [REST API](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [버튼 디자인](https://developers.kakao.com/docs/ko/kakaologin/design-guide), [테스트 앱 오류 KOE005](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting).
