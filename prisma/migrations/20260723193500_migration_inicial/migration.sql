-- CreateTable
CREATE TABLE "fornecedor" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnd" (
    "id" TEXT NOT NULL,
    "fornecedorid" TEXT NOT NULL,
    "file_name" TEXT,
    "validade" TIMESTAMP(6),
    "emissao" TIMESTAMP(6),
    "status" TEXT NOT NULL,
    "cndtypeid" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cndtype" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cndtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estadual" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estadual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipal" (
    "id" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_cnpj_key" ON "fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "cndtype_name_key" ON "cndtype"("name");

-- CreateIndex
CREATE UNIQUE INDEX "estadual_uf_key" ON "estadual"("uf");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_municipio_key" ON "municipal"("municipio");

-- AddForeignKey
ALTER TABLE "cnd" ADD CONSTRAINT "cnd_fornecedorid_fkey" FOREIGN KEY ("fornecedorid") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnd" ADD CONSTRAINT "cnd_cndtypeid_fkey" FOREIGN KEY ("cndtypeid") REFERENCES "cndtype"("id") ON DELETE SET NULL ON UPDATE CASCADE;
