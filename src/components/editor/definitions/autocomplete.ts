import type { ColumnDetail, SchemaInfo, TableInfo } from '@/entities'

export interface SchemaContext {
  databases: SchemaInfo[]
  tables: Record<string, TableInfo[]> // database -> tables
  columns: Record<string, ColumnDetail[]> // "database.table" -> columns
}

// Keyword categories
export type KeywordCategory = 'DQL' | 'DML' | 'DDL' | 'DCL' | 'TCL' | 'type' | 'clause' | 'operator'

export interface SqlKeyword {
  name: string
  category: KeywordCategory
}

// Function categories
export type FunctionCategory =
  | 'aggregate'
  | 'string'
  | 'numeric'
  | 'date'
  | 'conditional'
  | 'json'
  | 'window'

export interface SqlFunction {
  name: string
  signature: string
  description: string
  category: FunctionCategory
}

// Snippet interface
export interface SqlSnippet {
  label: string
  template: string
  description: string
}

// SQL keywords with category metadata
export const SQL_KEYWORDS_WITH_INFO: SqlKeyword[] = [
  // Data Query Language (DQL)
  { name: 'SELECT', category: 'DQL' },
  { name: 'FROM', category: 'DQL' },
  { name: 'WHERE', category: 'DQL' },
  { name: 'AND', category: 'operator' },
  { name: 'OR', category: 'operator' },
  { name: 'NOT', category: 'operator' },
  { name: 'IN', category: 'operator' },
  { name: 'BETWEEN', category: 'operator' },
  { name: 'LIKE', category: 'operator' },
  { name: 'IS', category: 'operator' },
  { name: 'NULL', category: 'clause' },
  { name: 'AS', category: 'clause' },
  { name: 'DISTINCT', category: 'DQL' },
  { name: 'ALL', category: 'DQL' },
  { name: 'ORDER', category: 'DQL' },
  { name: 'BY', category: 'clause' },
  { name: 'ASC', category: 'clause' },
  { name: 'DESC', category: 'clause' },
  { name: 'LIMIT', category: 'DQL' },
  { name: 'OFFSET', category: 'DQL' },
  { name: 'GROUP', category: 'DQL' },
  { name: 'HAVING', category: 'DQL' },
  { name: 'UNION', category: 'DQL' },
  { name: 'INTERSECT', category: 'DQL' },
  { name: 'EXCEPT', category: 'DQL' },
  { name: 'JOIN', category: 'DQL' },
  { name: 'INNER', category: 'DQL' },
  { name: 'LEFT', category: 'DQL' },
  { name: 'RIGHT', category: 'DQL' },
  { name: 'FULL', category: 'DQL' },
  { name: 'OUTER', category: 'DQL' },
  { name: 'CROSS', category: 'DQL' },
  { name: 'ON', category: 'clause' },
  { name: 'USING', category: 'clause' },
  { name: 'NATURAL', category: 'DQL' },
  { name: 'EXISTS', category: 'operator' },
  { name: 'ANY', category: 'operator' },
  { name: 'SOME', category: 'operator' },

  // Data Manipulation Language (DML)
  { name: 'INSERT', category: 'DML' },
  { name: 'INTO', category: 'DML' },
  { name: 'VALUES', category: 'DML' },
  { name: 'UPDATE', category: 'DML' },
  { name: 'SET', category: 'DML' },
  { name: 'DELETE', category: 'DML' },
  { name: 'TRUNCATE', category: 'DML' },
  { name: 'MERGE', category: 'DML' },

  // Data Definition Language (DDL)
  { name: 'CREATE', category: 'DDL' },
  { name: 'ALTER', category: 'DDL' },
  { name: 'DROP', category: 'DDL' },
  { name: 'TABLE', category: 'DDL' },
  { name: 'DATABASE', category: 'DDL' },
  { name: 'SCHEMA', category: 'DDL' },
  { name: 'INDEX', category: 'DDL' },
  { name: 'VIEW', category: 'DDL' },
  { name: 'CONSTRAINT', category: 'DDL' },
  { name: 'PRIMARY', category: 'DDL' },
  { name: 'KEY', category: 'DDL' },
  { name: 'FOREIGN', category: 'DDL' },
  { name: 'REFERENCES', category: 'DDL' },
  { name: 'UNIQUE', category: 'DDL' },
  { name: 'CHECK', category: 'DDL' },
  { name: 'DEFAULT', category: 'DDL' },
  { name: 'AUTO_INCREMENT', category: 'DDL' },
  { name: 'SERIAL', category: 'DDL' },
  { name: 'IDENTITY', category: 'DDL' },
  { name: 'CASCADE', category: 'DDL' },
  { name: 'RESTRICT', category: 'DDL' },

  // Data Control Language (DCL)
  { name: 'GRANT', category: 'DCL' },
  { name: 'REVOKE', category: 'DCL' },
  { name: 'PRIVILEGES', category: 'DCL' },
  { name: 'TO', category: 'clause' },
  { name: 'WITH', category: 'clause' },
  { name: 'OPTION', category: 'clause' },

  // Transaction Control Language (TCL)
  { name: 'BEGIN', category: 'TCL' },
  { name: 'COMMIT', category: 'TCL' },
  { name: 'ROLLBACK', category: 'TCL' },
  { name: 'SAVEPOINT', category: 'TCL' },
  { name: 'TRANSACTION', category: 'TCL' },
  { name: 'START', category: 'TCL' },

  // Data types
  { name: 'INT', category: 'type' },
  { name: 'INTEGER', category: 'type' },
  { name: 'BIGINT', category: 'type' },
  { name: 'SMALLINT', category: 'type' },
  { name: 'TINYINT', category: 'type' },
  { name: 'DECIMAL', category: 'type' },
  { name: 'NUMERIC', category: 'type' },
  { name: 'FLOAT', category: 'type' },
  { name: 'DOUBLE', category: 'type' },
  { name: 'REAL', category: 'type' },
  { name: 'BOOLEAN', category: 'type' },
  { name: 'BOOL', category: 'type' },
  { name: 'CHAR', category: 'type' },
  { name: 'VARCHAR', category: 'type' },
  { name: 'TEXT', category: 'type' },
  { name: 'BLOB', category: 'type' },
  { name: 'DATE', category: 'type' },
  { name: 'TIME', category: 'type' },
  { name: 'DATETIME', category: 'type' },
  { name: 'TIMESTAMP', category: 'type' },
  { name: 'YEAR', category: 'type' },
  { name: 'JSON', category: 'type' },
  { name: 'UUID', category: 'type' },
  { name: 'BIGSERIAL', category: 'type' },

  // Common clauses
  { name: 'IF', category: 'clause' },
  { name: 'ELSE', category: 'clause' },
  { name: 'THEN', category: 'clause' },
  { name: 'END', category: 'clause' },
  { name: 'CASE', category: 'clause' },
  { name: 'WHEN', category: 'clause' },
  { name: 'COALESCE', category: 'clause' },
  { name: 'NULLIF', category: 'clause' },
  { name: 'CAST', category: 'clause' },
  { name: 'CONVERT', category: 'clause' },
  { name: 'OVER', category: 'clause' },
  { name: 'PARTITION', category: 'clause' },
  { name: 'WINDOW', category: 'clause' },
  { name: 'ROW', category: 'clause' },
  { name: 'ROWS', category: 'clause' },
  { name: 'RANGE', category: 'clause' },
  { name: 'UNBOUNDED', category: 'clause' },
  { name: 'PRECEDING', category: 'clause' },
  { name: 'FOLLOWING', category: 'clause' },
  { name: 'CURRENT', category: 'clause' },

  // MySQL specific
  { name: 'ENGINE', category: 'DDL' },
  { name: 'CHARSET', category: 'DDL' },
  { name: 'COLLATE', category: 'DDL' },
  { name: 'UNSIGNED', category: 'type' },
  { name: 'ZEROFILL', category: 'type' },
  { name: 'REPLACE', category: 'DML' },
  { name: 'IGNORE', category: 'clause' },
  { name: 'DELAYED', category: 'clause' },
  { name: 'LOW_PRIORITY', category: 'clause' },
  { name: 'HIGH_PRIORITY', category: 'clause' },
  { name: 'STRAIGHT_JOIN', category: 'DQL' },
  { name: 'SQL_CALC_FOUND_ROWS', category: 'DQL' },
  { name: 'FORCE', category: 'clause' },
  { name: 'USE', category: 'clause' },
  { name: 'EXPLAIN', category: 'DQL' },
  { name: 'ANALYZE', category: 'DQL' },

  // PostgreSQL specific
  { name: 'RETURNING', category: 'DQL' },
  { name: 'ILIKE', category: 'operator' },
  { name: 'SIMILAR', category: 'operator' },
  { name: 'ARRAY', category: 'type' },
  { name: 'VARIADIC', category: 'clause' },
  { name: 'LATERAL', category: 'DQL' },
  { name: 'RECURSIVE', category: 'DQL' },
  { name: 'MATERIALIZED', category: 'DDL' },
  { name: 'CONCURRENTLY', category: 'DDL' },
  { name: 'TABLESPACE', category: 'DDL' },
  { name: 'EXTENSION', category: 'DDL' },
  { name: 'SEQUENCE', category: 'DDL' },
  { name: 'GENERATED', category: 'DDL' },
  { name: 'ALWAYS', category: 'clause' },
  { name: 'STORED', category: 'DDL' },
  { name: 'INCLUDE', category: 'clause' },
  { name: 'NULLS', category: 'clause' },
  { name: 'FIRST', category: 'clause' },
  { name: 'LAST', category: 'clause' },
]

