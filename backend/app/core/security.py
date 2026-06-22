import base64
import hashlib
import hmac
import os

from jose import jwt, JWTError


SECRET_KEY = "yogeshsecret123"

ALGORITHM = "HS256"


def create_access_token(data):

    token = jwt.encode(

        data,

        SECRET_KEY,

        algorithm=ALGORITHM

    )

    return token


def verify_token(token: str):

    try:

        payload = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )

        return payload

    except JWTError:

        return None


def hash_password(password: str):

    salt = os.urandom(16)

    password_hash = hashlib.pbkdf2_hmac(

        "sha256",

        password.encode("utf-8"),

        salt,

        100000

    )

    return "pbkdf2_sha256$100000${}${}".format(

        base64.b64encode(salt).decode("ascii"),

        base64.b64encode(password_hash).decode("ascii")

    )


def verify_password(

        plain_password,

        hashed_password

):

    try:

        algorithm, iterations, salt, password_hash = hashed_password.split("$")

    except ValueError:

        return False


    if algorithm != "pbkdf2_sha256":

        return False


    expected_hash = hashlib.pbkdf2_hmac(

        "sha256",

        plain_password.encode("utf-8"),

        base64.b64decode(salt),

        int(iterations)

    )


    return hmac.compare_digest(

        base64.b64encode(expected_hash).decode("ascii"),

        password_hash

    )