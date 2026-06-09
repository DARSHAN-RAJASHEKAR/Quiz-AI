from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException
from app.core.security import create_access_token, decode_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_tokens_for_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    return create_tokens_for_user(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(data: RefreshRequest):
    try:
        user_id = decode_token(data.refresh_token, token_type="refresh")
    except JWTError:
        raise CredentialsException("Invalid or expired refresh token")

    access_token = create_access_token(subject=user_id)
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
async def logout(_: Annotated[User, Depends(get_current_user)]):
    # Stateless JWT — client drops tokens.
    # Add a token denylist (Redis) here for strict invalidation.
    return
