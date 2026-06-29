from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException
from app.core.security import decode_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_tokens_for_user,
    invalidate_refresh_token,
    register_user,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

_COOKIE_NAME = "refresh_token"
_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days in seconds


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_COOKIE_NAME, path="/api/v1/auth")


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=AccessTokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    access_token, refresh_token = await create_tokens_for_user(db, user)
    _set_refresh_cookie(response, refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=AccessTokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token_cookie: Annotated[str | None, Cookie(alias=_COOKIE_NAME)] = None,
):
    if not refresh_token_cookie:
        raise CredentialsException("Missing refresh token")

    try:
        user_id = decode_token(refresh_token_cookie, token_type="refresh")
    except JWTError:
        raise CredentialsException("Invalid or expired refresh token")

    new_access, new_refresh = await rotate_refresh_token(db, user_id, refresh_token_cookie)
    _set_refresh_cookie(response, new_refresh)
    return AccessTokenResponse(access_token=new_access)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    await invalidate_refresh_token(db, current_user)
    _clear_refresh_cookie(response)
