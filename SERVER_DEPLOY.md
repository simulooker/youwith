# 서버에서 공지 자동 수집

Windows 작업 스케줄러와 Codex 자동화는 사용하지 않습니다. 아래는 향후 Linux 서버에 배포할 때 적용할 설정입니다. 현재 외부 서버에 배포하거나 예약을 활성화한 상태는 아닙니다.

## 데이터 흐름

기관이 공개한 RSS 또는 접근이 허용된 게시판 HTML을 서버 수집기가 읽고, 관련성과 모집 기간을 분석해 `db/notice-refresh.json`에 저장합니다. 공식 API가 확인된 기관은 그 API의 문서·키·권한·응답 구조를 확인한 뒤 출처별로 연결합니다. 현재 12개 출처에 공식 JSON API를 연결했다고 주장하지 않습니다. 지원 가능한 출처와 보류 사유는 `SOURCE_REVIEW.md` 기준을 유지합니다.

로그인된 사이트는 `GET /api/notices`로 저장된 공지만 받습니다. 방문자마다 기관을 재조회하지 않으며, 1분 간격의 화면 확인은 이 API만 읽습니다. 사이트 탭을 닫거나 관리자의 PC·Codex를 종료해도 배포 서버의 수집에는 영향이 없습니다.

## systemd를 제공하는 Linux 서버

예제는 프로젝트 위치 `/opt/youwith`, 전용 OS 사용자·그룹 `youwith`, Python `/usr/bin/python3` 기준입니다. Python 3.10 이상과 서버의 정상 TLS 인증서 저장소가 필요합니다. 서버에 해당 사용자와 프로젝트를 준비한 뒤 사용하세요. 실제 경로·사용자가 다르면 service 파일을 먼저 수정합니다.

수집 사용자에게 프로젝트의 `db/`, `frontend/`, `temp/`에 대한 쓰기 권한을 부여합니다. 웹 서버는 수집기가 만든 `db/notice-refresh.json`을 읽을 수 있어야 합니다. 계정 DB와 카카오 키가 있는 `db/` 전체를 정적 웹 폴더로 공개하지 않습니다. 코드 배포 시 기존 `db/` 데이터와 수집 로그를 보존합니다.

배포 서버에서만 다음을 실행합니다.

```sh
sudo cp server/deploy/youwith-notices.service /etc/systemd/system/
sudo cp server/deploy/youwith-notices.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/youwith-notices.service /etc/systemd/system/youwith-notices.timer
systemd-analyze calendar '*-*-* 09:00:00 Asia/Seoul'
sudo systemctl daemon-reload
sudo systemctl enable --now youwith-notices.timer
systemctl list-timers youwith-notices.timer
```

서버 OS 시간대와 관계없이 `Asia/Seoul` 오전 9시를 지정합니다. 실행 중인 동일 작업을 중복 시작하지 않으며, 서버 중단으로 놓친 일정은 복구 후 한 번 실행합니다. 서버가 꺼져 있는 동안 정시 수집을 보장할 수는 없습니다. 최초 데이터 갱신이 필요하면 배포 서버에서 `sudo systemctl start youwith-notices.service`를 별도로 실행합니다.

마지막 실행 확인:

```sh
systemctl status youwith-notices.service
journalctl -u youwith-notices.service -n 50 --no-pager
```

작업은 최대 55분 뒤 실패 처리하며, systemd 제한은 1시간입니다. 수집 결과는 `db/notice-refresh.json`, 출처별 모집중·예정·기간미확인 수와 실행 상태는 `db/notice-schedule-status.json`, 로그는 `temp/notice-refresh/`에서 확인합니다. 일부 출처 오류는 부분 실패로 기록하며, 수집기는 확인 가능한 기존 공지를 유지합니다. robots·로그인 제한·이용조건 제한은 그대로 지킵니다. 새로 API/RSS가 발견되어도 재이용 권한이 자동으로 생기는 것은 아닙니다.

## 다른 호스팅을 선택할 때

systemd가 없는 호스팅은 제공하는 예약 작업 기능에서 UTC `00:00`(한국 09:00)에 `python -X utf8 server/notice_job.py`를 실행하도록 연결합니다. 수집 작업과 웹 서버가 동일한 영구 저장소의 공지를 읽어야 합니다. 예약 실행이 별도 임시 파일 시스템에서 돌아가는 서비스라면 공유 DB·스토리지 연결이 먼저 필요하며, 이 파일 구성만으로 배포됐다고 간주하지 않습니다. 호스팅이 정해지면 그 환경의 예약·저장소 설정을 확정합니다.

참고: [systemd 시간대 지정](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html), [타이머와 재실행 동작](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html).
