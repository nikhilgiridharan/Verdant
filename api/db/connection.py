import os
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://carbonpulse:carbonpulse123@localhost:5432/carbonpulse",
)


@contextmanager
def get_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def dict_rows(cur):
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]
