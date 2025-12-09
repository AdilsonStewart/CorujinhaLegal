# CorujinhaLegal 🦉

A CorujinhaLegal guarda e entrega sua mensagem no momento certo!

## 📋 Sobre o Projeto

CorujinhaLegal é um sistema de gravação e agendamento de mensagens em áudio ou vídeo. Os usuários podem gravar suas mensagens, armazená-las de forma segura e programar a entrega para datas específicas no futuro.

### Funcionalidades

- ✅ Upload de arquivos de áudio (MP3, WAV, OGG, AAC, M4A)
- ✅ Upload de arquivos de vídeo (MP4, AVI, MOV, MKV, WEBM)
- ✅ Armazenamento seguro de mensagens
- ✅ Agendamento de entrega para data/hora específica
- ✅ Sistema automático de processamento de entregas
- ✅ API RESTful completa
- ✅ Listagem e gerenciamento de mensagens
- ✅ Download de arquivos armazenados

## 🚀 Instalação

### Pré-requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

### Configuração

1. Clone o repositório:
```bash
git clone https://github.com/AdilsonStewart/CorujinhaLegal.git
cd CorujinhaLegal
```

2. Crie um ambiente virtual (recomendado):
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Execute a aplicação:
```bash
python app.py
```

O servidor estará disponível em `http://localhost:5000`

## 📡 API Endpoints

### GET /
Retorna informações sobre a API e endpoints disponíveis.

**Resposta:**
```json
{
  "message": "CorujinhaLegal - Sistema de Mensagens Agendadas",
  "version": "1.0.0",
  "endpoints": {...}
}
```

### POST /api/messages
Cria uma nova mensagem com arquivo de áudio ou vídeo.

**Tipo de conteúdo:** `multipart/form-data`

**Parâmetros:**
- `file` (arquivo): Arquivo de áudio ou vídeo
- `client_name` (string): Nome do cliente
- `client_email` (string): Email do cliente
- `title` (string): Título da mensagem
- `description` (string, opcional): Descrição da mensagem
- `media_type` (string): Tipo de mídia ("audio" ou "video")
- `delivery_date` (string): Data de entrega no formato ISO 8601 (ex: "2024-12-25T10:00:00")

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:5000/api/messages \
  -F "file=@minha_mensagem.mp3" \
  -F "client_name=João Silva" \
  -F "client_email=joao@example.com" \
  -F "title=Mensagem de Aniversário" \
  -F "description=Mensagem especial para o aniversário" \
  -F "media_type=audio" \
  -F "delivery_date=2024-12-25T10:00:00"
```

**Resposta (201 Created):**
```json
{
  "message": "Mensagem criada com sucesso",
  "data": {
    "id": 1,
    "client_name": "João Silva",
    "client_email": "joao@example.com",
    "title": "Mensagem de Aniversário",
    "description": "Mensagem especial para o aniversário",
    "media_type": "audio",
    "file_name": "20241209_100000_minha_mensagem.mp3",
    "file_size": 1024000,
    "created_at": "2024-12-09T10:00:00",
    "delivery_date": "2024-12-25T10:00:00",
    "delivered": false,
    "delivered_at": null
  }
}
```

### GET /api/messages
Lista todas as mensagens cadastradas.

**Parâmetros de query (opcionais):**
- `delivered` (boolean): Filtrar por status de entrega ("true" ou "false")

**Exemplo:**
```bash
curl http://localhost:5000/api/messages
curl http://localhost:5000/api/messages?delivered=false
```

**Resposta:**
```json
{
  "total": 2,
  "messages": [
    {
      "id": 1,
      "client_name": "João Silva",
      "title": "Mensagem de Aniversário",
      ...
    },
    {
      "id": 2,
      "client_name": "Maria Santos",
      "title": "Mensagem de Natal",
      ...
    }
  ]
}
```

### GET /api/messages/{id}
Obtém detalhes de uma mensagem específica.

**Exemplo:**
```bash
curl http://localhost:5000/api/messages/1
```

### GET /api/messages/{id}/download
Faz o download do arquivo de áudio/vídeo de uma mensagem.

**Exemplo:**
```bash
curl -O http://localhost:5000/api/messages/1/download
```

### DELETE /api/messages/{id}
Deleta uma mensagem (arquivo e registro do banco de dados).

**Exemplo:**
```bash
curl -X DELETE http://localhost:5000/api/messages/1
```

## 🗂️ Estrutura do Projeto

```
CorujinhaLegal/
├── app.py              # Aplicação Flask principal
├── models.py           # Modelos de dados (SQLAlchemy)
├── scheduler.py        # Sistema de agendamento de entregas
├── config.py           # Configurações da aplicação
├── requirements.txt    # Dependências Python
├── README.md           # Documentação
├── .gitignore         # Arquivos ignorados pelo Git
├── corujinha.db       # Banco de dados SQLite (criado automaticamente)
└── uploads/           # Diretório de arquivos (criado automaticamente)
```

## 🔧 Configuração

As configurações podem ser ajustadas no arquivo `config.py`:

- `UPLOAD_FOLDER`: Diretório para armazenar os arquivos
- `MAX_CONTENT_LENGTH`: Tamanho máximo de arquivo (padrão: 100MB)
- `ALLOWED_AUDIO_EXTENSIONS`: Extensões de áudio permitidas
- `ALLOWED_VIDEO_EXTENSIONS`: Extensões de vídeo permitidas
- `SECRET_KEY`: Chave secreta (definir variável de ambiente em produção)

## ⚙️ Como Funciona

1. **Upload**: Cliente faz upload de um arquivo de áudio/vídeo junto com informações da mensagem e data de entrega
2. **Armazenamento**: Arquivo é salvo de forma segura no servidor e registro é criado no banco de dados
3. **Agendamento**: Sistema verifica a cada minuto se há mensagens para entregar
4. **Entrega**: Quando a data de entrega chega, a mensagem é marcada como entregue (pode ser integrado com email, SMS, etc.)

## 🔒 Segurança

- Validação de tipos de arquivo
- Nomes de arquivo sanitizados
- Limite de tamanho de upload
- Banco de dados SQLite local
- `.gitignore` configurado para não versionar arquivos sensíveis

## 📝 Formatos Suportados

**Áudio:**
- MP3
- WAV
- OGG
- AAC
- M4A

**Vídeo:**
- MP4
- AVI
- MOV
- MKV
- WEBM

## 🛠️ Tecnologias Utilizadas

- **Flask**: Framework web Python
- **SQLAlchemy**: ORM para banco de dados
- **APScheduler**: Agendamento de tarefas
- **SQLite**: Banco de dados
- **Flask-CORS**: Suporte a CORS
- **Werkzeug**: Utilidades web

## 📄 Licença

Este projeto é de código aberto e está disponível para uso educacional e comercial.

## 👥 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📧 Contato

Para mais informações, entre em contato através do repositório no GitHub.