// SQL functions with documentation
export const SQL_FUNCTIONS_WITH_INFO: SqlFunction[] = [
  // Aggregate functions
  {
    name: 'COUNT',
    signature: 'COUNT(expr)',
    description: 'Returns the count of non-null values',
    category: 'aggregate',
  },
  {
    name: 'SUM',
    signature: 'SUM(expr)',
    description: 'Returns the sum of all values',
    category: 'aggregate',
  },
  {
    name: 'AVG',
    signature: 'AVG(expr)',
    description: 'Returns the average value',
    category: 'aggregate',
  },
  {
    name: 'MIN',
    signature: 'MIN(expr)',
    description: 'Returns the minimum value',
    category: 'aggregate',
  },
  {
    name: 'MAX',
    signature: 'MAX(expr)',
    description: 'Returns the maximum value',
    category: 'aggregate',
  },
  {
    name: 'GROUP_CONCAT',
    signature: 'GROUP_CONCAT(expr [SEPARATOR str])',
    description: 'Concatenates values from a group into a string (MySQL)',
    category: 'aggregate',
  },
  {
    name: 'STRING_AGG',
    signature: 'STRING_AGG(expr, delimiter)',
    description: 'Concatenates values from a group into a string (PostgreSQL)',
    category: 'aggregate',
  },
  {
    name: 'ARRAY_AGG',
    signature: 'ARRAY_AGG(expr)',
    description: 'Collects values into an array (PostgreSQL)',
    category: 'aggregate',
  },
  {
    name: 'JSON_AGG',
    signature: 'JSON_AGG(expr)',
    description: 'Aggregates values as a JSON array (PostgreSQL)',
    category: 'aggregate',
  },
  {
    name: 'JSONB_AGG',
    signature: 'JSONB_AGG(expr)',
    description: 'Aggregates values as a JSONB array (PostgreSQL)',
    category: 'aggregate',
  },

  // String functions
  {
    name: 'CONCAT',
    signature: 'CONCAT(str1, str2, ...)',
    description: 'Concatenates strings together',
    category: 'string',
  },
  {
    name: 'CONCAT_WS',
    signature: 'CONCAT_WS(separator, str1, str2, ...)',
    description: 'Concatenates strings with a separator',
    category: 'string',
  },
  {
    name: 'SUBSTRING',
    signature: 'SUBSTRING(str, start, length)',
    description: 'Extracts a substring from a string',
    category: 'string',
  },
  {
    name: 'SUBSTR',
    signature: 'SUBSTR(str, start, length)',
    description: 'Extracts a substring from a string',
    category: 'string',
  },
  {
    name: 'LEFT',
    signature: 'LEFT(str, length)',
    description: 'Returns the leftmost characters of a string',
    category: 'string',
  },
  {
    name: 'RIGHT',
    signature: 'RIGHT(str, length)',
    description: 'Returns the rightmost characters of a string',
    category: 'string',
  },
  {
    name: 'LENGTH',
    signature: 'LENGTH(str)',
    description: 'Returns the length of a string in bytes',
    category: 'string',
  },
  {
    name: 'CHAR_LENGTH',
    signature: 'CHAR_LENGTH(str)',
    description: 'Returns the length of a string in characters',
    category: 'string',
  },
  {
    name: 'UPPER',
    signature: 'UPPER(str)',
    description: 'Converts a string to uppercase',
    category: 'string',
  },
  {
    name: 'LOWER',
    signature: 'LOWER(str)',
    description: 'Converts a string to lowercase',
    category: 'string',
  },
  {
    name: 'TRIM',
    signature: 'TRIM([LEADING|TRAILING|BOTH] [char FROM] str)',
    description: 'Removes leading and/or trailing characters',
    category: 'string',
  },
  {
    name: 'LTRIM',
    signature: 'LTRIM(str)',
    description: 'Removes leading spaces from a string',
    category: 'string',
  },
  {
    name: 'RTRIM',
    signature: 'RTRIM(str)',
    description: 'Removes trailing spaces from a string',
    category: 'string',
  },
  {
    name: 'REPLACE',
    signature: 'REPLACE(str, from_str, to_str)',
    description: 'Replaces occurrences of a substring',
    category: 'string',
  },
  {
    name: 'REVERSE',
    signature: 'REVERSE(str)',
    description: 'Reverses a string',
    category: 'string',
  },
  {
    name: 'REPEAT',
    signature: 'REPEAT(str, count)',
    description: 'Repeats a string the specified number of times',
    category: 'string',
  },
  {
    name: 'SPACE',
    signature: 'SPACE(n)',
    description: 'Returns a string of n space characters',
    category: 'string',
  },
  {
    name: 'LPAD',
    signature: 'LPAD(str, length, padstr)',
    description: 'Left-pads a string to a specified length',
    category: 'string',
  },
  {
    name: 'RPAD',
    signature: 'RPAD(str, length, padstr)',
    description: 'Right-pads a string to a specified length',
    category: 'string',
  },
  {
    name: 'INSTR',
    signature: 'INSTR(str, substr)',
    description: 'Returns the position of the first occurrence of a substring',
    category: 'string',
  },
  {
    name: 'LOCATE',
    signature: 'LOCATE(substr, str [, pos])',
    description: 'Returns the position of a substring',
    category: 'string',
  },
  {
    name: 'POSITION',
    signature: 'POSITION(substr IN str)',
    description: 'Returns the position of a substring',
    category: 'string',
  },
  {
    name: 'FORMAT',
    signature: 'FORMAT(number, decimals)',
    description: 'Formats a number with commas and decimals',
    category: 'string',
  },
  {
    name: 'QUOTE',
    signature: 'QUOTE(str)',
    description: 'Escapes a string for use in SQL statements',
    category: 'string',
  },
  {
    name: 'ASCII',
    signature: 'ASCII(str)',
    description: 'Returns the ASCII value of the leftmost character',
    category: 'string',
  },
  {
    name: 'CHAR',
    signature: 'CHAR(n, ...)',
    description: 'Returns characters for ASCII values',
    category: 'string',
  },
  {
    name: 'ORD',
    signature: 'ORD(str)',
    description: 'Returns the code for the leftmost character',
    category: 'string',
  },

  // Numeric functions
  {
    name: 'ABS',
    signature: 'ABS(n)',
    description: 'Returns the absolute value',
    category: 'numeric',
  },
  {
    name: 'CEIL',
    signature: 'CEIL(n)',
    description: 'Rounds up to the nearest integer',
    category: 'numeric',
  },
  {
    name: 'CEILING',
    signature: 'CEILING(n)',
    description: 'Rounds up to the nearest integer',
    category: 'numeric',
  },
  {
    name: 'FLOOR',
    signature: 'FLOOR(n)',
    description: 'Rounds down to the nearest integer',
    category: 'numeric',
  },
  {
    name: 'ROUND',
    signature: 'ROUND(n [, decimals])',
    description: 'Rounds a number to specified decimals',
    category: 'numeric',
  },
  {
    name: 'TRUNCATE',
    signature: 'TRUNCATE(n, decimals)',
    description: 'Truncates a number to specified decimals',
    category: 'numeric',
  },
  {
    name: 'MOD',
    signature: 'MOD(n, m)',
    description: 'Returns the remainder of n divided by m',
    category: 'numeric',
  },
  {
    name: 'POWER',
    signature: 'POWER(base, exponent)',
    description: 'Returns base raised to the power of exponent',
    category: 'numeric',
  },
  {
    name: 'SQRT',
    signature: 'SQRT(n)',
    description: 'Returns the square root',
    category: 'numeric',
  },
  {
    name: 'EXP',
    signature: 'EXP(n)',
    description: 'Returns e raised to the power of n',
    category: 'numeric',
  },
  {
    name: 'LOG',
    signature: 'LOG([base,] n)',
    description: 'Returns the logarithm',
    category: 'numeric',
  },
  {
    name: 'LOG10',
    signature: 'LOG10(n)',
    description: 'Returns the base-10 logarithm',
    category: 'numeric',
  },
  {
    name: 'LOG2',
    signature: 'LOG2(n)',
    description: 'Returns the base-2 logarithm',
    category: 'numeric',
  },
  {
    name: 'LN',
    signature: 'LN(n)',
    description: 'Returns the natural logarithm',
    category: 'numeric',
  },
  {
    name: 'SIGN',
    signature: 'SIGN(n)',
    description: 'Returns the sign of a number (-1, 0, or 1)',
    category: 'numeric',
  },
  {
    name: 'PI',
    signature: 'PI()',
    description: 'Returns the value of pi',
    category: 'numeric',
  },
  {
    name: 'RAND',
    signature: 'RAND([seed])',
    description: 'Returns a random floating-point value (MySQL)',
    category: 'numeric',
  },
  {
    name: 'RANDOM',
    signature: 'RANDOM()',
    description: 'Returns a random floating-point value (PostgreSQL)',
    category: 'numeric',
  },
  {
    name: 'GREATEST',
    signature: 'GREATEST(val1, val2, ...)',
    description: 'Returns the largest value from the list',
    category: 'numeric',
  },
  {
    name: 'LEAST',
    signature: 'LEAST(val1, val2, ...)',
    description: 'Returns the smallest value from the list',
    category: 'numeric',
  },

  // Date/Time functions
  {
    name: 'NOW',
    signature: 'NOW()',
    description: 'Returns the current date and time',
    category: 'date',
  },
  {
    name: 'CURRENT_DATE',
    signature: 'CURRENT_DATE',
    description: 'Returns the current date',
    category: 'date',
  },
  {
    name: 'CURRENT_TIME',
    signature: 'CURRENT_TIME',
    description: 'Returns the current time',
    category: 'date',
  },
  {
    name: 'CURRENT_TIMESTAMP',
    signature: 'CURRENT_TIMESTAMP',
    description: 'Returns the current date and time',
    category: 'date',
  },
  {
    name: 'CURDATE',
    signature: 'CURDATE()',
    description: 'Returns the current date (MySQL)',
    category: 'date',
  },
  {
    name: 'CURTIME',
    signature: 'CURTIME()',
    description: 'Returns the current time (MySQL)',
    category: 'date',
  },
  {
    name: 'DATE',
    signature: 'DATE(expr)',
    description: 'Extracts the date part from a datetime',
    category: 'date',
  },
  {
    name: 'TIME',
    signature: 'TIME(expr)',
    description: 'Extracts the time part from a datetime',
    category: 'date',
  },
  {
    name: 'YEAR',
    signature: 'YEAR(date)',
    description: 'Returns the year from a date',
    category: 'date',
  },
  {
    name: 'MONTH',
    signature: 'MONTH(date)',
    description: 'Returns the month from a date (1-12)',
    category: 'date',
  },
  {
    name: 'DAY',
    signature: 'DAY(date)',
    description: 'Returns the day of the month from a date',
    category: 'date',
  },
  {
    name: 'HOUR',
    signature: 'HOUR(time)',
    description: 'Returns the hour from a time',
    category: 'date',
  },
  {
    name: 'MINUTE',
    signature: 'MINUTE(time)',
    description: 'Returns the minute from a time',
    category: 'date',
  },
  {
    name: 'SECOND',
    signature: 'SECOND(time)',
    description: 'Returns the second from a time',
    category: 'date',
  },
  {
    name: 'DAYOFWEEK',
    signature: 'DAYOFWEEK(date)',
    description: 'Returns the weekday index (1=Sunday)',
    category: 'date',
  },
  {
    name: 'DAYOFMONTH',
    signature: 'DAYOFMONTH(date)',
    description: 'Returns the day of the month',
    category: 'date',
  },
  {
    name: 'DAYOFYEAR',
    signature: 'DAYOFYEAR(date)',
    description: 'Returns the day of the year (1-366)',
    category: 'date',
  },
  {
    name: 'WEEK',
    signature: 'WEEK(date [, mode])',
    description: 'Returns the week number',
    category: 'date',
  },
  {
    name: 'QUARTER',
    signature: 'QUARTER(date)',
    description: 'Returns the quarter (1-4)',
    category: 'date',
  },
  {
    name: 'DATE_ADD',
    signature: 'DATE_ADD(date, INTERVAL expr unit)',
    description: 'Adds an interval to a date (MySQL)',
    category: 'date',
  },
  {
    name: 'DATE_SUB',
    signature: 'DATE_SUB(date, INTERVAL expr unit)',
    description: 'Subtracts an interval from a date (MySQL)',
    category: 'date',
  },
  {
    name: 'DATEDIFF',
    signature: 'DATEDIFF(date1, date2)',
    description: 'Returns the difference in days between two dates',
    category: 'date',
  },
  {
    name: 'TIMESTAMPDIFF',
    signature: 'TIMESTAMPDIFF(unit, datetime1, datetime2)',
    description: 'Returns the difference between two datetimes',
    category: 'date',
  },
  {
    name: 'DATE_FORMAT',
    signature: 'DATE_FORMAT(date, format)',
    description: 'Formats a date as specified (MySQL)',
    category: 'date',
  },
  {
    name: 'STR_TO_DATE',
    signature: 'STR_TO_DATE(str, format)',
    description: 'Parses a string into a date (MySQL)',
    category: 'date',
  },
  {
    name: 'UNIX_TIMESTAMP',
    signature: 'UNIX_TIMESTAMP([date])',
    description: 'Returns a Unix timestamp',
    category: 'date',
  },
  {
    name: 'FROM_UNIXTIME',
    signature: 'FROM_UNIXTIME(unix_timestamp [, format])',
    description: 'Converts a Unix timestamp to a date',
    category: 'date',
  },
  {
    name: 'EXTRACT',
    signature: 'EXTRACT(unit FROM date)',
    description: 'Extracts a part from a date',
    category: 'date',
  },
  {
    name: 'AGE',
    signature: 'AGE(timestamp [, timestamp])',
    description: 'Calculates the age between timestamps (PostgreSQL)',
    category: 'date',
  },
  {
    name: 'DATE_TRUNC',
    signature: "DATE_TRUNC('unit', timestamp)",
    description: 'Truncates a timestamp to specified precision (PostgreSQL)',
    category: 'date',
  },
  {
    name: 'TO_CHAR',
    signature: 'TO_CHAR(timestamp, format)',
    description: 'Converts a timestamp to a string (PostgreSQL)',
    category: 'date',
  },
  {
    name: 'TO_DATE',
    signature: 'TO_DATE(str, format)',
    description: 'Converts a string to a date (PostgreSQL)',
    category: 'date',
  },
  {
    name: 'TO_TIMESTAMP',
    signature: 'TO_TIMESTAMP(str, format)',
    description: 'Converts a string to a timestamp (PostgreSQL)',
    category: 'date',
  },

  // Conditional functions
  {
    name: 'IF',
    signature: 'IF(condition, true_val, false_val)',
    description: 'Returns value based on condition (MySQL)',
    category: 'conditional',
  },
  {
    name: 'IFNULL',
    signature: 'IFNULL(expr, alt_value)',
    description: 'Returns alt_value if expr is NULL (MySQL)',
    category: 'conditional',
  },
  {
    name: 'NULLIF',
    signature: 'NULLIF(expr1, expr2)',
    description: 'Returns NULL if expr1 equals expr2',
    category: 'conditional',
  },
  {
    name: 'COALESCE',
    signature: 'COALESCE(val1, val2, ...)',
    description: 'Returns the first non-null value',
    category: 'conditional',
  },
  {
    name: 'CASE',
    signature: 'CASE WHEN condition THEN result [ELSE result] END',
    description: 'Conditional expression',
    category: 'conditional',
  },
  {
    name: 'IIF',
    signature: 'IIF(condition, true_val, false_val)',
    description: 'Inline if expression',
    category: 'conditional',
  },
  {
    name: 'NVL',
    signature: 'NVL(expr, replacement)',
    description: 'Returns replacement if expr is NULL',
    category: 'conditional',
  },
  {
    name: 'NVL2',
    signature: 'NVL2(expr, not_null_val, null_val)',
    description: 'Returns value based on whether expr is NULL',
    category: 'conditional',
  },
  {
    name: 'DECODE',
    signature: 'DECODE(expr, search, result [, search, result]... [, default])',
    description: 'Compares expr to search values and returns result',
    category: 'conditional',
  },

  // JSON functions
  {
    name: 'JSON_EXTRACT',
    signature: 'JSON_EXTRACT(json, path[, path]...)',
    description: 'Extracts data from a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_UNQUOTE',
    signature: 'JSON_UNQUOTE(json_val)',
    description: 'Unquotes a JSON value (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_SET',
    signature: 'JSON_SET(json, path, val[, path, val]...)',
    description: 'Sets values in a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_INSERT',
    signature: 'JSON_INSERT(json, path, val[, path, val]...)',
    description: 'Inserts values into a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_REPLACE',
    signature: 'JSON_REPLACE(json, path, val[, path, val]...)',
    description: 'Replaces values in a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_REMOVE',
    signature: 'JSON_REMOVE(json, path[, path]...)',
    description: 'Removes data from a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_CONTAINS',
    signature: 'JSON_CONTAINS(json, val[, path])',
    description: 'Checks if JSON contains a value (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_ARRAY',
    signature: 'JSON_ARRAY(val[, val]...)',
    description: 'Creates a JSON array',
    category: 'json',
  },
  {
    name: 'JSON_OBJECT',
    signature: 'JSON_OBJECT(key, val[, key, val]...)',
    description: 'Creates a JSON object',
    category: 'json',
  },
  {
    name: 'JSON_KEYS',
    signature: 'JSON_KEYS(json[, path])',
    description: 'Returns keys from a JSON object (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_LENGTH',
    signature: 'JSON_LENGTH(json[, path])',
    description: 'Returns the length of a JSON document (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_VALID',
    signature: 'JSON_VALID(val)',
    description: 'Checks if a value is valid JSON (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_TYPE',
    signature: 'JSON_TYPE(json_val)',
    description: 'Returns the type of a JSON value (MySQL)',
    category: 'json',
  },
  {
    name: 'JSON_MERGE_PATCH',
    signature: 'JSON_MERGE_PATCH(json, json[, json]...)',
    description: 'Merges JSON documents (MySQL)',
    category: 'json',
  },
  {
    name: 'JSONB_EXTRACT_PATH',
    signature: 'JSONB_EXTRACT_PATH(json, path...)',
    description: 'Extracts data from a JSONB document (PostgreSQL)',
    category: 'json',
  },
  {
    name: 'JSONB_SET',
    signature: 'JSONB_SET(json, path, new_value[, create_missing])',
    description: 'Sets a value in a JSONB document (PostgreSQL)',
    category: 'json',
  },
  {
    name: 'JSONB_INSERT',
    signature: 'JSONB_INSERT(json, path, new_value[, insert_after])',
    description: 'Inserts a value into a JSONB document (PostgreSQL)',
    category: 'json',
  },

  // Window functions
  {
    name: 'ROW_NUMBER',
    signature: 'ROW_NUMBER() OVER ([PARTITION BY ...] ORDER BY ...)',
    description: 'Assigns a unique number to each row',
    category: 'window',
  },
  {
    name: 'RANK',
    signature: 'RANK() OVER ([PARTITION BY ...] ORDER BY ...)',
    description: 'Assigns a rank with gaps for ties',
    category: 'window',
  },
  {
    name: 'DENSE_RANK',
    signature: 'DENSE_RANK() OVER ([PARTITION BY ...] ORDER BY ...)',
    description: 'Assigns a rank without gaps for ties',
    category: 'window',
  },
  {
    name: 'NTILE',
    signature: 'NTILE(n) OVER ([PARTITION BY ...] ORDER BY ...)',
    description: 'Divides rows into n groups',
    category: 'window',
  },
  {
    name: 'LAG',
    signature: 'LAG(expr [, offset [, default]]) OVER (...)',
    description: 'Returns the value from a previous row',
    category: 'window',
  },
  {
    name: 'LEAD',
    signature: 'LEAD(expr [, offset [, default]]) OVER (...)',
    description: 'Returns the value from a following row',
    category: 'window',
  },
  {
    name: 'FIRST_VALUE',
    signature: 'FIRST_VALUE(expr) OVER (...)',
    description: 'Returns the first value in the window',
    category: 'window',
  },
  {
    name: 'LAST_VALUE',
    signature: 'LAST_VALUE(expr) OVER (...)',
    description: 'Returns the last value in the window',
    category: 'window',
  },
  {
    name: 'NTH_VALUE',
    signature: 'NTH_VALUE(expr, n) OVER (...)',
    description: 'Returns the nth value in the window',
    category: 'window',
  },
  {
    name: 'CUME_DIST',
    signature: 'CUME_DIST() OVER (...)',
    description: 'Returns the cumulative distribution',
    category: 'window',
  },
  {
    name: 'PERCENT_RANK',
    signature: 'PERCENT_RANK() OVER (...)',
    description: 'Returns the relative rank as a percentage',
    category: 'window',
  },
]

