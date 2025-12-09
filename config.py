import os

class Config:
    """Configuração da aplicação CorujinhaLegal"""
    
    # Diretório base da aplicação
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Configuração do banco de dados SQLite
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'corujinha.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Diretório para armazenar arquivos de áudio e vídeo
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # Limite de 100MB por arquivo
    
    # Formatos permitidos
    ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'aac', 'm4a'}
    ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
    
    # Secret key para sessões (gerar uma chave segura em produção)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
