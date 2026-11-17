"""Kakao REST login. Credentials and provider tokens stay on the server."""
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class KakaoConfig:
    client_id: str = ""
    client_secret: str = ""
    redirect_uri: str = ""

    @classmethod
    def load(cls, path):
        values = {}
        if Path(path).exists():
            values = json.loads(Path(path).read_text(encoding="utf-8-sig"))
        return cls(*(os.environ.get(name, values.get(name, "")) for name in
                     ("KAKAO_REST_API_KEY", "KAKAO_CLIENT_SECRET", "KAKAO_REDIRECT_URI")))

    @property
    def ready(self):
        if not all(isinstance(v, str) and v.strip() for v in (self.client_id, self.client_secret, self.redirect_uri)):
            return False
        try:
            uri = urlsplit(self.redirect_uri)
            return (uri.scheme == "https" or (uri.scheme == "http" and uri.hostname in {"127.0.0.1", "localhost"})) and bool(uri.netloc) and not uri.username and not uri.password and uri.path == "/auth/kakao/callback" and not uri.query and not uri.fragment
        except ValueError:
            return False

    def authorize_url(self, state):
        return "https://kauth.kakao.com/oauth/authorize?" + urlencode({
            "response_type": "code", "client_id": self.client_id,
            "redirect_uri": self.redirect_uri, "state": state})


def fetch_json(request):
    with urlopen(request, timeout=10) as response:
        data = response.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise ValueError("Provider response too large")
        return json.loads(data)


def fetch_identity(config, code):
    payload = urlencode({"grant_type": "authorization_code", "client_id": config.client_id,
                         "client_secret": config.client_secret, "redirect_uri": config.redirect_uri,
                         "code": code}).encode()
    tokens = fetch_json(Request("https://kauth.kakao.com/oauth/token", data=payload,
                                headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}))
    token = tokens.get("access_token")
    if not isinstance(token, str) or not token or not re.fullmatch(r"[\x21-\x7e]+", token):
        raise ValueError("Missing access token")
    user = fetch_json(Request("https://kapi.kakao.com/v2/user/me",
                              headers={"Authorization": "Bearer " + token}))
    identity = user.get("id")
    if type(identity) is not int or identity <= 0:
        raise ValueError("Missing Kakao identity")
    # Do not request email, phone number, friends, messages or profile scopes.
    return str(identity)
