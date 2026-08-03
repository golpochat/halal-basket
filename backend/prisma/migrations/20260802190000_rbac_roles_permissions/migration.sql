-- Dynamic RBAC: permissions, roles, role_permissions, users.staff_role_id

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group_name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE INDEX "permissions_group_name_idx" ON "permissions"("group_name");

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD COLUMN "staff_role_id" TEXT;

CREATE INDEX "users_staff_role_id_idx" ON "users"("staff_role_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_staff_role_id_fkey"
  FOREIGN KEY ("staff_role_id") REFERENCES "roles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
