from functools import lru_cache

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


@lru_cache(maxsize=1)
def configure_cloudinary() -> None:
    missing = [
        name
        for name, value in {
            "CLOUDINARY_CLOUD_NAME": settings.CLOUDINARY_CLOUD_NAME,
            "CLOUDINARY_API_KEY": settings.CLOUDINARY_API_KEY,
            "CLOUDINARY_API_SECRET": settings.CLOUDINARY_API_SECRET,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured on the backend",
        )

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
def upload_image(upload_file: UploadFile) -> str:
    configure_cloudinary()

    upload_file.file.seek(0)
    try:
        result = cloudinary.uploader.upload(
            upload_file.file,
            folder=settings.CLOUDINARY_UPLOAD_FOLDER,
            resource_type="image",
        )
    except Exception as exc:  # pragma: no cover - cloud provider failures are runtime dependent
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to upload image to Cloudinary",
        ) from exc
    finally:
        upload_file.file.seek(0)

    secure_url = result.get("secure_url")
    if not secure_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary did not return an image URL",
        )

    return secure_url