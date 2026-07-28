# CND API

A **CND API** é um serviço backend desenvolvido para o cadastro de fornecedores e controle de Certidões Negativas de Débitos (CNDs). A API permite cadastrar fornecedores, consultar seu status de regularidade e receber certidões fiscais em formato PDF.

---

## Tecnologias Utilizadas

- **Linguagem:** TypeScript
- **Framework Web:** Express
- **ORM:** Prisma
- **Banco de dados:** PostgreSQL
- **IA:** [DeepSeek API](https://platform.deepseek.com/)

---

## Variáveis de Ambiente (.env)

Copie o arquivo `.env.example` para `.env` e preencha as variáveis de ambiente necessárias:

```bash
cp .env.example .env
```

| Variável            | Descrição                                               | Exemplo                                                        |
| :------------------ | :------------------------------------------------------ | :------------------------------------------------------------- |
| `PORT`              | Porta de escuta da API.                                 | `3030`                                                         |
| `HOST`              | Interface de rede na qual o Express iniciará.           | `0.0.0.0`                                                      |
| `LOG_LEVEL`         | Nível mínimo de logging.                                | `debug`                                                        |
| `DEEPSEEK_API_KEY`  | Chave de API do DeepSeek.                               | `sk-cnd...`                                                    |
| `DATABASE_URL`      | URL para conexão com o banco de dados PostgreSQL.       | `postgresql://user:password@localhost:5432/mydb?schema=public` |
| `POSTGRES_USER`     | Usuário do PostgreSQL (para Docker Compose).            | `user`                                                         |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL (para Docker Compose).              | `password`                                                     |
| `POSTGRES_DB`       | Nome do banco (para Docker Compose).                    | `mydb`                                                         |
| `DB_PORT`           | Porta exposta pelo banco no host (para Docker Compose). | `5432`                                                         |

---

## Instalação e Execução

### Opção 1: Execução Local

1. **Instale as dependências**:

   ```bash
   npm install
   ```

2. **Prepare o Banco de Dados**:
   ```bash
   npx prisma migrate dev
   ```

3. **Inicie o Servidor em Modo de Desenvolvimento**:

   ```bash
   npm run dev
   ```

4. **Compilar e Rodar em Produção**:
   ```bash
   npm run build
   npm start
   ```

### Opção 2: Execução com Docker (Recomendado)

1. **Construa e inicie os containers**:
   ```bash
   docker compose up --build -d
   ```

---

## Como Usar a API

### Endpoints Disponíveis

#### Cadastrar Fornecedor

- **Rota:** `/fornecedor`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "cnpj": "12.345.678/0001-90",
    "name": "Empresa Exemplo LTDA",
    "uf": "SC",
    "municipio": "Blumenau"
  }
  ```
- **Retorno (201 Created):**
  ```json
  {
    "cnpj": "12345678000190",
    "name": "Empresa Exemplo LTDA",
    "uf": "SC",
    "municipio": "BLUMENAU"
  }
  ```

---

#### Listar Fornecedores

- **Rota:** `/fornecedor`
- **Método:** `GET`
- **Query Params (Filtros Opcionais):** `cnpj`, `uf`, `municipio`
- **Retorno (200 OK):** Retorna uma lista de fornecedores correspondentes aos filtros aplicados.

---

#### Obter Fornecedor com Situação das CNDs

- **Rota:** `/fornecedor/:cnpj`
- **Método:** `GET`
- **Retorno (200 OK):**
  ```json
  {
    "name": "Empresa Exemplo LTDA",
    "cnpj": "12345678000190",
    "cnd": [
      {
        "tipo": "fgts",
        "file_name": "a1b2c3d4e5f6g7h8.pdf",
        "validade": "2026-08-30T03:00:00.000Z",
        "emissao": "2026-07-01T03:00:00.000Z",
        "status": "regular"
      },
      {
        "tipo": "municipal",
        "file_name": "a1b2c3d4e5f6g7h8.pdf",
        "validade": "2026-08-30T03:00:00.000Z",
        "emissao": "2026-08-15T03:00:00.000Z",
        "status": "irregular"
      },
      {
        "tipo": "estadual",
        "file_name": null,
        "validade": null,
        "emissao": null,
        "status": "em desenvolvimento"
      },
      {
        "tipo": "trabalhista",
        "file_name": "a1b2c3d4e5f6g7h8.pdf",
        "validade": "2026-08-30T03:00:00.000Z",
        "emissao": "2026-07-01T03:00:00.000Z",
        "status": "regular"
      }
    ]
  }
  ```

---

#### Processamento e Upload de CND (PDF)

- **Rota:** `/cnd`
- **Método:** `POST`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** Enviar um ou mais arquivos no campo `file`.
- **Retorno (201 Created):**
  ```json
  [
    {
      "file": "certidao_fgts.pdf",
      "success": true,
      "data": {
        "fornecedor": {
          "name": "Empresa Exemplo LTDA",
          "cnpj": "12345678000190"
        },
        "cnd": {
          "filename": "f3b8a1c90e2f5b6d.pdf",
          "validade": "2026-08-30T03:00:00.000Z",
          "emissao": "2026-07-01T03:00:00.000Z",
          "status": "regular",
          "tipo": "fgts"
        }
      }
    }
  ]
  ```

---

## Tratamento de Erros e Validação

Em caso de falhas, a API retorna respostas em formato padronizado contendo o tipo do erro, mensagem legível e detalhes adicionais:

```json
{
  "type": "VALIDATION_ERROR",
  "message": "Erro de validação dos dados de entrada",
  "details": {
    "cnpj": "CNPJ inválido"
  }
}
```

### Mapeamento de Erros da API

| Tipo de Erro (`type`)     | Status HTTP | Descrição                                                                                     |
| :------------------------ | :---------: | :-------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`        |     400     | Os parâmetros ou dados de entrada não correspondem ao esquema validado via Zod.               |
| `NOT_FOUND`               |     404     | O fornecedor ou o tipo de CND informado não existe no sistema.                                |
| `CONFLICT`                |     409     | Tentativa de cadastrar um CNPJ que já está cadastrado no sistema.                             |
| `EXPIRED_CND`             |     400     | A CND enviada já está expirada, sendo rejeitada pelo sistema.                                 |
| `EMPTY_OR_UNREADABLE`     |     400     | O arquivo PDF enviado está vazio ou não possui texto legível por OCR/Parser.                  |
| `ANALYSIS_ERROR`          |     400     | A IA não conseguiu identificar ou validar a situação fiscal do contribuinte principal no PDF. |
| `CREDENTIALS_ERROR`       |     500     | Erro relacionado à chave de API do DeepSeek ou limites de crédito na plataforma.              |
| `CONFIGURATION_ERROR`     |     500     | Erro de configuração nos parâmetros da integração com o DeepSeek.                             |
| `API_COMMUNICATION_ERROR` |     502     | Falha física na comunicação de rede com os servidores do DeepSeek.                            |
| `INVALID_RESPONSE`        |     502     | Resposta recebida da API do DeepSeek é inválida ou malformada.                                |
| `INTERNAL_ERROR`          |     500     | Erro genérico de execução interno do servidor.                                                |
