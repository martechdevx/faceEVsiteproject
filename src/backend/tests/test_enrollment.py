import pytest

from routers.enrollment import validate_uploaded_images


def test_accepts_up_to_five_images():
    files = [object() for _ in range(5)]

    assert validate_uploaded_images(files) == files


def test_rejects_more_than_five_images():
    files = [object() for _ in range(6)]

    with pytest.raises(ValueError, match="up to 5"):
        validate_uploaded_images(files)
