from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, CredentialsException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise ConflictException("Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise CredentialsException("Incorrect email or password")
    if not user.is_active:
        raise CredentialsException("User account is disabled")
    return user


def create_tokens_for_user(user: User) -> TokenResponse:
    user_id = str(user.id)
    return TokenResponse(
        access_token=create_access_token(subject=user_id),
        refresh_token=create_refresh_token(subject=user_id),
    )
