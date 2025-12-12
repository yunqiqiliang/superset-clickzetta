# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
# This file is included in the final Docker image and SHOULD be overridden when
# deploying the image to prod. Settings configured here are intended for use in local
# development environments. Also note that superset_config_docker.py is imported
# as a final step as a means to override "defaults" configured here
#
import logging
import os
import sys

from celery.schedules import crontab
from flask_caching.backends.filesystemcache import FileSystemCache

logger = logging.getLogger()

DATABASE_DIALECT = os.getenv("DATABASE_DIALECT")
DATABASE_USER = os.getenv("DATABASE_USER")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")
DATABASE_HOST = os.getenv("DATABASE_HOST")
DATABASE_PORT = os.getenv("DATABASE_PORT")
DATABASE_DB = os.getenv("DATABASE_DB")

EXAMPLES_USER = os.getenv("EXAMPLES_USER")
EXAMPLES_PASSWORD = os.getenv("EXAMPLES_PASSWORD")
EXAMPLES_HOST = os.getenv("EXAMPLES_HOST")
EXAMPLES_PORT = os.getenv("EXAMPLES_PORT")
EXAMPLES_DB = os.getenv("EXAMPLES_DB")

# The SQLAlchemy connection string.
SQLALCHEMY_DATABASE_URI = (
    f"{DATABASE_DIALECT}://"
    f"{DATABASE_USER}:{DATABASE_PASSWORD}@"
    f"{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

# Use environment variable if set, otherwise construct from components
# This MUST take precedence over any other configuration
SQLALCHEMY_EXAMPLES_URI = os.getenv(
    "SUPERSET__SQLALCHEMY_EXAMPLES_URI",
    (
        f"{DATABASE_DIALECT}://"
        f"{EXAMPLES_USER}:{EXAMPLES_PASSWORD}@"
        f"{EXAMPLES_HOST}:{EXAMPLES_PORT}/{EXAMPLES_DB}"
    ),
)


REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_CELERY_DB = os.getenv("REDIS_CELERY_DB", "0")
REDIS_RESULTS_DB = os.getenv("REDIS_RESULTS_DB", "1")

RESULTS_BACKEND = FileSystemCache("/app/superset_home/sqllab")

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": REDIS_PORT,
    "CACHE_REDIS_DB": REDIS_RESULTS_DB,
}
DATA_CACHE_CONFIG = CACHE_CONFIG
THUMBNAIL_CACHE_CONFIG = CACHE_CONFIG

# Optimize table chart performance to reduce flashing
TABLE_NAMES_CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 600,  # Cache table names for 10 minutes
    "CACHE_KEY_PREFIX": "superset_table_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": REDIS_PORT,
    "CACHE_REDIS_DB": REDIS_RESULTS_DB,
}

# Disable automatic chart refresh in development
AUTO_REFRESH_INTERVAL = 0  # Disable auto-refresh
AUTO_REFRESH_MODE = "fetch"  # Use fetch mode instead of force mode

# ===== ClickZetta Configuration =====
# Disable SQL parsing globally to avoid backtick issues with ClickZetta
PREVENT_UNSAFE_DB_CONNECTIONS = False

