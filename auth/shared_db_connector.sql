-- 共享数据库连接用户初始化脚本
-- 用于 SHARED 模式：所有应用共享一个数据库

-- 创建共享数据库连接用户
CREATE ROLE ${db_conn_user} LOGIN PASSWORD '${db_conn_user_password}';

-- 设置角色属性
ALTER ROLE ${db_conn_user} NOINHERIT;

-- 撤销公共连接权限
REVOKE CONNECT ON DATABASE ${db} FROM PUBLIC;

-- 授予连接权限给共享用户
GRANT CONNECT ON DATABASE ${db} TO ${db_conn_user};

-- 授予创建 Schema 的权限（共享模式需要动态创建 Schema）
GRANT CREATE ON DATABASE ${db} TO ${db_conn_user};

-- ==================== PostgREST 匿名角色 ====================
-- 创建 anon 角色供 PostgREST 使用（匿名请求使用此角色）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END
$$;

-- 授予共享连接用户切换到 anon 的权限
GRANT anon TO ${db_conn_user};
