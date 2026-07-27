-- DropIndex
DROP INDEX "municipal_municipio_key";

-- CreateIndex
CREATE UNIQUE INDEX "municipal_uf_municipio_key" ON "municipal"("uf", "municipio");