// SQL snippets for common patterns
export const SQL_SNIPPETS: SqlSnippet[] = [
  {
    label: 'sel',
    template: 'SELECT * FROM ',
    description: 'Select all columns from a table',
  },
  {
    label: 'selc',
    template: 'SELECT  FROM  WHERE ',
    description: 'Select specific columns with a condition',
  },
  {
    label: 'selj',
    template: 'SELECT * FROM  INNER JOIN  ON ',
    description: 'Select with an inner join',
  },
  {
    label: 'sellj',
    template: 'SELECT * FROM  LEFT JOIN  ON ',
    description: 'Select with a left join',
  },
  {
    label: 'ins',
    template: 'INSERT INTO  () VALUES ()',
    description: 'Insert a row into a table',
  },
  {
    label: 'upd',
    template: 'UPDATE  SET  WHERE ',
    description: 'Update rows in a table',
  },
  {
    label: 'del',
    template: 'DELETE FROM  WHERE ',
    description: 'Delete rows from a table',
  },
  {
    label: 'cret',
    template: 'CREATE TABLE  (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  \n)',
    description: 'Create a new table',
  },
  {
    label: 'altt',
    template: 'ALTER TABLE  ADD COLUMN ',
    description: 'Add a column to a table',
  },
  {
    label: 'crei',
    template: 'CREATE INDEX  ON  ()',
    description: 'Create an index',
  },
  {
    label: 'grp',
    template: 'SELECT , COUNT(*) FROM  GROUP BY  HAVING COUNT(*) > ',
    description: 'Group by with count and having clause',
  },
  {
    label: 'ord',
    template: 'ORDER BY  DESC',
    description: 'Order by descending',
  },
  {
    label: 'lim',
    template: 'LIMIT  OFFSET ',
    description: 'Limit with offset for pagination',
  },
  {
    label: 'case',
    template: 'CASE WHEN  THEN  ELSE  END',
    description: 'Case expression',
  },
  {
    label: 'cte',
    template: 'WITH  AS (\n  SELECT * FROM \n)\nSELECT * FROM ',
    description: 'Common Table Expression (CTE)',
  },
  {
    label: 'exist',
    template: 'WHERE EXISTS (SELECT 1 FROM  WHERE )',
    description: 'Exists subquery',
  },
  {
    label: 'notexist',
    template: 'WHERE NOT EXISTS (SELECT 1 FROM  WHERE )',
    description: 'Not exists subquery',
  },
  {
    label: 'union',
    template: 'SELECT * FROM \nUNION ALL\nSELECT * FROM ',
    description: 'Union two queries',
  },
]

// Backward compatible exports (arrays of just names)
export const SQL_KEYWORDS = SQL_KEYWORDS_WITH_INFO.map((k) => k.name)
export const SQL_FUNCTIONS = SQL_FUNCTIONS_WITH_INFO.map((f) => f.name)
