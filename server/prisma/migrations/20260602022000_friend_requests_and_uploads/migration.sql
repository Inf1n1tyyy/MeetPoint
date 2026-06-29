-- PostgreSQL does not allow using a newly added enum value in the same
-- transaction in which it was added with ALTER TYPE ... ADD VALUE.
-- Prisma validates migrations against a shadow database, so we recreate the
-- enum type with the complete value set and then switch the column to it.

ALTER TABLE "Friendship" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "FriendshipStatus_new" AS ENUM ('PENDING', 'ACCEPTED');

ALTER TABLE "Friendship"
  ALTER COLUMN "status" TYPE "FriendshipStatus_new"
  USING ("status"::text::"FriendshipStatus_new");

ALTER TYPE "FriendshipStatus" RENAME TO "FriendshipStatus_old";
ALTER TYPE "FriendshipStatus_new" RENAME TO "FriendshipStatus";
DROP TYPE "FriendshipStatus_old";

ALTER TABLE "Friendship" ALTER COLUMN "status" SET DEFAULT 'PENDING';
