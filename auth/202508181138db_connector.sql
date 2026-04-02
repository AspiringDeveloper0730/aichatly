-- database connection user
CREATE ROLE ${db_conn_user} LOGIN PASSWORD '${db_conn_user_password}';

ALTER ROLE ${db_conn_user} NOINHERIT;

REVOKE CONNECT ON DATABASE ${db} FROM PUBLIC;

GRANT CONNECT ON DATABASE ${db} TO ${db_conn_user};