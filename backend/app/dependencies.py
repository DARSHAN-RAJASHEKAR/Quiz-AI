import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        user_id_str = decode_token(token, token_type="access")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise CredentialsException()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise CredentialsException()
    return user