# Flask app initialization callback to patch ClickZetta
def patch_clickzetta_on_app_init(app):
    """Patch ClickZetta dialect after app initialization"""
    @app.before_request
    def patch_clickzetta_once():
        """Patch on first request"""
        if not hasattr(app, '_clickzetta_patched'):
            try:
                # Correct import path for ClickZetta dialect
                from clickzetta.connector.sqlalchemy.base import ClickZettaDialect, ClickZettaIdentifierPreparer

                # Store original preparer class
                if not hasattr(ClickZettaDialect, '_original_preparer_class'):
                    ClickZettaDialect._original_preparer_class = ClickZettaIdentifierPreparer

                # Create custom preparer class
                class NoQuoteIdentifierPreparer(ClickZettaIdentifierPreparer):
                    """Custom preparer that doesn't use backticks"""

                    def __init__(self, dialect):
                        super().__init__(dialect)

                    def quote(self, ident, force=None, column=False):
                        """Don't quote identifiers - match original signature"""
                        # Clean up identifier to be SQL-safe
                        ident_str = str(ident)
                        # Remove special characters that would break SQL
                        ident_str = ident_str.replace('(', '_').replace(')', '_').replace('*', 'star')
                        ident_str = ident_str.replace(' ', '_').replace('.', '_')
                        return ident_str

                    def quote_identifier(self, value):
                        """Don't quote identifiers"""
                        value_str = str(value)
                        value_str = value_str.replace('(', '_').replace(')', '_').replace('*', 'star')
                        value_str = value_str.replace(' ', '_').replace('.', '_')
                        return value_str

                    def _quote_free_identifiers(self, *ids):
                        """Override to not quote"""
                        result = []
                        for id in ids:
                            id_str = str(id)
                            id_str = id_str.replace('(', '_').replace(')', '_').replace('*', 'star')
                            id_str = id_str.replace(' ', '_').replace('.', '_')
                            result.append(id_str)
                        return result

                    def format_label(self, label, name=None):
                        """Format label without quotes"""
                        label_str = str(label)
                        label_str = label_str.replace('(', '_').replace(')', '_').replace('*', 'star')
                        label_str = label_str.replace(' ', '_').replace('.', '_')
                        return label_str

                    def format_column(self, column, use_table=False, name=None, table_name=None):
                        """Format column without quotes"""
                        col_name = str(name or column.name)
                        col_name = col_name.replace('(', '_').replace(')', '_').replace('*', 'star')
                        col_name = col_name.replace(' ', '_').replace('.', '_')
                        return col_name

                    def format_table(self, table, use_schema=True, name=None):
                        """Format table without quotes"""
                        if use_schema and table.schema:
                            return f"{table.schema}.{table.name}"
                        return str(table.name)

                # Replace the preparer function to return our custom class
                def custom_preparer(self, dialect):
                    return NoQuoteIdentifierPreparer(dialect)

                ClickZettaDialect.preparer = custom_preparer
                app._clickzetta_patched = True
                app.logger.info("✅ ClickZetta dialect patched to disable backticks")
            except Exception as e:
                app.logger.warning(f"Could not patch ClickZetta dialect: {e}")
                import traceback
                app.logger.warning(traceback.format_exc())
                app._clickzetta_patched = True  # Mark as attempted

# This will be called by superset/__init__.py if the function exists
FLASK_APP_MUTATOR = patch_clickzetta_on_app_init


class CeleryConfig:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CELERY_DB}"
    imports = (
        "superset.sql_lab",
        "superset.tasks.scheduler",
        "superset.tasks.thumbnails",
        "superset.tasks.cache",
    )
    result_backend = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_RESULTS_DB}"
    worker_prefetch_multiplier = 1
    task_acks_late = False
    beat_schedule = {
        "reports.scheduler": {
            "task": "reports.scheduler",
            "schedule": crontab(minute="*", hour="*"),
        },
        "reports.prune_log": {
            "task": "reports.prune_log",
            "schedule": crontab(minute=10, hour=0),
        },
    }


CELERY_CONFIG = CeleryConfig

FEATURE_FLAGS = {"ALERT_REPORTS": True}
ALERT_REPORTS_NOTIFICATION_DRY_RUN = True
WEBDRIVER_BASEURL = f"http://superset_app{os.environ.get('SUPERSET_APP_ROOT', '/')}/"  # When using docker compose baseurl should be http://superset_nginx{ENV{BASEPATH}}/  # noqa: E501
# The base URL for the email report hyperlinks.
WEBDRIVER_BASEURL_USER_FRIENDLY = (
    f"http://localhost:8888/{os.environ.get('SUPERSET_APP_ROOT', '/')}/"
)
SQLLAB_CTAS_NO_LIMIT = True

# ClickZetta SQL Query Mutator - Schema handling is done at engine level via before_cursor_execute
# This mutator is kept for potential future use but currently just passes through
def clickzetta_sql_mutator(sql, security_manager=None, database=None):
    """
    SQL mutator for ClickZetta - schema handling via engine spec
    """
    return sql

SQL_QUERY_MUTATOR = clickzetta_sql_mutator

log_level_text = os.getenv("SUPERSET_LOG_LEVEL", "INFO")
LOG_LEVEL = getattr(logging, log_level_text.upper(), logging.INFO)

if os.getenv("CYPRESS_CONFIG") == "true":
    # When running the service as a cypress backend, we need to import the config
    # located @ tests/integration_tests/superset_test_config.py
    base_dir = os.path.dirname(__file__)
    module_folder = os.path.abspath(
        os.path.join(base_dir, "../../tests/integration_tests/")
    )
    sys.path.insert(0, module_folder)
    from superset_test_config import *  # noqa

    sys.path.pop(0)

#
# Optionally import superset_config_docker.py (which will have been included on
# the PYTHONPATH) in order to allow for local settings to be overridden
#
try:
    import superset_config_docker
    from superset_config_docker import *  # noqa: F403

    logger.info(
        "Loaded your Docker configuration at [%s]", superset_config_docker.__file__
    )
except ImportError:
    logger.info("Using default Docker config...")
