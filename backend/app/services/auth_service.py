from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, CredentialsException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
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


async def create_tokens_for_user(db: AsyncSession, user: User) -> tuple[str, str]:
    """Issue access + refresh tokens and persist the refresh token hash.

    Returns (access_token, refresh_token).
    """
    user_id = str(user.id)
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)

    user.refresh_token_hash = hash_token(refresh_token)
    await db.commit()

    return access_token, refresh_token


async def rotate_refresh_token(
    db: AsyncSession,
    user_id: str,
    presented_token: str,
) -> tuple[str, str]:
    """
    Verify the presented refresh token, then rotate:
    invalidate old hash, issue new access + refresh tokens.

    Returns (new_access_token, new_refresh_token).
    Raises CredentialsException if token is invalid or already revoked.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise CredentialsException("Invalid refresh token")

    if not user.refresh_token_hash or user.refresh_token_hash != hash_token(presented_token):
        # Token was already rotated or never issued — possible token theft
        user.refresh_token_hash = None
        await db.commit()
        raise CredentialsException("Refresh token already used or revoked")

    new_access = create_access_token(subject=user_id)
    new_refresh = create_refresh_token(subject=user_id)
    user.refresh_token_hash = hash_token(new_refresh)
    await db.commit()

    return new_access, new_refresh


async def invalidate_refresh_token(db: AsyncSession, user: User) -> None:
    """Clear the stored refresh token hash (logout)."""
    user.refresh_token_hash = None
    await db.commit()
