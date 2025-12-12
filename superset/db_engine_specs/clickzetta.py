"""
ClickZetta DB Engine Spec - Monkey patch dialect to disable backticks
"""
import re
from typing import Any, Dict, List, Optional, Set, TYPE_CHECKING

from superset.db_engine_specs.base import BaseEngineSpec, LimitMethod
from sqlalchemy import event
from sqlalchemy.engine import Engine

if TYPE_CHECKING:
    from superset.models.core import Database


# Monkey patch to remove backticks from ClickZetta dialect
def patch_clickzetta_dialect():
    """
    Patch ClickZetta dialect to not use backticks for identifiers
    """
    try:
        from clickzetta.connector.sqlalchemy.base import ClickZettaDialect

        # Store original identifier preparer
        original_preparer = ClickZettaDialect.identifier_preparer_class

        # Create a custom preparer that doesn't quote identifiers
        class NoQuoteIdentifierPreparer(original_preparer):
            def quote(self, ident, force=None):
                """Override to not quote identifiers"""
                # Just return the identifier without quotes
                return ident

            def quote_identifier(self, value):
                """Override to not quote identifiers"""
                return value

        # Replace the preparer class
        ClickZettaDialect.identifier_preparer_class = NoQuoteIdentifierPreparer

        print("✅ ClickZetta dialect patched to disable backticks")
        return True
    except Exception as e:
        print(f"⚠️  Could not patch ClickZetta dialect: {e}")
        return False


# Apply the patch when this module is imported
patch_clickzetta_dialect()


