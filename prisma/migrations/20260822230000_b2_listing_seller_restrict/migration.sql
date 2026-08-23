-- B2: no borrar un User con listings. La baja de cuenta es soft-delete (deletedAt).
ALTER TABLE "listings" DROP CONSTRAINT "listings_seller_id_fkey";
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
