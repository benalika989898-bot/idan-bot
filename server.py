import logging
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

import bot

app = FastAPI(title="Facebook Bot Server")
security = HTTPBearer(auto_error=False)
logger = logging.getLogger("idan-bot-server")

BOT_SERVER_SECRET = os.environ.get("BOT_SERVER_SECRET", "")


def verify_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if BOT_SERVER_SECRET and (not credentials or credentials.credentials != BOT_SERVER_SECRET):
        raise HTTPException(status_code=401, detail="Invalid or missing token")


# ── Request / Response models ─────────────────────────────────

class GroupTarget(BaseModel):
    url: str


class ExecutePostRequest(BaseModel):
    account_email: str
    account_password: str
    session_state: dict | None = None
    groups: list[GroupTarget]
    content: str
    image_url: str | None = None


class GroupResult(BaseModel):
    group_url: str
    success: bool
    error: str | None = None


class ExecutePostResponse(BaseModel):
    results: list[GroupResult]
    updated_session_state: dict | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    session_state: dict | None = None
    error: str | None = None


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/execute-post", response_model=ExecutePostResponse, dependencies=[Depends(verify_token)])
async def execute_post(req: ExecutePostRequest):
    try:
        result = await bot.execute_post(
            account_email=req.account_email,
            account_password=req.account_password,
            session_state=req.session_state,
            groups=[g.model_dump() for g in req.groups],
            content=req.content,
            image_url=req.image_url,
        )
        return result
    except Exception as exc:
        logger.exception("execute_post failed")
        raise HTTPException(status_code=500, detail=str(exc) or repr(exc))


@app.post("/login", response_model=LoginResponse, dependencies=[Depends(verify_token)])
async def login_endpoint(req: LoginRequest):
    try:
        result = await bot.execute_login(
            email=req.email,
            password=req.password,
        )
        return result
    except Exception as exc:
        logger.exception("login endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc) or repr(exc))


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