class ClickZettaEngineSpec(BaseEngineSpec):
    """Engine spec for ClickZetta"""

    engine = "clickzetta"
    engine_name = "ClickZetta"

    disable_ssh_tunneling = True
    allows_joins = True
    allows_subqueries = True
    allows_sql_comments = True
    allows_alias_in_select = True
    allows_alias_in_orderby = True
    max_column_name_length = 255
    limit_method = LimitMethod.WRAP_SQL

    _time_grain_expressions = {
        None: "{col}",
        "PT1S": "DATE_TRUNC('SECOND', {col})",
        "PT1M": "DATE_TRUNC('MINUTE', {col})",
        "PT1H": "DATE_TRUNC('HOUR', {col})",
        "P1D": "DATE_TRUNC('DAY', {col})",
        "P1W": "DATE_TRUNC('WEEK', {col})",
        "P1M": "DATE_TRUNC('MONTH', {col})",
        "P1Y": "DATE_TRUNC('YEAR', {col})",
    }

    @classmethod
    def epoch_to_dttm(cls) -> str:
        return "FROM_UNIXTIME({col})"

    @classmethod
    def convert_dttm(
        cls, target_type: str, dttm: Any, db_extra: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        sqla_type = cls.get_sqla_column_type(target_type)
        if sqla_type:
            type_str = sqla_type.__visit_name__.upper()
            if type_str == "TIMESTAMP":
                return f"CAST('{dttm.isoformat(sep=' ', timespec='seconds')}' AS TIMESTAMP)"
            if type_str == "DATE":
                return f"CAST('{dttm.date().isoformat()}' AS DATE)"
        return None

    @staticmethod
    def remove_backticks(sql: str) -> str:
        """Remove backticks and ANSI escape sequences"""
        sql = re.sub(r'\x1b\[[0-9;]*m', '', sql)
        sql = re.sub(r'`([^`]+)`', r'\1', sql)
        return sql

    @classmethod
    def get_table_names(
        cls, database: Any, inspector: Any, schema: Optional[str] = None
    ) -> List[str]:
        try:
            tables = inspector.get_table_names(schema=schema)
            # ClickZetta returns tuples like (table_name, schema, catalog)
            # We need to extract just the table name
            result = []
            for t in tables:
                if isinstance(t, tuple):
                    # Extract first element (table name)
                    result.append(str(t[0]))
                elif isinstance(t, str):
                    result.append(t)
                else:
                    result.append(str(t))
            return result
        except Exception as e:
            print(f"Error in get_table_names: {e}")
            return []

    @classmethod
    def get_view_names(
        cls, database: Any, inspector: Any, schema: Optional[str] = None
    ) -> List[str]:
        try:
            views = inspector.get_view_names(schema=schema)
            # ClickZetta may return tuples like (view_name, schema, catalog)
            result = []
            for v in views:
                if isinstance(v, tuple):
                    result.append(str(v[0]))
                elif isinstance(v, str):
                    result.append(v)
                else:
                    result.append(str(v))
            return result
        except Exception as e:
            print(f"Error in get_view_names: {e}")
            return []

    @classmethod
    def get_columns(
        cls, inspector: Any, table: Any, options: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        try:
            # Extract table name and schema from Table object
            table_name = table.table if hasattr(table, 'table') else str(table)
            schema = table.schema if hasattr(table, 'schema') else None

            table_str = str(table_name) if not isinstance(table_name, str) else table_name
            columns = inspector.get_columns(table_str, schema=schema)

            normalized_columns = []
            for col in columns:
                if isinstance(col, dict):
                    normalized_col = {
                        'column_name': col.get('name', col.get('column_name', 'unknown')),
                        'name': col.get('name', col.get('column_name', 'unknown')),
                        'type': col.get('type', 'VARCHAR'),
                        'nullable': col.get('nullable', True),
                        'default': col.get('default'),
                        'autoincrement': col.get('autoincrement', False),
                        'comment': col.get('comment'),
                    }
                    normalized_columns.append(normalized_col)
                else:
                    try:
                        col_name = str(col.name if hasattr(col, 'name') else col)
                        normalized_columns.append({
                            'column_name': col_name,
                            'name': col_name,
                            'type': col.type if hasattr(col, 'type') else 'VARCHAR',
                            'nullable': True
                        })
                    except Exception:
                        continue
            return normalized_columns
        except Exception as e:
            print(f"Error getting columns for {table_name}: {e}")
            return []

    @classmethod
    def fetch_data(cls, cursor: Any, limit: Optional[int] = None) -> List[Any]:
        try:
            if limit:
                return cursor.fetchmany(limit)
            return cursor.fetchall()
        except Exception:
            return []

    @classmethod
    def get_catalog_names(cls, database: Any, inspector: Any) -> List[str]:
        return []

    @classmethod
    def select_star(
        cls, database: "Database", table: Any, engine: Any,
        limit: int = 100, show_cols: bool = False,
        indent: bool = True, latest_partition: bool = True,
        cols: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        # Extract table name and schema from Table object
        table_name = table.table if hasattr(table, 'table') else str(table)
        schema = table.schema if hasattr(table, 'schema') else None

        if schema:
            full_table = f"{schema}.{table_name}"
        else:
            full_table = table_name

        if show_cols and cols:
            col_list = ", ".join([col["column_name"] for col in cols])
            return f"SELECT {col_list}\nFROM {full_table}\nLIMIT {limit}"
        else:
            return f"SELECT *\nFROM {full_table}\nLIMIT {limit}"

    @classmethod
    def apply_limit_to_sql(
        cls, sql: str, limit: int, database: "Database", force: bool = False
    ) -> str:
        sql = cls.remove_backticks(sql)
        return f"SELECT * FROM (\n{sql}\n) AS _limit_subquery\nLIMIT {limit}"

    @classmethod
    def get_prequeries(
        cls,
        database: "Database",
        catalog: Optional[str] = None,
        schema: Optional[str] = None,
    ) -> List[str]:
        """
        Return pre-queries to set schema context for ClickZetta
        """
        prequeries = []
        if schema:
            prequeries.append(f"USE SCHEMA {schema}")
        return prequeries

    @classmethod
    def get_sqla_engine(
        cls, database: "Database", catalog: Optional[str] = None,
        schema: Optional[str] = None, source: Optional[str] = None,
    ) -> Any:
        engine = super().get_sqla_engine(database, catalog, schema, source)

        # Add event listener to remove backticks from all queries
        @event.listens_for(engine, "before_cursor_execute", retval=True)
        def remove_backticks_from_statement(
            conn, cursor, statement, parameters, context, executemany
        ):
            # Remove backticks from the statement
            cleaned_statement = cls.remove_backticks(statement)
            return cleaned_statement, parameters

        return engine

    @classmethod
    def validate_sql(
        cls, sql: str, catalog: Optional[str] = None, schema: Optional[str] = None,
    ) -> Set[Any]:
        try:
            cleaned_sql = cls.remove_backticks(sql)
            return super().validate_sql(cleaned_sql, catalog, schema)
        except Exception:
            return set()

    @classmethod
    def get_table_names_from_sql(cls, sql: str, database: "Database") -> Set[str]:
        try:
            cleaned_sql = cls.remove_backticks(sql)
            return super().get_table_names_from_sql(cleaned_sql, database)
        except Exception:
            return set()

    @classmethod
    def parse_sql(
        cls, sql: str, strip_comments: bool = False, engine: Optional[str] = None,
    ) -> Any:
        try:
            cleaned_sql = cls.remove_backticks(sql)
            return super().parse_sql(cleaned_sql, strip_comments, engine)
        except Exception as e:
            print(f"SQL parsing skipped for ClickZetta: {e}")
            return None
